import { copyFile, lstat, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePackageLock, validateProjectDependencies } from '../../src/runtime/dependencies.js';
import { loadRuntimePolicy, validateNodeRuntimeVersion } from '../../src/runtime/policy.js';

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERSION_PATTERN = /^0\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const FIXED_FILES = Object.freeze([
  'Executar.ps1',
  'package.json',
  'package-lock.json',
  'README.md',
  'CHANGELOG.md',
  'Configuracao/configuracao.ini.example',
  'Documentacao/Gerada/Manual-Usuario/index.html',
  'Documentacao/Gerada/Manual-Tecnico/index.html',
]);
const ALLOWED_TREES = Object.freeze([
  { path: 'src', extensions: new Set(['.js', '.mjs', '.ps1']) },
  { path: 'resources', extensions: new Set(['.json']) },
]);
const FORBIDDEN_PARTS = new Set(['.git', '.github', '_ias', 'Especificacoes', 'test', 'tests', 'fixtures', 'node_modules', 'dist', 'Dados', '_source_versions']);

function slash(value) { return value.split(sep).join('/'); }
function extension(name) { const index = name.lastIndexOf('.'); return index < 0 ? '' : name.slice(index).toLowerCase(); }
async function regularFile(path) { const stats = await lstat(path); if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`Arquivo não regular ou link proibido: ${path}.`); }

async function walk(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Link proibido no conteúdo do pacote: ${path}.`);
    if (entry.isDirectory()) files.push(...await walk(path, root));
    else if (entry.isFile()) files.push(slash(relative(root, path)));
  }
  return files.sort();
}

export async function getPackageMetadata(projectRoot = scriptRoot) {
  const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
  if (typeof packageJson.version !== 'string' || !VERSION_PATTERN.test(packageJson.version)) throw new Error('package.json deve conter uma versão de desenvolvimento pre-1.0 válida.');
  const packageName = `Meminify-${packageJson.version}`;
  return Object.freeze({
    version: packageJson.version,
    packageName,
    distRoot: resolve(projectRoot, 'dist'),
    packageRoot: resolve(projectRoot, 'dist', packageName),
    zipPath: resolve(projectRoot, 'dist', `${packageName}.zip`),
    checksumPath: resolve(projectRoot, 'dist', `${packageName}.zip.sha256`),
  });
}

export function assertSafeDistTarget(projectRoot, target, expectedName) {
  const distRoot = resolve(projectRoot, 'dist');
  const resolved = resolve(target);
  const expected = resolve(distRoot, expectedName);
  if (resolved !== expected || dirname(resolved) !== distRoot) throw new Error(`Destino de limpeza fora do escopo permitido: ${resolved}.`);
  return resolved;
}

export async function collectAllowedFiles(projectRoot = scriptRoot) {
  const files = [...FIXED_FILES];
  for (const tree of ALLOWED_TREES) {
    const root = join(projectRoot, tree.path);
    for (const file of await walk(root)) if (tree.extensions.has(extension(file))) files.push(`${tree.path}/${file}`);
  }
  for (const file of files) await regularFile(join(projectRoot, ...file.split('/')));
  return [...new Set(files)].sort();
}

function forbidden(relativePath) {
  const parts = relativePath.split('/');
  return parts.some((part) => FORBIDDEN_PARTS.has(part))
    || relativePath === 'Configuracao/configuracao.ini'
    || /(?:^|\/)configuracao\.ini$/i.test(relativePath)
    || /(?:^|\/).+\.(?:log|tmp)$/i.test(relativePath);
}

export async function validatePackagedTree({ projectRoot = scriptRoot, packageRoot, version } = {}) {
  const metadata = await getPackageMetadata(projectRoot);
  if (version !== metadata.version || resolve(packageRoot) !== metadata.packageRoot) throw new Error('A versão ou raiz do pacote não corresponde ao package.json.');
  const expected = await collectAllowedFiles(projectRoot);
  const actual = await walk(packageRoot);
  for (const required of expected) if (!actual.includes(required)) throw new Error(`Arquivo obrigatório ausente no pacote: ${required}.`);
  for (const file of actual) {
    if (forbidden(file)) throw new Error(`Conteúdo proibido no pacote: ${file}.`);
    if (!expected.includes(file)) throw new Error(`Conteúdo fora da allowlist no pacote: ${file}.`);
  }
  const packagedLock = await validatePackageLock({ projectRoot: packageRoot });
  if (!packagedLock.valid) throw new Error(`Package/lock inválido no pacote: ${JSON.stringify(packagedLock.diagnostics)}.`);
  if (packagedLock.packageJson.version !== version || packagedLock.lockJson.packages?.['']?.version !== version) throw new Error('Versão divergente entre pacote, package.json e package-lock.json.');
  return { valid: true, files: actual, metadata };
}

export async function assemblePackage(projectRoot = scriptRoot) {
  const metadata = await getPackageMetadata(projectRoot);
  assertSafeDistTarget(projectRoot, metadata.packageRoot, metadata.packageName);
  assertSafeDistTarget(projectRoot, metadata.zipPath, `${metadata.packageName}.zip`);
  assertSafeDistTarget(projectRoot, metadata.checksumPath, `${metadata.packageName}.zip.sha256`);
  await mkdir(metadata.distRoot, { recursive: true });
  await rm(metadata.packageRoot, { recursive: true, force: true });
  await rm(metadata.zipPath, { force: true });
  await rm(metadata.checksumPath, { force: true });
  for (const file of await collectAllowedFiles(projectRoot)) {
    const source = join(projectRoot, ...file.split('/'));
    const destination = join(metadata.packageRoot, ...file.split('/'));
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
  await validatePackagedTree({ projectRoot, packageRoot: metadata.packageRoot, version: metadata.version });
  return metadata;
}

export async function validatePackagingEnvironment(projectRoot = scriptRoot) {
  const metadata = await getPackageMetadata(projectRoot);
  const dependencies = await validateProjectDependencies({ projectRoot });
  if (!dependencies.valid) throw new Error(`Dependências locais ou package/lock inválidos: ${JSON.stringify(dependencies.diagnostics)}.`);
  if (dependencies.packageJson.version !== metadata.version || dependencies.lockJson.packages?.['']?.version !== metadata.version) throw new Error('Versão divergente entre package.json e package-lock.json.');
  const policy = await loadRuntimePolicy(join(projectRoot, 'resources', 'runtime-policy.json'));
  const runtime = validateNodeRuntimeVersion(process.version, policy);
  if (!runtime.valid) throw new Error(runtime.message);
  return { valid: true, metadata, runtime };
}

async function main() {
  const command = process.argv[2];
  const projectRoot = process.argv[3] ? resolve(process.argv[3]) : scriptRoot;
  if (command === 'info') return getPackageMetadata(projectRoot);
  if (command === 'validate-project') return validatePackagingEnvironment(projectRoot);
  if (command === 'assemble') return assemblePackage(projectRoot);
  if (command === 'validate-package') {
    const metadata = await getPackageMetadata(projectRoot);
    return validatePackagedTree({ projectRoot, packageRoot: metadata.packageRoot, version: metadata.version });
  }
  throw new Error('Comando de empacotamento inválido.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(`Empacotamento bloqueado: ${error.message}`); process.exitCode = 1; });
}
