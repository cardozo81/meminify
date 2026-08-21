import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapEnvironment } from '../runtime/environment.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const promptForInstall = async ({ policy, reason }) => {
  const readline = createInterface({ input, output });
  try {
    output.write(`Node.js não homologado ou indisponível (${reason.message}).\n`);
    output.write(`Autorizar instalação de Node.js ${policy.approvedAutomaticInstallVersion} via winget? (s/N): `);
    return (await readline.question('')).trim().toLowerCase() === 's';
  } finally {
    readline.close();
  }
};

const result = await bootstrapEnvironment({ projectRoot, authorizeNodeInstall: promptForInstall });
if (!result.ok) {
  console.error(`Bootstrap bloqueado: ${result.message}`);
  process.exitCode = 1;
} else if (process.argv.includes('--bootstrap-only')) {
  console.log(result.message);
} else {
  console.log(result.message);
  const futureEntry = join(projectRoot, 'src', 'app', 'index.mjs');
  if (existsSync(futureEntry)) {
    await import(futureEntry);
  } else {
    console.log('Menu da aplicação ainda não implementado; encerrando após validar o ambiente.');
  }
}
