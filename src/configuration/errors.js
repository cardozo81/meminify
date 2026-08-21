export class ConfigurationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ConfigurationError';
    this.code = code;
    this.details = details;
  }
}
