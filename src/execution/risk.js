import { OUTPUT_MODES, PROFILES } from '../domain/index.js';
import { ExecutionError } from './errors.js';

export const EXECUTION_RISK_LEVELS = Object.freeze(['Baixo', 'Moderado', 'Alto', 'Critico']);

const RISK_MATRIX = Object.freeze({
  [OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED]: Object.freeze({
    [PROFILES.CONSERVADOR]: 'Baixo',
    [PROFILES.PADRAO]: 'Moderado',
    [PROFILES.MAXIMO]: 'Alto',
  }),
  [OUTPUT_MODES.BACKUP_OVERWRITE]: Object.freeze({
    [PROFILES.CONSERVADOR]: 'Moderado',
    [PROFILES.PADRAO]: 'Alto',
    [PROFILES.MAXIMO]: 'Critico',
  }),
});

export function displayExecutionRisk(level) {
  return level === 'Critico' ? 'Crítico' : level;
}

export function calculateExecutionRisk({ outputMode, profile, conflictCount = 0 } = {}) {
  if (!Number.isSafeInteger(conflictCount) || conflictCount < 0) {
    throw new ExecutionError('RISK_INPUT_INDETERMINATE', 'A quantidade de conflitos necessária ao cálculo de risco não pôde ser determinada.');
  }
  const baseLevel = RISK_MATRIX[outputMode]?.[profile];
  if (!baseLevel) {
    throw new ExecutionError('RISK_INPUT_INDETERMINATE', 'O risco da execução não pôde ser calculado deterministicamente para o modo e perfil informados.', { outputMode, profile });
  }
  const conflictElevation = outputMode === OUTPUT_MODES.PRESERVE_AND_CREATE_MINIFIED && conflictCount > 0;
  const baseIndex = EXECUTION_RISK_LEVELS.indexOf(baseLevel);
  const technicalLevel = EXECUTION_RISK_LEVELS[Math.min(baseIndex + (conflictElevation ? 1 : 0), EXECUTION_RISK_LEVELS.length - 1)];
  return Object.freeze({
    status: 'determined',
    technicalLevel,
    displayLevel: displayExecutionRisk(technicalLevel),
    baseLevel,
    conflictElevation,
    conflictCount,
    factors: Object.freeze(conflictElevation ? ['SOBRESCRITA_GLOBAL_DE_DESTINO_MIN_PREEXISTENTE'] : []),
  });
}

export function validateCalculatedExecutionRisk(risk, expectedInputs = null) {
  const structurallyValid = Boolean(
    risk
    && risk.status === 'determined'
    && EXECUTION_RISK_LEVELS.includes(risk.technicalLevel)
    && risk.displayLevel === displayExecutionRisk(risk.technicalLevel)
    && EXECUTION_RISK_LEVELS.includes(risk.baseLevel)
    && typeof risk.conflictElevation === 'boolean'
    && Number.isSafeInteger(risk.conflictCount)
    && risk.conflictCount >= 0
    && Array.isArray(risk.factors)
  );
  if (!structurallyValid) return false;
  if (!expectedInputs) return true;
  try {
    const expected = calculateExecutionRisk(expectedInputs);
    return risk.technicalLevel === expected.technicalLevel
      && risk.displayLevel === expected.displayLevel
      && risk.baseLevel === expected.baseLevel
      && risk.conflictElevation === expected.conflictElevation
      && risk.conflictCount === expected.conflictCount
      && risk.factors.length === expected.factors.length
      && risk.factors.every((factor, index) => factor === expected.factors[index]);
  } catch {
    return false;
  }
}
