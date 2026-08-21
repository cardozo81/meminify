import { access, constants, readFile } from 'node:fs/promises';
import { join } from 'node:path';

function diagnostic(code, message, details = {}) {
  return { code, message, ...details };
}

function parseRuntimeVersion(version) {
  const match = String(version).trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function satisfiesEngineRange(version, range) {
  const actual = parseRuntimeVersion(version);
  if (!actual || typeof range !== 'string') return false;
  return range.split('||').some((alternative) => {
    const expression = alternative.trim();
    const lowerBounds = [...expression.matchAll(/>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/g)].map((match) => [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)]);
    const upperBounds = [...expression.matchAll(/<\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/g)].map((match) => [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)]);
    if (lowerBounds.some((bound) => compareVersions(actual, bound) < 0) || upperBounds.some((bound) => compareVersions(actual, bound) >= 0)) return false;
    const caret = expression.match(/^\^\s*(\d+)\.(\d+)\.(\d+)$/);
    if (caret) {
      const lower = [Number(caret[1]), Number(caret[2]), Number(caret[3])];
      const upper = lower[0] > 0 ? [lower[0] + 1, 0, 0] : [lower[0], lower[1] + 1, 0];
      return compareVersions(actual, lower) >= 0 && compareVersions(actual, upper) < 0;
    }
    const exact = expression.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (exact) return compareVersions(actual, [Number(exact[1]), Number(exact[2]), Number(exact[3])]) === 0;
    if (/^>=\s*\d+(?:\.\d+){0,2}(?:\s+<\s*\d+(?:\.\d+){0,2})?$/.test(expression)) return lowerBounds.length > 0 && !upperBounds.some((bound) => compareVersions(actual, bound) >= 0);
    return false;
  });
}

async function readJson(filePath, code) {
  try { return JSON.parse(await readFile(filePath, 'utf8')); } catch (cause) {
    return { error: diagnostic(code, `Não foi possível ler JSON: ${filePath}.`, { filePath, cause }) };
  }
}

export async function validatePackageLock({ projectRoot = process.cwd() } = {}) {
  const packagePath = join(projectRoot, 'package.json');
  const lockPath = join(projectRoot, 'package-lock.json');
  const packageJson = await readJson(packagePath, 'PACKAGE_JSON_INVALID');
  if (packageJson.error) return { valid: false, diagnostics: [packageJson.error] };
  const lockJson = await readJson(lockPath, 'PACKAGE_LOCK_INVALID');
  if (lockJson.error) return { valid: false, diagnostics: [lockJson.error] };
  const root = lockJson.packages?.[''];
  if (!root || ![2, 3].includes(lockJson.lockfileVersion)) return { valid: false, diagnostics: [diagnostic('PACKAGE_LOCK_INVALID', 'O package-lock.json não possui formato compatível ou raiz válida.')] };
  const expected = packageJson.dependencies ?? {};
  const locked = root.dependencies ?? {};
  const expectedNames = Object.keys(expected).sort();
  const lockedNames = Object.keys(locked).sort();
  if (JSON.stringify(expectedNames) !== JSON.stringify(lockedNames) || expectedNames.some((name) => expected[name] !== locked[name])) {
    return { valid: false, diagnostics: [diagnostic('PACKAGE_LOCK_MISMATCH', 'package.json e package-lock.json possuem dependências diretas divergentes.')] };
  }
  return { valid: true, packageJson, lockJson };
}

export async function validateLocalDependencies({ projectRoot = process.cwd(), packageJson, runtimeVersion = process.version } = {}) {
  const manifest = packageJson ?? (await validatePackageLock({ projectRoot })).packageJson;
  if (!manifest) return { valid: false, diagnostics: [diagnostic('PACKAGE_JSON_INVALID', 'Não foi possível obter package.json para validar dependências.')] };
  const diagnostics = [];
  for (const [name, expectedVersion] of Object.entries(manifest.dependencies ?? {})) {
    const packagePath = join(projectRoot, 'node_modules', ...name.split('/'), 'package.json');
    let installed;
    try { installed = JSON.parse(await readFile(packagePath, 'utf8')); } catch {
      diagnostics.push(diagnostic('DEPENDENCY_MISSING', `A dependência local '${name}' não está instalada.`, { name, expectedVersion }));
      continue;
    }
    if (installed.version !== expectedVersion) diagnostics.push(diagnostic('DEPENDENCY_VERSION_MISMATCH', `A dependência local '${name}' não corresponde à versão exata declarada.`, { name, expectedVersion, actualVersion: installed.version }));
    if (typeof installed.engines?.node === 'string' && !satisfiesEngineRange(runtimeVersion, installed.engines.node)) {
      diagnostics.push(diagnostic('DEPENDENCY_NODE_ENGINE_UNSUPPORTED', `A dependência direta '${name}@${installed.version}' não declara compatibilidade com o Node.js ${runtimeVersion}.`, { name, version: installed.version, runtimeVersion, declaredEngine: installed.engines.node }));
    }
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

export async function validateProjectDependencies({ projectRoot = process.cwd(), runtimeVersion = process.version } = {}) {
  const lock = await validatePackageLock({ projectRoot });
  if (!lock.valid) return lock;
  const local = await validateLocalDependencies({ projectRoot, packageJson: lock.packageJson, runtimeVersion });
  return { ...local, packageJson: lock.packageJson, lockJson: lock.lockJson };
}

export async function projectFilesExist({ projectRoot = process.cwd() } = {}) {
  const paths = [join(projectRoot, 'package.json'), join(projectRoot, 'package-lock.json')];
  const missing = [];
  for (const path of paths) { try { await access(path, constants.F_OK); } catch { missing.push(path); } }
  return { valid: missing.length === 0, missing };
}
