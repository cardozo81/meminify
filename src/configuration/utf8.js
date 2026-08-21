import { readFile } from 'node:fs/promises';
import { TextDecoder } from 'node:util';
import { ConfigurationError } from './errors.js';

const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

export async function readUtf8File(filePath) {
  const bytes = await readFile(filePath);

  try {
    return UTF8_DECODER.decode(bytes);
  } catch (error) {
    throw new ConfigurationError(
      'INVALID_UTF8',
      `O arquivo de configuração não está em UTF-8 válido: ${filePath}.`,
      { filePath, cause: error },
    );
  }
}
