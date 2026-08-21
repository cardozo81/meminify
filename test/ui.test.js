import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('UI explicita cancelamento, entrada inválida e recursos indisponíveis', async () => {
  const source = await readFile(new URL('../src/app/ui.ps1', import.meta.url), 'utf8');
  assert.match(source, /Opção inválida; nenhuma ação foi executada/);
  assert.match(source, /Execução cancelada; nenhum arquivo foi alterado/);
  assert.match(source, /Backups e restauração ainda não disponível/);
  assert.match(source, /Relatórios ainda não disponível/);
  assert.match(source, /Visualizador de logs técnicos ainda não disponível/);
  assert.match(source, /Invoke-MeminifyBridge/);
});
