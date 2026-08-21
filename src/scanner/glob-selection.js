import micromatch from 'micromatch';
import { ScannerError } from './errors.js';

function compilePatterns(patterns, scope) {
  if (!Array.isArray(patterns)) {
    throw new ScannerError('INVALID_PATTERNS', `Os padrões de ${scope} devem ser uma lista.`);
  }
  try {
    return patterns.map((pattern) => ({
      pattern,
      matcher: micromatch.matcher(pattern, { basename: true, dot: true }),
    }));
  } catch (error) {
    throw new ScannerError('INVALID_GLOB_PATTERN', `O padrão de glob em ${scope} é inválido.`, {
      scope,
      cause: error,
    });
  }
}

function matchesAny(compiledPatterns, relativePath) {
  return compiledPatterns.some(({ matcher }) => matcher(relativePath));
}

export function createSelectionMatcher({ globalIncludes, globalExcludes, sourceIncludes, sourceExcludes, mode }) {
  const globalIncludeMatchers = compilePatterns(globalIncludes, 'inclusões globais');
  const globalExcludeMatchers = compilePatterns(globalExcludes, 'exclusões globais');
  const sourceIncludeMatchers = compilePatterns(sourceIncludes, 'inclusões da origem');
  const sourceExcludeMatchers = compilePatterns(sourceExcludes, 'exclusões da origem');
  const includeScopes = [globalIncludeMatchers, sourceIncludeMatchers].filter((scope) => scope.length > 0);

  return (relativePath) => {
    if (matchesAny(globalExcludeMatchers, relativePath) || matchesAny(sourceExcludeMatchers, relativePath)) {
      return { eligible: false, reason: 'EXCLUDED_BY_PATTERN' };
    }
    if (mode === 'Selecionados' && includeScopes.length === 0) {
      return { eligible: false, reason: 'NO_SELECTION_PATTERN' };
    }
    if (includeScopes.some((scope) => !matchesAny(scope, relativePath))) {
      return { eligible: false, reason: 'NOT_INCLUDED_BY_PATTERN' };
    }
    return { eligible: true };
  };
}
