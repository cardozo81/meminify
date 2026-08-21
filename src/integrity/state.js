import { resolveRuntimePaths } from '../runtime/paths.js';
import { IntegrityError } from './errors.js';
import { readJsonUtf8, writeJsonUtf8Atomic } from './json-store.js';
import { requireObject, validateRecord } from './schema.js';

export function validateTechnicalState(state) {
  requireObject(state, 'INVALID_TECHNICAL_STATE', 'Estado técnico');
  if (state.formatVersion !== 1) throw new IntegrityError('INVALID_TECHNICAL_STATE', 'A versão do formato do estado técnico não é suportada.');
  if (!Array.isArray(state.records)) throw new IntegrityError('INVALID_TECHNICAL_STATE', 'Estado técnico.records deve ser uma lista.');
  state.records.forEach((record, index) => validateRecord(record, 'INVALID_TECHNICAL_STATE', `Estado técnico.records[${index}]`));
  return state;
}

export async function readTechnicalState(filePath = resolveRuntimePaths().technicalState) {
  return validateTechnicalState(await readJsonUtf8(filePath, 'TECHNICAL_STATE'));
}

export async function writeTechnicalState(state, filePath = resolveRuntimePaths().technicalState) {
  validateTechnicalState(state);
  await writeJsonUtf8Atomic(filePath, state, 'TECHNICAL_STATE');
  return state;
}
