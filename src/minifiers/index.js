import { createMinifierRegistry } from './registry.js';
import { EsbuildMinifier } from './esbuild-adapter.js';

export * from './minifier.js';
export * from './registry.js';
export * from './esbuild-adapter.js';

export function createDefaultMinifierRegistry({ engine } = {}) {
  return createMinifierRegistry({
    adapters: new Map([
      ['esbuild', (definition) => new EsbuildMinifier({ definition, engine })],
    ]),
  });
}
