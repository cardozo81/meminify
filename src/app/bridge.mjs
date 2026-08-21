import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { deriveEffectiveConfiguration, loadConfiguration } from '../configuration/index.js';
import { createDefaultMinifierRegistry } from '../minifiers/index.js';
import { createExecutionPlan, executePlan } from '../execution/index.js';

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

async function createPlan(request, persistent) {
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
  });
  return { plan, minifier: registry.get(effective.engineId), effective };
}

export async function runBridgeRequest(request, { projectRoot = process.cwd() } = {}) {
  const persistent = await loadPersistent(projectRoot);
  if (request.command === 'summary') {
    return { ok: true, configuration: persistent.ok ? persistent.configuration : null, ...persistent, projectRoot: resolve(projectRoot) };
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
      const { plan } = await createPlan(request, persistent);
      return { ok: true, analysis: summarizePlan(plan) };
    }
    if (request.command === 'execute') {
      const { plan, minifier } = await createPlan(request, persistent);
      const result = await executePlan(plan, minifier, {
        confirmed: request.confirmed === true,
        authorizeOverwriteConflicts: request.authorizeOverwriteConflicts === true,
        meminifyVersion: request.meminifyVersion ?? null,
      });
      return { ok: true, plan: summarizePlan(plan), result };
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
