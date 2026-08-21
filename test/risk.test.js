import assert from 'node:assert/strict';
import test from 'node:test';
import { OUTPUT_MODES } from '../src/domain/index.js';
import { calculateExecutionRisk } from '../src/execution/index.js';

const matrix = [
  [OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED, 'Conservador', 'Baixo'],
  [OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED, 'Padrao', 'Moderado'],
  [OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED, 'Maximo', 'Alto'],
  [OUTPUT_MODES.BACKUP_OVERWRITE, 'Conservador', 'Moderado'],
  [OUTPUT_MODES.BACKUP_OVERWRITE, 'Padrao', 'Alto'],
  [OUTPUT_MODES.BACKUP_OVERWRITE, 'Maximo', 'Critico'],
];

test('matriz de risco 0.1.0 é determinística para os perfis executáveis', () => {
  for (const [outputMode, profile, expected] of matrix) {
    const risk = calculateExecutionRisk({ outputMode, profile, conflictCount: 0 });
    assert.equal(risk.technicalLevel, expected);
    assert.equal(risk.status, 'determined');
    assert.equal(risk.displayLevel, expected === 'Critico' ? 'Crítico' : expected);
  }
});

test('conflito .min eleva um nível com teto Critico', () => {
  assert.equal(calculateExecutionRisk({ outputMode: OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED, profile: 'Conservador', conflictCount: 1 }).technicalLevel, 'Moderado');
  assert.equal(calculateExecutionRisk({ outputMode: OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED, profile: 'Padrao', conflictCount: 2 }).technicalLevel, 'Alto');
  assert.equal(calculateExecutionRisk({ outputMode: OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED, profile: 'Maximo', conflictCount: 1 }).technicalLevel, 'Critico');
});

test('entrada de risco indeterminada bloqueia sem fallback', () => {
  assert.throws(() => calculateExecutionRisk({ outputMode: 'Outro', profile: 'Padrao', conflictCount: 0 }), (error) => error.code === 'RISK_INPUT_INDETERMINATE');
  assert.throws(() => calculateExecutionRisk({ outputMode: OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED, profile: 'Personalizado', conflictCount: 0 }), (error) => error.code === 'RISK_INPUT_INDETERMINATE');
  assert.throws(() => calculateExecutionRisk({ outputMode: OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED, profile: 'Padrao', conflictCount: null }), (error) => error.code === 'RISK_INPUT_INDETERMINATE');
});
