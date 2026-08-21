import {
  DEFAULT_OUTPUT_MODE,
  OUTPUT_MODES,
  PROFILE_DEFINITIONS,
  PROFILES,
  SOURCE_MODES,
  SOURCE_TYPES,
} from '../domain/index.js';
import { ConfigurationError } from './errors.js';

function fail(code, message, details = {}) {
  throw new ConfigurationError(code, message, details);
}

function normalizeAllowedEngines(allowedEngines) {
  if (allowedEngines === undefined || allowedEngines === null) {
    fail('ENGINE_SET_REQUIRED', 'A validação exige o conjunto de motores homologados como dependência explícita.');
  }
  const values = allowedEngines instanceof Set ? [...allowedEngines] : [...allowedEngines];
  if (values.length === 0) {
    fail('ENGINE_SET_EMPTY', 'O conjunto de motores homologados não pode estar vazio.');
  }
  return new Set(values);
}

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value === '') {
    fail('MISSING_REQUIRED_VALUE', `O campo '${field}' é obrigatório e deve ser texto não vazio.`, { field });
  }
}

export function validateConfiguration(configuration, { allowedEngines } = {}) {
  const homologatedEngines = normalizeAllowedEngines(allowedEngines);
  const outputMode = configuration.outputMode === undefined ? DEFAULT_OUTPUT_MODE : configuration.outputMode;
  if (!Object.values(OUTPUT_MODES).includes(outputMode)) {
    fail('INVALID_OUTPUT_MODE', `O modo de saída '${outputMode}' não é permitido.`, {
      allowed: Object.values(OUTPUT_MODES),
      value: outputMode,
    });
  }

  requireNonEmptyString(configuration.engineId, 'Motor');
  if (!homologatedEngines.has(configuration.engineId)) {
    fail('UNSUPPORTED_ENGINE', `O motor '${configuration.engineId}' não está no conjunto homologado fornecido.`, {
      engine: configuration.engineId,
      allowed: [...homologatedEngines],
    });
  }

  requireNonEmptyString(configuration.profile, 'Perfil');
  if (!Object.hasOwn(PROFILE_DEFINITIONS, configuration.profile)) {
    fail('INVALID_PROFILE', `O perfil '${configuration.profile}' não é permitido.`, {
      allowed: Object.values(PROFILES),
      value: configuration.profile,
    });
  }
  if (configuration.profile === PROFILES.PERSONALIZADO) {
    fail('PROFILE_OPTIONS_PENDING', 'O perfil Personalizado é reconhecido, mas suas opções ainda não foram especificadas; a execução foi bloqueada.', {
      profile: configuration.profile,
    });
  }

  if (!Array.isArray(configuration.globalIncludes) || !Array.isArray(configuration.globalExcludes)) {
    fail('INVALID_LISTS', 'As listas globais de inclusão e exclusão devem ser vetores normalizados.');
  }
  if (!Array.isArray(configuration.sources)) {
    fail('INVALID_SOURCES', 'As origens devem ser uma lista normalizada.');
  }

  const sourceIds = new Set();
  for (const source of configuration.sources) {
    requireNonEmptyString(source.id, 'Origem.id');
    if (sourceIds.has(source.id)) fail('DUPLICATE_ORIGIN_ID', `O identificador de origem '${source.id}' foi repetido.`);
    sourceIds.add(source.id);
    if (!Object.values(SOURCE_TYPES).includes(source.type)) fail('INVALID_SOURCE_TYPE', `O tipo de origem '${source.type}' não é permitido.`);
    requireNonEmptyString(source.path, `Origem.${source.id}.Caminho`);
    if (typeof source.executeByDefault !== 'boolean') fail('INVALID_BOOLEAN', `ExecutarPorPadrao da origem '${source.id}' deve ser booleano.`);
    if (!Object.values(SOURCE_MODES).includes(source.mode)) fail('INVALID_SOURCE_MODE', `O modo de origem '${source.mode}' não é permitido.`);
    if (source.type === SOURCE_TYPES.DIRECTORY && typeof source.recursive !== 'boolean') fail('INVALID_BOOLEAN', `Recursivo da origem '${source.id}' deve ser booleano.`);
    if (source.type === SOURCE_TYPES.FILE && source.mode !== SOURCE_MODES.FILE) fail('SOURCE_MODE_MISMATCH', `A origem de arquivo '${source.id}' deve usar o modo Arquivo.`);
    if (source.type === SOURCE_TYPES.DIRECTORY && source.mode === SOURCE_MODES.FILE) fail('SOURCE_MODE_MISMATCH', `A origem de diretório '${source.id}' não pode usar o modo Arquivo.`);
    if (!Array.isArray(source.includes) || !Array.isArray(source.excludes)) fail('INVALID_LISTS', `As listas da origem '${source.id}' devem ser vetores normalizados.`);
  }

  return {
    ...configuration,
    outputMode,
    globalIncludes: [...configuration.globalIncludes],
    globalExcludes: [...configuration.globalExcludes],
    sources: configuration.sources.map((source) => ({
      ...source,
      includes: [...source.includes],
      excludes: [...source.excludes],
    })),
  };
}
