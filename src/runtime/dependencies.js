import { access, constants, readFile } from 'node:fs/promises';
import { join } from 'node:path';

function diagnostic(code, message, details = {}) {
  return { code, message, ...details };
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

export async function validateLocalDependencies({ projectRoot = process.cwd(), packageJson } = {}) {
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
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

export async function validateProjectDependencies({ projectRoot = process.cwd() } = {}) {
  const lock = await validatePackageLock({ projectRoot });
  if (!lock.valid) return lock;
  const local = await validateLocalDependencies({ projectRoot, packageJson: lock.packageJson });
  return { ...local, packageJson: lock.packageJson, lockJson: lock.lockJson };
}

export async function projectFilesExist({ projectRoot = process.cwd() } = {}) {
  const paths = [join(projectRoot, 'package.json'), join(projectRoot, 'package-lock.json')];
  const missing = [];
  for (const path of paths) { try { await access(path, constants.F_OK); } catch { missing.push(path); } }
  return { valid: missing.length === 0, missing };
}
