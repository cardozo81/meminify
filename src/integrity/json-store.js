import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { TextDecoder } from 'node:util';
import { IntegrityError } from './errors.js';

const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

export async function readJsonUtf8(filePath, kind) {
  let bytes;
  try {
    bytes = await readFile(filePath);
  } catch (cause) {
    throw new IntegrityError(`${kind}_READ_FAILED`, `Não foi possível ler ${filePath}.`, { filePath, cause });
  }

  let text;
  try {
    text = UTF8_DECODER.decode(bytes);
  } catch (cause) {
    throw new IntegrityError(`${kind}_INVALID_UTF8`, `O arquivo não contém UTF-8 válido: ${filePath}.`, { filePath, cause });
  }

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new IntegrityError(`${kind}_INVALID_JSON`, `O arquivo contém JSON inválido: ${filePath}.`, { filePath, cause });
  }
}

export async function writeJsonUtf8Atomic(filePath, value, kind) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporaryPath, 'wx');
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
  } catch (cause) {
    await handle?.close().catch(() => {});
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw new IntegrityError(`${kind}_WRITE_FAILED`, `Não foi possível persistir ${filePath} com segurança.`, { filePath, cause });
  }
}
