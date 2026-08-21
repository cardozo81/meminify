export const MINIFIER_TYPES = Object.freeze({
  JAVASCRIPT: 'javascript',
  CSS: 'css',
});

export const MINIFIER_STATUSES = Object.freeze({
  SUCCESS: 'success',
});

export class MinifierError extends Error {
  constructor(code, message, diagnostics = []) {
    super(message);
    this.name = 'MinifierError';
    this.code = code;
    this.diagnostics = normalizeDiagnostics(diagnostics);
  }
}

export function normalizeDiagnostics(diagnostics = []) {
  return diagnostics.map((diagnostic) => ({
    code: String(diagnostic.code ?? 'MINIFIER_DIAGNOSTIC'),
    severity: String(diagnostic.severity ?? 'error'),
    message: String(diagnostic.message ?? diagnostic.text ?? diagnostic),
  }));
}

export function normalizeMinifierResult({ type, profile, source, output, diagnostics = [] }) {
  const originalSize = Buffer.byteLength(source, 'utf8');
  const outputSize = Buffer.byteLength(output, 'utf8');
  const reductionBytes = originalSize - outputSize;
  const reductionPercent = originalSize === 0 ? 0 : (reductionBytes / originalSize) * 100;

  return {
    status: MINIFIER_STATUSES.SUCCESS,
    type,
    profile,
    output,
    originalSize,
    outputSize,
    reductionBytes,
    reductionPercent,
    diagnostics: normalizeDiagnostics(diagnostics),
  };
}

export class Minifier {
  constructor({ id, name, version, supportedTypes }) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.supportedTypes = Object.freeze([...supportedTypes]);
    this._diagnostics = [];
  }

  validateInstallation() {
    throw new MinifierError('CONTRACT_NOT_IMPLEMENTED', 'O adapter não implementou a validação de instalação.');
  }

  getCapabilities() {
    throw new MinifierError('CONTRACT_NOT_IMPLEMENTED', 'O adapter não implementou a consulta de capacidades.');
  }

  validateConfiguration() {
    throw new MinifierError('CONTRACT_NOT_IMPLEMENTED', 'O adapter não implementou a validação de configuração.');
  }

  minify() {
    throw new MinifierError('CONTRACT_NOT_IMPLEMENTED', 'O adapter não implementou a minificação.');
  }

  getDiagnostics() {
    return normalizeDiagnostics(this._diagnostics);
  }
}
