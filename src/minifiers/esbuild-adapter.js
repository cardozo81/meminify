import * as defaultEsbuild from 'esbuild';
import {
  MINIFIER_TYPES,
  Minifier,
  MinifierError,
  normalizeDiagnostics,
  normalizeMinifierResult,
} from './minifier.js';

const SUPPORTED_PROFILES = Object.freeze(['Conservador', 'Padrao', 'Maximo', 'Personalizado']);

const PROFILE_OPTIONS = Object.freeze({
  Conservador: Object.freeze({
    minifyWhitespace: true,
    minifySyntax: false,
    minifyIdentifiers: false,
  }),
  Padrao: Object.freeze({
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: false,
  }),
  Maximo: Object.freeze({
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: true,
  }),
});

function diagnostic(code, message, severity = 'error') {
  return { code, message, severity };
}

export class EsbuildMinifier extends Minifier {
  constructor({ definition, engine = defaultEsbuild } = {}) {
    super({
      id: definition?.id ?? 'esbuild',
      name: definition?.name ?? 'esbuild',
      version: definition?.version ?? engine.version,
      supportedTypes: definition?.supportedTypes ?? [MINIFIER_TYPES.JAVASCRIPT, MINIFIER_TYPES.CSS],
    });
    this.engine = engine;
  }

  validateInstallation() {
    const hasApi = typeof this.engine?.transform === 'function' && typeof this.engine?.version === 'string';
    const versionMatches = hasApi && this.engine.version === this.version;
    const valid = hasApi && versionMatches;
    this._diagnostics = valid ? [] : [diagnostic(
      !hasApi ? 'INSTALLATION_INVALID' : 'ENGINE_VERSION_MISMATCH',
      !hasApi
        ? 'A instalação do esbuild não expõe transform e versão válidos.'
        : `A versão instalada do esbuild (${this.engine.version}) não corresponde à versão homologada (${this.version}).`,
    )];
    return { valid, diagnostics: this.getDiagnostics() };
  }

  getCapabilities() {
    return {
      supportedTypes: [...this.supportedTypes],
      profiles: [...SUPPORTED_PROFILES],
      bundling: false,
      propertyMangling: false,
      experimentalTransforms: false,
    };
  }

  validateConfiguration({ type, profile, engineId, bundle, propertyMangle } = {}) {
    const diagnostics = [];
    if (engineId !== undefined && engineId !== this.id) {
      diagnostics.push(diagnostic('INVALID_ENGINE', `A configuração solicita o motor '${engineId}', mas este adapter é '${this.id}'.`));
    }
    if (!this.supportedTypes.includes(type)) {
      diagnostics.push(diagnostic('UNSUPPORTED_TYPE', `O tipo '${type}' não é suportado por este adapter.`));
    }
    if (!SUPPORTED_PROFILES.includes(profile)) {
      diagnostics.push(diagnostic('INVALID_PROFILE', `O perfil '${profile}' não é permitido.`));
    } else if (profile === 'Personalizado') {
      diagnostics.push(diagnostic('PROFILE_OPTIONS_PENDING', 'O perfil Personalizado permanece bloqueado até que seu schema de opções seja aprovado.'));
    }
    if (bundle === true) {
      diagnostics.push(diagnostic('BUNDLING_UNSUPPORTED', 'Bundling não é suportado na versão 1.'));
    }
    if (propertyMangle === true) {
      diagnostics.push(diagnostic('PROPERTY_MANGLING_UNSUPPORTED', 'Property mangling não é habilitado na versão 1.'));
    }
    this._diagnostics = normalizeDiagnostics(diagnostics);
    return { valid: diagnostics.length === 0, diagnostics: this.getDiagnostics() };
  }

  translateProfile(profile) {
    if (profile === 'Personalizado') {
      throw new MinifierError(
        'PROFILE_OPTIONS_PENDING',
        'O perfil Personalizado permanece bloqueado até que seu schema de opções seja aprovado.',
        [diagnostic('PROFILE_OPTIONS_PENDING', 'As opções do perfil Personalizado ainda não foram especificadas.')],
      );
    }
    const options = PROFILE_OPTIONS[profile];
    if (!options) {
      throw new MinifierError('INVALID_PROFILE', `O perfil '${profile}' não é permitido.`);
    }
    return { ...options };
  }

  async minify({ type, profile, source, engineId } = {}) {
    const validation = this.validateConfiguration({ type, profile, engineId });
    if (!validation.valid) {
      this._diagnostics = validation.diagnostics;
      throw new MinifierError('INVALID_MINIFIER_CONFIGURATION', 'A configuração do adapter não foi aprovada.', validation.diagnostics);
    }
    if (typeof source !== 'string' || source.length === 0) {
      const emptyDiagnostic = diagnostic('EMPTY_SOURCE', 'A fonte para minificação deve ser texto não vazio.');
      this._diagnostics = [emptyDiagnostic];
      throw new MinifierError('EMPTY_SOURCE', emptyDiagnostic.message, [emptyDiagnostic]);
    }
    const installation = this.validateInstallation();
    if (!installation.valid) {
      throw new MinifierError('INSTALLATION_INVALID', 'A instalação do esbuild não foi validada.', installation.diagnostics);
    }

    const profileOptions = this.translateProfile(profile);
    const loader = type === MINIFIER_TYPES.JAVASCRIPT ? 'js' : 'css';
    try {
      const transformed = await this.engine.transform(source, {
        loader,
        ...profileOptions,
        sourcemap: false,
      });
      const output = transformed.code;
      if (typeof output !== 'string' || output.length === 0) {
        const emptyOutput = diagnostic('EMPTY_OUTPUT', 'O esbuild produziu uma saída vazia.');
        this._diagnostics = [emptyOutput];
        throw new MinifierError('EMPTY_OUTPUT', emptyOutput.message, [emptyOutput]);
      }
      this._diagnostics = normalizeDiagnostics((transformed.warnings ?? []).map((warning) => ({
        code: 'ENGINE_WARNING',
        severity: 'warning',
        message: warning.text,
      })));
      return normalizeMinifierResult({ type, profile, source, output, diagnostics: this._diagnostics });
    } catch (error) {
      if (error instanceof MinifierError) throw error;
      const failure = diagnostic('MINIFICATION_FAILED', error?.message ?? 'Falha desconhecida durante a minificação.');
      this._diagnostics = [failure];
      throw new MinifierError('MINIFICATION_FAILED', failure.message, [failure]);
    }
  }
}
