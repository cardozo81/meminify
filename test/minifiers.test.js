import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultMinifierRegistry,
  MINIFIER_TYPES,
  MinifierError,
} from '../src/minifiers/index.js';

const registry = createDefaultMinifierRegistry();
const adapter = registry.get('esbuild');

function expectMinifierCode(callback, code) {
  assert.throws(callback, (error) => error instanceof MinifierError && error.code === code);
}

async function expectMinifierRejection(callback, code) {
  await assert.rejects(callback, (error) => error instanceof MinifierError && error.code === code);
}

test('registry expõe somente o esbuild homologado', () => {
  assert.deepEqual(registry.list().map((entry) => entry.id), ['esbuild']);
  assert.equal(registry.list()[0].version, '0.28.2');
  assert.equal(registry.has('esbuild'), true);
  assert.equal(registry.has('outro'), false);
  expectMinifierCode(() => registry.get('outro'), 'UNKNOWN_ENGINE');
});

test('adapter declara suporte a JavaScript e CSS', () => {
  assert.deepEqual(adapter.getCapabilities().supportedTypes, ['javascript', 'css']);
  assert.equal(adapter.validateInstallation().valid, true);
});

test('rejeita tipo não suportado', async () => {
  const validation = adapter.validateConfiguration({ type: 'html', profile: 'Padrao' });
  assert.equal(validation.valid, false);
  assert.equal(validation.diagnostics[0].code, 'UNSUPPORTED_TYPE');
  await expectMinifierRejection(() => adapter.minify({ type: 'html', profile: 'Padrao', source: '<p>x</p>' }), 'INVALID_MINIFIER_CONFIGURATION');
});

test('tradução de perfil é isolada e não compartilha opções mutáveis', () => {
  const first = adapter.translateProfile('Conservador');
  first.minifyWhitespace = false;
  const second = adapter.translateProfile('Conservador');
  assert.notStrictEqual(first, second);
  assert.equal(second.minifyWhitespace, true);
  assert.equal(adapter.translateProfile('Padrao').minifyIdentifiers, false);
  assert.equal(adapter.translateProfile('Maximo').minifyIdentifiers, true);
});

test('Personalizado falha fechado com diagnóstico pendente explícito', () => {
  const validation = adapter.validateConfiguration({ type: MINIFIER_TYPES.JAVASCRIPT, profile: 'Personalizado' });
  assert.equal(validation.valid, false);
  assert.equal(validation.diagnostics[0].code, 'PROFILE_OPTIONS_PENDING');
  expectMinifierCode(() => adapter.translateProfile('Personalizado'), 'PROFILE_OPTIONS_PENDING');
});

test('configuração de engine inválida é rejeitada', () => {
  const validation = adapter.validateConfiguration({
    engineId: 'outro',
    type: MINIFIER_TYPES.JAVASCRIPT,
    profile: 'Padrao',
  });
  assert.equal(validation.valid, false);
  assert.equal(validation.diagnostics[0].code, 'INVALID_ENGINE');
});

test('Conservador produz JavaScript não vazio', async () => {
  const result = await adapter.minify({
    type: MINIFIER_TYPES.JAVASCRIPT,
    profile: 'Conservador',
    source: 'function soma(a, b) { return a + b; } console.log(soma(1, 2));',
  });
  assert.equal(result.status, 'success');
  assert.equal(typeof result.output, 'string');
  assert.ok(result.output.length > 0);
  assert.equal(result.type, MINIFIER_TYPES.JAVASCRIPT);
});

test('Padrao produz JavaScript não vazio', async () => {
  const result = await adapter.minify({
    type: MINIFIER_TYPES.JAVASCRIPT,
    profile: 'Padrao',
    source: 'const mensagem = "olá"; console.log(mensagem);',
  });
  assert.equal(result.status, 'success');
  assert.ok(result.output.length > 0);
});

test('Maximo produz JavaScript não vazio', async () => {
  const result = await adapter.minify({
    type: MINIFIER_TYPES.JAVASCRIPT,
    profile: 'Maximo',
    source: 'function calcula(valor) { const resultado = valor * 2; return resultado; } console.log(calcula(3));',
  });
  assert.equal(result.status, 'success');
  assert.ok(result.output.length > 0);
});

test('adapter minifica CSS e retorna resultado neutro', async () => {
  const result = await adapter.minify({
    type: MINIFIER_TYPES.CSS,
    profile: 'Padrao',
    source: 'body { color: red; margin: 0px 0px 0px 0px; }',
  });
  assert.equal(result.status, 'success');
  assert.equal(result.type, MINIFIER_TYPES.CSS);
  assert.ok(result.output.length > 0);
  assert.equal(typeof result.outputSize, 'number');
  assert.equal(Object.hasOwn(result, 'warnings'), false);
  assert.equal(Object.hasOwn(result, 'metafile'), false);
  assert.equal(Object.hasOwn(result, 'esbuild'), false);
  assert.ok(result.diagnostics.every((diagnostic) => Object.keys(diagnostic).sort().join(',') === 'code,message,severity'));
});
