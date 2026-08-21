import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBridgeRequest } from '../src/app/bridge.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'meminify-bridge-'));
  const source = join(root, 'entrada.js');
  await writeFile(source, 'const valor = 1;\n', 'utf8');
  await mkdir(join(root, 'Configuracao'), { recursive: true });
  await writeFile(join(root, 'Configuracao', 'configuracao.ini'), `[Configuracao]\nMotor=esbuild\nPerfil=Padrao\nModoSaida=PreservarOriginaisECriarMinificados\nIncluir01=**/*.js\n\n[Origem.001]\nTipo=Arquivo\nCaminho=${source}\nExecutarPorPadrao=true\nModo=Arquivo\n`, 'utf8');
  return { root, source };
}

test('bridge retorna análise estruturada e risco de execução indisponível', async () => {
  const { root } = await fixture();
  try {
    const response = await runBridgeRequest({ command: 'analyze' }, { projectRoot: root });
    assert.equal(response.ok, true);
    assert.equal(response.analysis.status, 'ready');
    assert.equal(response.analysis.counts.eligible, 1);
    assert.equal(response.analysis.riskAssessment.status, 'unavailable');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('bridge propaga erro de configuração sem fallback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'meminify-bridge-invalid-'));
  try {
    await mkdir(join(root, 'Configuracao'), { recursive: true });
    await writeFile(join(root, 'Configuracao', 'configuracao.ini'), '[Configuracao]\nMotor=nao-homologado\nPerfil=Padrao\n', 'utf8');
    const response = await runBridgeRequest({ command: 'analyze' }, { projectRoot: root });
    assert.equal(response.ok, false);
    assert.equal(response.diagnostic.code, 'UNSUPPORTED_ENGINE');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('execução sem confirmação não modifica e ajuste temporário não persiste', async () => {
  const { root, source } = await fixture();
  try {
    const before = await readFile(source, 'utf8');
    const response = await runBridgeRequest({ command: 'execute', confirmed: false, adjustments: { outputMode: 'BackupESobrescreverOriginais' }, riskAssessment: { authorized: true } }, { projectRoot: root });
    assert.equal(response.ok, false);
    assert.equal(response.diagnostic.code, 'EXECUTION_CONFIRMATION_REQUIRED');
    assert.equal(await readFile(source, 'utf8'), before);
    const summary = await runBridgeRequest({ command: 'summary' }, { projectRoot: root });
    assert.equal(summary.configuration.outputMode, 'PreservarOriginaisECriarMinificados');
  } finally { await rm(root, { recursive: true, force: true }); }
});
