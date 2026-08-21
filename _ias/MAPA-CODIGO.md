# Mapa do código

Este mapa registra somente arquivos que existem e suas responsabilidades reais.

## Fundação Node.js

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `package.json` | Metadados, modo ES module, scripts e dependências declaradas | `ini@7.0.0`, `esbuild@0.28.2`, `micromatch@4.0.8` |
| `package-lock.json` | Lockfile reproduzível das dependências | npm |
| `Configuracao/configuracao.ini.example` | Exemplo versionado da estrutura de configuração aprovada | Especificação 06 |
| `resources/minifier-registry.json` | Registro estático dos motores homologados da versão 1 | Especificação 07 |

## Domínio e configuração

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `src/domain/index.js` | Constantes de perfis, modos, tipos e default aprovado | Nenhuma |
| `src/configuration/errors.js` | Erro estruturado de configuração e códigos diagnósticos | Nenhuma |
| `src/configuration/utf8.js` | Leitura de arquivo com decodificação UTF-8 fatal | Node.js `fs/promises`, `util` |
| `src/configuration/parse.js` | Pré-detecção de duplicatas, parsing estrutural, listas numeradas e normalização INI | `ini@7.0.0` |
| `src/configuration/validate.js` | Validação de domínio e conjunto de motores homologados injetado | `src/domain/index.js` |
| `src/configuration/index.js` | API de carregamento, parsing e configuração efetiva temporária imutável | Módulos de configuração |

## Minificação

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `src/minifiers/minifier.js` | Contrato neutro, resultados e diagnósticos normalizados | Node.js `Buffer` |
| `src/minifiers/registry.js` | Leitura e validação do registry homologado, sem pacotes arbitrários | `resources/minifier-registry.json` |
| `src/minifiers/esbuild-adapter.js` | Validação, capabilities, tradução de perfis e transformação JS/CSS | `esbuild@0.28.2` |
| `src/minifiers/index.js` | Composição da registry padrão com o adapter esbuild | Módulos de minificação |

## Scanner

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `src/scanner/errors.js` | Erros estruturados do scanner | Nenhuma |
| `src/scanner/glob-selection.js` | Compilação de includes/excludes e modos de seleção | `micromatch@4.0.8` |
| `src/scanner/filesystem.js` | Descoberta read-only, exclusões técnicas, links, permissões e identidades físicas | Node.js `fs/promises`, `path` |
| `src/scanner/index.js` | Contrato neutro de resultados, classificação JS/CSS, deduplicação e diagnósticos | Módulos do scanner |

## Runtime e integridade

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `src/runtime/paths.js` | Caminhos técnicos normativos relativos ao runtime | Node.js `path` |
| `src/runtime/policy.js` | Leitura e validação da política Node.js homologada | `resources/runtime-policy.json` |
| `src/runtime/dependencies.js` | Validação de package/lock e dependências locais | Node.js `fs/promises` |
| `src/runtime/environment.js` | Descoberta/validação de Node/npm e instalação autorizada via winget | Node.js `child_process`, módulos runtime |
| `src/integrity/errors.js` | Erros estruturados de integridade | Nenhuma |
| `src/integrity/hash.js` | SHA-256 incremental de arquivos | Node.js `crypto`, `fs` |
| `src/integrity/json-store.js` | Leitura UTF-8 estrita e persistência JSON por arquivo temporário e rename | Node.js built-ins |
| `src/integrity/schema.js` | Validação dos registros técnicos e entradas de manifesto | Módulos de integridade |
| `src/integrity/state.js` | Validação e persistência de `Dados/estado.json` | Módulos de integridade |
| `src/integrity/manifest.js` | Criação, validação e persistência do manifesto de backup | Módulos de integridade |
| `src/integrity/backup.js` | Mapeamento, cópia e validação SHA-256 do backup de fontes | Node.js `fs/promises`, `path` |
| `src/integrity/index.js` | API pública da fundação de integridade | Módulos de integridade |

## Pré-análise e execução transacional

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `src/execution/errors.js` | Erros estruturados de planejamento, execução e recuperação | Nenhuma |
| `src/execution/planner.js` | Pré-análise imutável, destinos `.min`, conflitos, hashes e autorizações exigidas | Scanner, domínio e integridade |
| `src/execution/journal.js` | Schema e persistência do journal write-ahead da última execução | Integridade e domínio |
| `src/execution/filesystem.js` | Criação/substituição exata, cópias de recuperação e provas SHA-256 | Node.js built-ins, integridade |
| `src/execution/recovery.js` | Rollback exato e recuperação determinística de execução interrompida | Journal, estado e filesystem transacional |
| `src/execution/executor.js` | Coordenação dos dois modos, minificação, estado, manifesto e rollback | Minificador, integridade e execução |
| `src/execution/index.js` | API pública de pré-análise e execução transacional | Módulos de execução |

## Bootstrap Windows

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `Executar.ps1` | Estabelece a raiz, oferece instalação autorizada quando Node falta e inicia o bootstrap Node | Windows PowerShell, `winget.exe` opcional |
| `src/bootstrap/cli.mjs` | Entrada leve do bootstrap, mensagens pt-BR e handoff somente se existir menu futuro | Módulos runtime |
| `resources/runtime-policy.json` | Política versionada de linhas e instalação Node homologadas | Especificação 07 |

## Interface interativa

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `src/app/bridge.mjs` | Bridge JSON fino para resumo, pré-análise, execução e criação segura da configuração | Configuração, scanner e execução |
| `src/app/ui.ps1` | Menu PowerShell, apresentação pt-BR, ajustes temporários e confirmações | `src/app/bridge.mjs` |
| `Executar.ps1` | Bootstrap validado e abertura do menu interativo | `src/bootstrap/cli.mjs`, `src/app/ui.ps1` |

## Observabilidade

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `src/observability/index.mjs` | Logs técnicos UTF-8, relatórios operacionais TXT/CSV e leitura/listagem read-only | Resultados de análise/execução, Node.js `fs/promises` |
| `test/observability.test.js` | Testes focados de logs, relatórios, CSV, falhas, recuperação e leitura read-only | `src/observability/index.mjs`, bridge |
| `test/ui.test.js` | Validação textual mínima dos fluxos PowerShell de listagem, cancelamento e indisponibilidade | `src/app/ui.ps1` |

## Qualidade e testes

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `scripts/quality/check-encoding.mjs` | Validação estrita de UTF-8 e sequências conhecidas de mojibake, ignorando dependências e saídas | Node.js built-ins |
| `test/configuration.test.js` | Testes focados de domínio, INI, validação e configuração efetiva | `node:test`, módulos de configuração |
| `test/encoding.test.js` | Testes focados de texto UTF-8 e detecção de mojibake | `node:test`, script de encoding |
| `test/minifiers.test.js` | Testes focados de registry, adapter, perfis, JS, CSS e resultados neutros | `node:test`, adapter esbuild |
| `test/scanner.test.js` | Testes focados de recursão, glob, exclusões, links, readonly e deduplicação | `node:test`, módulos do scanner |
| `test/integrity.test.js` | Testes focados de SHA-256, estado, manifesto, backup e diretório temporário | `node:test`, módulos de integridade |
| `test/execution.test.js` | Testes focados de pré-análise, write-ahead, conflitos, execução, rollback e interrupção | `node:test`, módulos de execução |
| `test/runtime.test.js` | Testes focados de política Node, package/lock, dependências e bootstrap sem instalação real | `node:test`, módulos runtime |

Restauração manual, retenção automática, análise final de risco e distribuição ainda não existem; não são representados como placeholders neste mapa.
