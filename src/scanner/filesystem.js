import { access, constants, lstat, readdir, readlink, realpath } from 'node:fs/promises';
import { basename, join, normalize, resolve, sep } from 'node:path';
import { ScannerError } from './errors.js';

const TECHNICAL_DIRECTORY_NAMES = new Set(['node_modules', '.git', '_source_versions']);

export function normalizeAbsolutePath(filePath) {
  return normalize(resolve(filePath));
}

function pathIdentity(filePath) {
  const normalized = normalizeAbsolutePath(filePath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function pathParts(filePath) {
  return normalizeAbsolutePath(filePath).split(/[\\/]+/).filter(Boolean).map((part) => (
    process.platform === 'win32' ? part.toLowerCase() : part
  ));
}

function isInsideOrSame(candidate, directory) {
  const candidateIdentity = pathIdentity(candidate);
  const directoryIdentity = pathIdentity(directory);
  return candidateIdentity === directoryIdentity || candidateIdentity.startsWith(`${directoryIdentity}${sep}`);
}

function hasTechnicalDirectoryName(filePath) {
  return pathParts(filePath).some((part) => TECHNICAL_DIRECTORY_NAMES.has(part));
}

export function isTechnicalExclusion(filePath, temporaryDirectory) {
  return hasTechnicalDirectoryName(filePath)
    || (temporaryDirectory !== undefined && isInsideOrSame(filePath, temporaryDirectory));
}

async function safeLinkTarget(filePath) {
  try {
    return await readlink(filePath);
  } catch {
    return undefined;
  }
}

async function isReadonlyFile(filePath, stats) {
  if ((stats.mode & 0o222) === 0) return true;
  try {
    await access(filePath, constants.W_OK);
    return false;
  } catch {
    return true;
  }
}

async function createFileEvent(filePath, relativePath, source, stats) {
  const identityPath = await realpath(filePath).catch(() => filePath);
  return {
    kind: 'file',
    path: filePath,
    normalizedPath: normalizeAbsolutePath(filePath),
    identity: pathIdentity(identityPath),
    relativePath: relativePath.replaceAll('\\', '/'),
    sourceId: source.id,
    readonly: await isReadonlyFile(filePath, stats),
  };
}

async function inspectPath(filePath, relativePath, source, options) {
  let stats;
  try {
    stats = await lstat(filePath);
  } catch (error) {
    return [{
      kind: 'error',
      path: normalizeAbsolutePath(filePath),
      relativePath,
      sourceId: source.id,
      reason: 'INACCESSIBLE_PATH',
      error,
    }];
  }

  if (stats.isSymbolicLink()) {
    return [{
      kind: 'link',
      path: normalizeAbsolutePath(filePath),
      relativePath,
      sourceId: source.id,
      fileType: process.platform === 'win32' ? 'symlink-or-junction' : 'symlink',
      target: await safeLinkTarget(filePath),
    }];
  }

  if (isTechnicalExclusion(filePath, options.temporaryDirectory)) {
    return [{
      kind: 'technical-exclusion',
      path: normalizeAbsolutePath(filePath),
      relativePath,
      sourceId: source.id,
      fileType: stats.isDirectory() ? 'directory' : 'file',
      reason: 'MANDATORY_TECHNICAL_EXCLUSION',
    }];
  }

  if (stats.isFile()) return [await createFileEvent(filePath, relativePath, source, stats)];
  if (!stats.isDirectory()) {
    return [{
      kind: 'unsupported-entry',
      path: normalizeAbsolutePath(filePath),
      relativePath,
      sourceId: source.id,
      fileType: 'other',
    }];
  }

  if (!source.recursive && relativePath !== '') return [];

  let names;
  try {
    names = (await readdir(filePath)).sort((left, right) => left.localeCompare(right));
  } catch (error) {
    return [{
      kind: 'error',
      path: normalizeAbsolutePath(filePath),
      relativePath,
      sourceId: source.id,
      reason: 'INACCESSIBLE_DIRECTORY',
      error,
    }];
  }

  const events = [];
  for (const name of names) {
    const childRelativePath = relativePath ? join(relativePath, name) : name;
    events.push(...await inspectPath(join(filePath, name), childRelativePath, source, options));
  }
  return events;
}

export async function collectSourceEntries(source, { temporaryDirectory } = {}) {
  if (!source || !source.id || !source.path || !source.type) {
    throw new ScannerError('INVALID_SOURCE', 'A origem precisa de id, caminho e tipo normalizados.');
  }
  const sourcePath = normalizeAbsolutePath(source.path);
  let stats;
  try {
    stats = await lstat(sourcePath);
  } catch (error) {
    return [{
      kind: 'source-error',
      path: sourcePath,
      sourceId: source.id,
      reason: 'SOURCE_MISSING_OR_INACCESSIBLE',
      error,
    }];
  }

  if (stats.isSymbolicLink()) {
    return [{
      kind: 'link',
      path: sourcePath,
      relativePath: basename(sourcePath),
      sourceId: source.id,
      fileType: process.platform === 'win32' ? 'symlink-or-junction' : 'symlink',
      target: await safeLinkTarget(sourcePath),
    }];
  }
  if (source.type === 'Diretorio' && !stats.isDirectory()) {
    return [{ kind: 'source-error', path: sourcePath, sourceId: source.id, reason: 'SOURCE_TYPE_MISMATCH' }];
  }
  if (source.type === 'Arquivo' && !stats.isFile()) {
    return [{ kind: 'source-error', path: sourcePath, sourceId: source.id, reason: 'SOURCE_TYPE_MISMATCH' }];
  }

  return inspectPath(sourcePath, source.type === 'Arquivo' ? basename(sourcePath) : '', source, {
    temporaryDirectory,
  });
}
