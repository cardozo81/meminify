import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTextContent } from '../scripts/quality/check-encoding.mjs';

test('aceita UTF-8 válido com palavras portuguesas', () => {
  assert.doesNotThrow(() => validateTextContent('NÃO configuração usuário execução', 'memória'));
});

test('detecta sequência conhecida de mojibake sem rejeitar Ã isolado válido', () => {
  assert.doesNotThrow(() => validateTextContent('NÃO', 'válido'));
  assert.throws(() => validateTextContent('\u00c3\u0192Configura\u00e7\u00e3o', 'corrompido'), /Mojibake confirmado/);
});
