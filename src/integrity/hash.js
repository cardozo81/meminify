import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { IntegrityError } from './errors.js';

export function hashFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('error', (cause) => reject(new IntegrityError(
      'FILE_HASH_FAILED',
      `Não foi possível calcular o SHA-256 do arquivo: ${filePath}.`,
      { filePath, cause },
    )));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
