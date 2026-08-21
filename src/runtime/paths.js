import { resolve } from 'node:path';

export const RUNTIME_RELATIVE_PATHS = Object.freeze({
  temporaryDirectory: 'Dados/Temporarios',
  technicalState: 'Dados/estado.json',
});

export function resolveRuntimePaths(baseDirectory = process.cwd()) {
  return Object.freeze({
    temporaryDirectory: resolve(baseDirectory, RUNTIME_RELATIVE_PATHS.temporaryDirectory),
    technicalState: resolve(baseDirectory, RUNTIME_RELATIVE_PATHS.technicalState),
  });
}
