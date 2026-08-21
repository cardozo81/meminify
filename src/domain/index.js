export const OUTPUT_MODES = Object.freeze({
  BACKUP_OVERWRITE: 'BackupESobrescreverOriginais',
  PRESERVE_AND_CREATE_MINIFIED: 'PreservarOriginaisECriarMinificados',
});

export const DEFAULT_OUTPUT_MODE = OUTPUT_MODES.BACKUP_OVERWRITE;

export const PROFILES = Object.freeze({
  CONSERVADOR: 'Conservador',
  PADRAO: 'Padrao',
  MAXIMO: 'Maximo',
  PERSONALIZADO: 'Personalizado',
});

export const PROFILE_DEFINITIONS = Object.freeze({
  [PROFILES.CONSERVADOR]: Object.freeze({ risk: 'muito baixo' }),
  [PROFILES.PADRAO]: Object.freeze({ risk: 'baixo' }),
  [PROFILES.MAXIMO]: Object.freeze({ risk: 'moderado' }),
  [PROFILES.PERSONALIZADO]: Object.freeze({ risk: 'depende das opções selecionadas' }),
});

export const SOURCE_TYPES = Object.freeze({
  DIRECTORY: 'Diretorio',
  FILE: 'Arquivo',
});

export const SOURCE_MODES = Object.freeze({
  ALL: 'Todos',
  SELECTED: 'Selecionados',
  FILE: 'Arquivo',
});
