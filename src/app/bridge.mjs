import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { deriveEffectiveConfiguration, loadConfiguration } from '../configuration/index.js';
import { createDefaultMinifierRegistry } from '../minifiers/index.js';
import { createExecutionPlan, executePlan } from '../execution/index.js';
import { listArtifacts, readArtifact, writeOperationalReports, writeTechnicalLog } from '../observability/index.mjs';
import { createBackupRestorePlan, createLastMinRestorePlan, executeRestorePlan, listKnownBackups } from '../restore/index.js';
import { resolveRuntimePaths } from '../runtime/paths.js';
import { loadApplicationMetadata } from '../runtime/version.js';

const configurationDirectory = 'Configuracao';
const configurationName = 'configuracao.ini';

function paths(projectRoot) {
  const root = resolve(projectRoot);
  return {
    root,
    configuration: join(root, configurationDirectory, configurationName),
    example: join(root, configurationDirectory, 'configuracao.ini.example'),
    backupRoot: join(root, '_source_versions'),
  };
}

async function exists(filePath) {
  try { await access(filePath, constants.F_OK); return true; } catch { return false; }
}

function diagnostic(error) {
  return {
    code: error?.code ?? 'BRIDGE_ERROR',
    message: error?.message ?? 'A operação não pôde ser concluída.',
    details: error?.details ?? {},
  };
}

async function loadPersistent(projectRoot) {
  const filePaths = paths(projectRoot);
  if (!await exists(filePaths.configuration)) {
    return { ok: false, code: 'CONFIGURATION_MISSING', configurationPath: filePaths.configuration, examplePath: filePaths.example };
  }
  try {
    const registry = createDefaultMinifierRegistry();
    return {
      ok: true,
      configuration: await loadConfiguration(filePaths.configuration, { allowedEngines: new Set(registry.list().map((item) => item.id)) }),
      configurationPath: filePaths.configuration,
      examplePath: filePaths.example,
    };
  } catch (error) {
    return { ok: false, configurationPath: filePaths.configuration, diagnostic: diagnostic(error) };
  }
}

function summarizePlan(plan) {
  return {
    formatVersion: plan.formatVersion,
    executionId: plan.executionId,
    status: plan.status,
    outputMode: plan.outputMode,
    profile: plan.profile,
    profileRisk: plan.profileRisk,
    riskAssessment: plan.riskAssessment,
    engine: plan.engine,
    sources: plan.sources,
    counts: { found: plan.items.length + plan.ignored.length, eligible: plan.items.length, ignored: plan.ignored.length },
    items: plan.items,
    ignored: plan.ignored,
    conflicts: plan.conflicts,
    diagnostics: plan.diagnostics,
    requiredConfirmations: plan.requiredConfirmations,
    backupRoot: plan.backupRoot,
    runtimePaths: plan.runtimePaths,
  };
}

function adjustmentsFrom(request) {
  return request.adjustments && typeof request.adjustments === 'object' ? request.adjustments : {};
}

async function persistArtifacts({ projectRoot, plan, result = null, resultStatus = null, error = null, startedAt, phases = [], applicationVersion }) {
  const artifacts = {};
  const failures = [];
  try {
    artifacts.reports = await writeOperationalReports({ projectRoot, plan, result, resultStatus, durationMs: Math.round(performance.now() - startedAt), applicationVersion });
  } catch (cause) { failures.push({ code: 'REPORT_WRITE_FAILED', message: cause.message }); }
  try {
    artifacts.log = await writeTechnicalLog({ projectRoot, executionId: plan.executionId, phases, result, error, technicalPaths: plan.runtimePaths, runtime: { node: process.version }, applicationVersion });
  } catch (cause) { failures.push({ code: 'LOG_WRITE_FAILED', message: cause.message }); }
  if (failures.length) artifacts.diagnostics = failures;
  return artifacts;
}

async function createPlan(request, persistent, applicationVersion) {
  const registry = createDefaultMinifierRegistry();
  const effective = deriveEffectiveConfiguration(persistent.configuration, adjustmentsFrom(request), { allowedEngines: new Set(registry.list().map((item) => item.id)) });
  const riskAssessment = request.riskAssessment ?? { authorized: false, status: 'unavailable', reason: 'EXECUTION_RISK_ALGORITHM_PENDING' };
  const plan = await createExecutionPlan({
    configuration: effective,
    minifier: registry.get(effective.engineId),
    runtimeRoot: persistent.projectRoot,
    backupRoot: effective.outputMode === 'BackupESobrescreverOriginais' ? paths(persistent.projectRoot).backupRoot : undefined,
    executionId: request.executionId ?? `exec-${Date.now()}`,
    riskAssessment,
    meminifyVersion: applicationVersion,
  });
  return { plan, minifier: registry.get(effective.engineId), effective };
}

