import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { assemblePackage, assertSafeDistTarget, collectAllowedFiles, getPackageMetadata, validatePackagedTree } from '../scripts/release/package.mjs';

const execFileAsync = promisify(execFile);
const projectRoot = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'Meminify 13C package '));
  for (const file of await collectAllowedFiles(projectRoot)) {
    const source = join(projectRoot, ...file.split('/'));
    const destination = join(root, ...file.split('/'));
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
  return root;
}

function runProcess(file, args, { cwd, input = '' } = {}) {
  return new Promise((resolveProcess, reject) => {
    const child = spawn(file, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolveProcess({ code, stdout, stderr }));
    if (input) child.stdin.end(input);
  });
}

test('nomes de artefato derivam da versão e allowlist contém somente runtime necessário', async () => {
  const metadata = await getPackageMetadata(projectRoot);
  assert.equal(metadata.version, '0.1.0');
  assert.equal(metadata.packageName, 'Meminify-0.1.0');
  assert.match(metadata.zipPath, /Meminify-0\.1\.0\.zip$/);
  const files = await collectAllowedFiles(projectRoot);
  for (const required of ['Executar.cmd', 'Executar.ps1', 'LEIA-ME.txt', 'src/app/ui.ps1', 'resources/runtime-policy.json', 'Configuracao/configuracao.ini.example', 'Documentacao/Gerada/Manual-Usuario/index.html']) assert.ok(files.includes(required));
  assert.equal(files.some((file) => /^(?:test|Especificacoes|_ias|node_modules|Dados)\//.test(file)), false);
  assert.equal(files.includes('Configuracao/configuracao.ini'), false);
  const launcher = await readFile(join(projectRoot, 'Executar.cmd'), 'utf8');
  assert.match(launcher, /%~dp0Executar\.ps1/i);
  assert.match(launcher, /powershell\.exe -NoProfile -File/i);
  assert.doesNotMatch(launcher, /ExecutionPolicy\s+Bypass/i);
  assert.doesNotMatch(launcher, /[A-Za-z]:\\(?:Users|IA-PROJETOS)\\/i);
  const powershellBytes = await readFile(join(projectRoot, 'Executar.ps1'));
  assert.deepEqual([...powershellBytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF]);
  const readme = await readFile(join(projectRoot, 'LEIA-ME.txt'), 'utf8');
  for (const guidance of ['Executar.cmd', 'configuracao.ini.example', 'Ajustar somente esta execução', 'Dados\\Relatorios']) assert.match(readme, new RegExp(guidance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('montagem valida documentação e falha com obrigatório ausente ou proibido presente', async () => {
  const root = await fixture();
  try {
    const metadata = await assemblePackage(root);
    assert.equal((await validatePackagedTree({ projectRoot: root, packageRoot: metadata.packageRoot, version: metadata.version })).valid, true);
    await rm(join(metadata.packageRoot, 'Executar.ps1'));
    await assert.rejects(validatePackagedTree({ projectRoot: root, packageRoot: metadata.packageRoot, version: metadata.version }), /obrigatório ausente/);
    await copyFile(join(root, 'Executar.ps1'), join(metadata.packageRoot, 'Executar.ps1'));
    await mkdir(join(metadata.packageRoot, 'Configuracao'), { recursive: true });
    await writeFile(join(metadata.packageRoot, 'Configuracao', 'configuracao.ini'), 'pessoal=true', 'utf8');
    await assert.rejects(validatePackagedTree({ projectRoot: root, packageRoot: metadata.packageRoot, version: metadata.version }), /proibido|allowlist/);
    await rm(join(metadata.packageRoot, 'Configuracao', 'configuracao.ini'));
    await writeFile(join(metadata.packageRoot, 'LEIA-ME.txt'), 'C:\\Users\\pessoa\\segredo', 'utf8');
    await assert.rejects(validatePackagedTree({ projectRoot: root, packageRoot: metadata.packageRoot, version: metadata.version }), /Conteúdo local/);
    await copyFile(join(root, 'LEIA-ME.txt'), join(metadata.packageRoot, 'LEIA-ME.txt'));
    await writeFile(join(metadata.packageRoot, 'LEIA-ME.txt'), `configuração minificação execução usuário não restauração relatório ${String.fromCharCode(0xC3, 0xA7)}`, 'utf8');
    await assert.rejects(validatePackagedTree({ projectRoot: root, packageRoot: metadata.packageRoot, version: metadata.version }), /Mojibake confirmado/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('pacote isolado resolve versão e inicia fora do repositório em caminho com espaços', async () => {
  const root = await fixture();
  const cwd = await mkdtemp(join(tmpdir(), 'Meminify 13C cwd '));
  const failureRoot = await mkdtemp(join(tmpdir(), 'Meminify 13C failure '));
  try {
    const metadata = await assemblePackage(root);
    await cp(join(projectRoot, 'node_modules'), join(metadata.packageRoot, 'node_modules'), { recursive: true });
    const request = await runProcess(process.execPath, [join(metadata.packageRoot, 'src', 'app', 'bridge.mjs'), '--bridge'], { cwd, input: '{"command":"version"}' });
    assert.equal(request.code, 0);
    assert.equal(JSON.parse(request.stdout).version, '0.1.0');
    const powershell = 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    const startup = await runProcess(powershell, ['-NoProfile', '-ExecutionPolicy', 'RemoteSigned', '-File', join(metadata.packageRoot, 'Executar.ps1')], { cwd, input: '1\r\n0\r\n' });
    assert.equal(startup.code, 0);
    assert.equal((startup.stdout.match(/MEMINIFY v0\.1\.0/g) ?? []).length, 1);
    assert.match(startup.stdout, /Erro: Configuração persistente ausente/);
    const powershellMojibake = String.fromCharCode(0x00C3, 0x0192, 0x00C2, 0x00A0);
    assert.doesNotMatch(`${startup.stdout}${startup.stderr}`, new RegExp(powershellMojibake));
    const bridgePath = join(metadata.packageRoot, 'src', 'app', 'bridge.mjs');
    const requestBridge = async (request) => runProcess(process.execPath, [bridgePath, '--bridge'], { cwd, input: JSON.stringify(request) });
    const created = JSON.parse((await requestBridge({ command: 'create-configuration', confirmed: true })).stdout);
    assert.equal(created.ok, true);
    assert.equal(created.configurationPath, join(metadata.packageRoot, 'Configuracao', 'configuracao.ini'));
    assert.equal(await (async () => { try { await readFile(join(metadata.packageRoot, 'src', 'app', 'Configuracao', 'configuracao.ini')); return true; } catch { return false; } })(), false);
    const summary = JSON.parse((await requestBridge({ command: 'summary' })).stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.configurationPath, join(metadata.packageRoot, 'Configuracao', 'configuracao.ini'));
    const restartedSummary = JSON.parse((await requestBridge({ command: 'summary' })).stdout);
    assert.equal(restartedSummary.ok, true);
    const analyzed = JSON.parse((await requestBridge({ command: 'analyze' })).stdout);
    assert.equal(analyzed.ok, true);
    assert.match(analyzed.artifacts.log.path, new RegExp(metadata.packageRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(analyzed.artifacts.log.path, /src[\\/]app[\\/]Dados/i);
    await copyFile(join(root, 'Executar.cmd'), join(failureRoot, 'Executar.cmd'));
    const failure = await runProcess('cmd.exe', ['/d', '/c', 'Executar.cmd'], { cwd: failureRoot, input: '\r\n' });
    assert.equal(failure.code, 1);
    assert.match(failure.stdout, /não foi possível iniciar|encerrado com erro/i);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(cwd, { recursive: true, force: true });
    await rm(failureRoot, { recursive: true, force: true });
  }
});

test('ZIP contém raiz esperada e checksum SHA-256 corresponde', async () => {
  const root = await fixture();
  try {
    const metadata = await assemblePackage(root);
    const powershell = 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    await execFileAsync(powershell, ['-NoProfile', '-Command', `Compress-Archive -LiteralPath '${metadata.packageRoot.replaceAll("'", "''")}' -DestinationPath '${metadata.zipPath.replaceAll("'", "''")}' -Force`]);
    const listing = await execFileAsync(powershell, ['-NoProfile', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${metadata.zipPath.replaceAll("'", "''")}'); try { $z.Entries | ForEach-Object FullName } finally { $z.Dispose() }`]);
    const entries = listing.stdout.split(/\r?\n/).filter(Boolean).map((entry) => entry.replaceAll('\\', '/'));
    assert.ok(entries.includes(`${metadata.packageName}/Executar.cmd`));
    assert.ok(entries.includes(`${metadata.packageName}/LEIA-ME.txt`));
    assert.equal(entries.some((entry) => !entry.startsWith(`${metadata.packageName}/`)), false);
    const bytes = await readFile(metadata.zipPath);
    const hash = createHash('sha256').update(bytes).digest('hex');
    await writeFile(metadata.checksumPath, `${hash}  ${metadata.packageName}.zip\n`, 'utf8');
    assert.equal((await readFile(metadata.checksumPath, 'utf8')).trim().split(/\s+/)[0], hash);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('limpeza fora de dist ou com nome inesperado é rejeitada', async () => {
  assert.throws(() => assertSafeDistTarget(projectRoot, join(projectRoot, 'src'), 'Meminify-0.1.0'));
  assert.throws(() => assertSafeDistTarget(projectRoot, join(projectRoot, 'dist', 'outro'), 'Meminify-0.1.0'));
});
