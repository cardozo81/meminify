import { readFileSync } from 'node:fs';
import { MinifierError } from './minifier.js';

const REGISTRY_URL = new URL('../../resources/minifier-registry.json', import.meta.url);

export function loadMinifierDefinitions() {
  const document = JSON.parse(readFileSync(REGISTRY_URL, 'utf8'));
  if (document.version !== 1 || !Array.isArray(document.engines)) {
    throw new MinifierError('INVALID_REGISTRY', 'O registro de motores homologados não possui a estrutura da versão 1.');
  }
  const ids = new Set();
  for (const definition of document.engines) {
    if (ids.has(definition.id) || definition.homologated !== true) {
      throw new MinifierError('INVALID_REGISTRY', 'O registro contém motores duplicados ou não homologados.');
    }
    if (!definition.id || !definition.version || !Array.isArray(definition.supportedTypes)) {
      throw new MinifierError('INVALID_REGISTRY', 'Cada motor homologado precisa de id, versão e tipos suportados.');
    }
    ids.add(definition.id);
  }
  return document.engines.map((definition) => ({
    id: definition.id,
    name: definition.name,
    version: definition.version,
    supportedTypes: Object.freeze([...definition.supportedTypes]),
  }));
}

export function createMinifierRegistry({ adapters = new Map() } = {}) {
  const definitions = loadMinifierDefinitions();
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const instances = new Map();

  return Object.freeze({
    list() {
      return definitions.map((definition) => ({
        ...definition,
        supportedTypes: [...definition.supportedTypes],
      }));
    },
    has(id) {
      return definitionsById.has(id);
    },
    get(id) {
      const definition = definitionsById.get(id);
      if (!definition) {
        throw new MinifierError('UNKNOWN_ENGINE', `O motor '${id}' não está registrado como homologado.`);
      }
      if (!instances.has(id)) {
        const factory = adapters instanceof Map ? adapters.get(id) : adapters[id];
        if (typeof factory !== 'function') {
          throw new MinifierError('ADAPTER_UNAVAILABLE', `O adapter do motor homologado '${id}' não está disponível.`);
        }
        instances.set(id, factory(definition));
      }
      return instances.get(id);
    },
  });
}