export async function runBridgeRequest(request, { projectRoot = process.cwd() } = {}) {
  const application = await loadApplicationMetadata(projectRoot);
  if (request.command === 'version') return { ok: true, ...application };
  const persistent = await loadPersistent(projectRoot);
  if (request.command === 'list-backups') {
    try { return { ok: true, backups: await listKnownBackups(projectRoot) }; }
    catch (error) { return { ok: false, diagnostic: diagnostic(error) }; }
  }
  if (request.command === 'plan-restore') {
    if (!['backup', 'last-min'].includes(request.kind)) return { ok: false, diagnostic: { code: 'INVALID_RESTORE_KIND', message: 'O tipo de restauração é inválido.' } };
    try {
      const plan = request.kind === 'backup'
        ? await createBackupRestorePlan({ projectRoot, backupDirectory: request.backupDirectory })
        : await createLastMinRestorePlan({ projectRoot });
      return { ok: true, plan };
    } catch (error) { return { ok: false, diagnostic: diagnostic(error) }; }
  }
  if (request.command === 'execute-restore') {
    if (!['backup', 'last-min'].includes(request.kind)) return { ok: false, diagnostic: { code: 'INVALID_RESTORE_KIND', message: 'O tipo de restauração é inválido.' } };
    const startedAt = performance.now();
    let plan = null;
    try {
      plan = request.kind === 'backup'
        ? await createBackupRestorePlan({ projectRoot, backupDirectory: request.backupDirectory })
        : await createLastMinRestorePlan({ projectRoot });
      const result = await executeRestorePlan(plan, { confirmed: request.confirmed === true, confirmChanged: request.confirmChanged === true });
      const artifacts = await persistArtifacts({ projectRoot, plan, result, resultStatus: result.status, startedAt, phases: [{ name: 'restauração manual', status: result.status }], applicationVersion: application.version });
      return { ok: true, plan, result, artifacts };
    } catch (error) {
      const reportPlan = plan ?? { executionId: 'restore-validation', outputMode: request.kind, profile: null, engine: { id: null, version: null }, backupRoot: request.backupDirectory ?? null, runtimePaths: resolveRuntimePaths(projectRoot), items: [], ignored: [], diagnostics: { errors: [{ code: error.code, message: error.message }], blockers: [{ code: error.code, message: error.message }] } };
      const artifacts = await persistArtifacts({ projectRoot, plan: reportPlan, resultStatus: error.code === 'RESTORE_RECOVERY_REQUIRED' ? 'recovery-required' : 'validation-failure', error, startedAt, phases: [{ name: 'restauração manual', status: 'falha', code: error.code }], applicationVersion: application.version });
      return { ok: false, diagnostic: diagnostic(error), artifacts };
    }
  }
  if (request.command === 'list-artifacts') {
    try { return { ok: true, kind: request.kind, names: await listArtifacts(projectRoot, request.kind) }; }
    catch (error) { return { ok: false, diagnostic: diagnostic(error) }; }
  }
  if (request.command === 'read-artifact') {
    try { return { ok: true, kind: request.kind, name: request.name, content: await readArtifact(projectRoot, request.kind, request.name) }; }
    catch (error) { return { ok: false, diagnostic: diagnostic(error) }; }
  }
  if (request.command === 'summary') {
    return { ok: true, application, configuration: persistent.ok ? persistent.configuration : null, ...persistent, projectRoot: resolve(projectRoot) };
  }
  if (request.command === 'create-configuration') {
    const filePaths = paths(projectRoot);
    if (request.confirmed !== true) return { ok: false, code: 'CONFIRMATION_REQUIRED', message: 'A criação exige confirmação explícita.' };
    if (await exists(filePaths.configuration)) return { ok: false, code: 'CONFIGURATION_EXISTS', configurationPath: filePaths.configuration };
    try {
      await mkdir(join(filePaths.root, configurationDirectory), { recursive: true });
      await copyFile(filePaths.example, filePaths.configuration);
      return { ok: true, configurationPath: filePaths.configuration, created: true };
    } catch (error) {
      return { ok: false, diagnostic: diagnostic(error) };
    }
  }
  if (!persistent.ok) return { ok: false, ...persistent };
  persistent.projectRoot = resolve(projectRoot);
  try {
    if (request.command === 'analyze') {
      const startedAt = performance.now();
      const { plan } = await createPlan(request, persistent, application.version);
      const analysis = summarizePlan(plan);
      const artifacts = await persistArtifacts({ projectRoot, plan, resultStatus: 'analisado', startedAt, phases: [{ name: 'pré-análise', status: plan.status }], applicationVersion: application.version });
      return { ok: true, analysis, artifacts };
    }
    if (request.command === 'execute') {
      const startedAt = performance.now();
      let plan = null;
      try {
        const created = await createPlan(request, persistent, application.version);
        plan = created.plan;
        const result = await executePlan(plan, created.minifier, {
          confirmed: request.confirmed === true,
          authorizeOverwriteConflicts: request.authorizeOverwriteConflicts === true,
          meminifyVersion: application.version,
        });
        const artifacts = await persistArtifacts({ projectRoot, plan, result, resultStatus: result.status, startedAt, phases: [{ name: 'execução', status: result.status }], applicationVersion: application.version });
        return { ok: true, plan: summarizePlan(plan), result, artifacts };
      } catch (error) {
        const executionStatus = error.code === 'RECOVERY_REQUIRED'
          ? 'recovery-required'
          : (error.details?.rollbackStatus === 'rolled-back' ? 'falha (rollback comprovado)' : 'falha');
        const artifacts = plan ? await persistArtifacts({ projectRoot, plan, resultStatus: executionStatus, error, startedAt, phases: [{ name: 'execução', status: executionStatus, code: error.code }], applicationVersion: application.version }) : {};
        return { ok: false, diagnostic: diagnostic(error), artifacts };
      }
    }
    return { ok: false, code: 'UNKNOWN_COMMAND', message: `Comando não suportado: ${request.command ?? '(vazio)'}.` };
  } catch (error) {
    return { ok: false, diagnostic: diagnostic(error) };
  }
}

if (process.argv[2] === '--bridge') {
  let request = {};
  try { request = JSON.parse(await readFile(0, 'utf8')); } catch (error) {
    console.log(JSON.stringify({ ok: false, diagnostic: { code: 'INVALID_REQUEST', message: 'A requisição JSON é inválida.' } }));
    process.exitCode = 2;
  }
  if (process.exitCode !== 2) {
    const result = await runBridgeRequest(request, { projectRoot: process.cwd() });
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  }
}
