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

## Qualidade e testes

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `scripts/quality/check-encoding.mjs` | Validação estrita de UTF-8 e sequências conhecidas de mojibake, ignorando dependências e saídas | Node.js built-ins |
| `test/configuration.test.js` | Testes focados de domínio, INI, validação e configuração efetiva | `node:test`, módulos de configuração |
| `test/encoding.test.js` | Testes focados de texto UTF-8 e detecção de mojibake | `node:test`, script de encoding |
| `test/minifiers.test.js` | Testes focados de registry, adapter, perfis, JS, CSS e resultados neutros | `node:test`, adapter esbuild |
| `test/scanner.test.js` | Testes focados de recursão, glob, exclusões, links, readonly e deduplicação | `node:test`, módulos do scanner |

Backup, estado, interface, execução orquestrada e distribuição ainda não existem; não são representados como placeholders neste mapa.
