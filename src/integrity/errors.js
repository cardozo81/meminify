export class IntegrityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'IntegrityError';
    this.code = code;
    this.details = details;
  }
}
