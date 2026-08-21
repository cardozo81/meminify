import { extname } from 'node:path';
import { collectSourceEntries, isTechnicalExclusion, normalizeAbsolutePath } from './filesystem.js';
import { ScannerError } from './errors.js';
import { createSelectionMatcher } from './glob-selection.js';
import { resolveRuntimePaths } from '../runtime/paths.js';

const SUPPORTED_FILE_TYPES = Object.freeze({
  '.js': 'javascript',
  '.css': 'css',
});

function sortItems(items) {
  return items.sort((left, right) => (
    left.normalizedPath.localeCompare(right.normalizedPath) || String(left.sourceId).localeCompare(String(right.sourceId)) || String(left.reason ?? '').localeCompare(String(right.reason ?? ''))
  ));
}

function baseItem(event, fileType) {
  return {
    normalizedPath: event.normalizedPath ?? normalizeAbsolutePath(event.path),
    relativePath: event.relativePath ?? '',
    sourceId: event.sourceId,
    fileType,
  };
}

function ignoredItem(event, fileType, reason, extra = {}) {
  return {
    ...baseItem(event, fileType),
    status: 'ignored',
    reason,
    ...extra,
  };
}

export async function scan(configuration, options = {}) {
  const temporaryDirectory = options.temporaryDirectory
    ?? resolveRuntimePaths(options.runtimeRoot).temporaryDirectory;
  if (!configuration || !Array.isArray(configuration.sources)) {
    throw new ScannerError('INVALID_CONFIGURATION', 'A configuração efetiva precisa conter uma lista de origens.');
  }

  const result = {
    discovered: [],
    eligible: [],
    ignored: [],
    warnings: [],
    errors: [],
  };
  const seenIdentities = new Map();

  for (const source of configuration.sources) {
    const selection = createSelectionMatcher({
      globalIncludes: configuration.globalIncludes ?? [],
      globalExcludes: configuration.globalExcludes ?? [],
      sourceIncludes: source.includes ?? [],
      sourceExcludes: source.excludes ?? [],
      mode: source.mode,
    });
    const events = await collectSourceEntries(source, { temporaryDirectory });

    for (const event of events) {
      if (event.kind === 'source-error' || event.kind === 'error') {
        result.errors.push({
          normalizedPath: event.path,
          sourceId: event.sourceId,
          status: 'error',
          reason: event.reason,
          message: event.error?.message ?? 'A origem ou caminho não pôde ser acessado.',
        });
        continue;
      }
      if (event.kind === 'link') {
        const item = ignoredItem(event, event.fileType, 'LINK_IGNORED', { target: event.target });
        result.discovered.push(item);
        result.ignored.push(item);
        continue;
      }
      if (event.kind === 'technical-exclusion') {
        const item = ignoredItem(event, event.fileType, event.reason);
        result.discovered.push(item);
        result.ignored.push(item);
        continue;
      }
      if (event.kind === 'unsupported-entry') {
        const item = ignoredItem(event, event.fileType, 'UNSUPPORTED_FILESYSTEM_ENTRY');
        result.discovered.push(item);
        result.ignored.push(item);
        continue;
      }
      if (event.kind !== 'file') continue;

      const extension = extname(event.normalizedPath).toLowerCase();
      const fileType = SUPPORTED_FILE_TYPES[extension];
      const discovered = baseItem(event, fileType ?? 'unknown');
      result.discovered.push(discovered);

      if (!fileType) {
        result.ignored.push(ignoredItem(event, 'unknown', 'UNSUPPORTED_EXTENSION'));
        continue;
      }
      if (event.readonly) {
        result.ignored.push(ignoredItem(event, fileType, 'READONLY_FILE'));
        continue;
      }
      if (isTechnicalExclusion(event.normalizedPath, temporaryDirectory)) {
        result.ignored.push(ignoredItem(event, fileType, 'MANDATORY_TECHNICAL_EXCLUSION'));
        continue;
      }
      const selectionResult = selection(event.relativePath);
      if (!selectionResult.eligible) {
        result.ignored.push(ignoredItem(event, fileType, selectionResult.reason));
        continue;
      }
      if (seenIdentities.has(event.identity)) {
        result.ignored.push(ignoredItem(event, fileType, 'DUPLICATE_PHYSICAL_FILE', {
          firstSourceId: seenIdentities.get(event.identity),
        }));
        continue;
      }
      seenIdentities.set(event.identity, source.id);
      result.eligible.push({ ...discovered, status: 'eligible' });
    }
  }

  sortItems(result.discovered);
  sortItems(result.eligible);
  sortItems(result.ignored);
  result.errors.sort((left, right) => left.normalizedPath.localeCompare(right.normalizedPath));
  return result;
}

export { ScannerError } from './errors.js';
export { createSelectionMatcher } from './glob-selection.js';
