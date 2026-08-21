export class ScannerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ScannerError';
    this.code = code;
    this.details = details;
  }
}
