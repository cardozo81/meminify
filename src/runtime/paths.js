import { resolve } from 'node:path';

export const RUNTIME_RELATIVE_PATHS = Object.freeze({
  temporaryDirectory: 'Dados/Temporarios',
  technicalState: 'Dados/estado.json',
  recoveryDirectory: 'Dados/Restauracao',
  lastExecutionJournal: 'Dados/Restauracao/ultima-execucao.bkp',
  manualRestoreJournal: 'Dados/Restauracao/restauracao-em-andamento.bkp',
});

export function resolveRuntimePaths(baseDirectory = process.cwd()) {
  return Object.freeze({
    temporaryDirectory: resolve(baseDirectory, RUNTIME_RELATIVE_PATHS.temporaryDirectory),
    technicalState: resolve(baseDirectory, RUNTIME_RELATIVE_PATHS.technicalState),
    recoveryDirectory: resolve(baseDirectory, RUNTIME_RELATIVE_PATHS.recoveryDirectory),
    lastExecutionJournal: resolve(baseDirectory, RUNTIME_RELATIVE_PATHS.lastExecutionJournal),
    manualRestoreJournal: resolve(baseDirectory, RUNTIME_RELATIVE_PATHS.manualRestoreJournal),
  });
}
