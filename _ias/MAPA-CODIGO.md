# Mapa do código

Este mapa registra somente arquivos que existem e suas responsabilidades reais.

## Fundação Node.js

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `package.json` | Metadados, modo ES module, scripts e dependência declarada | `ini@7.0.0` |
| `package-lock.json` | Lockfile reproduzível das dependências | npm |
| `Configuracao/configuracao.ini.example` | Exemplo versionado da estrutura de configuração aprovada | Especificação 06 |

## Domínio e configuração

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `src/domain/index.js` | Constantes de perfis, modos, tipos, riscos e default aprovado | Nenhuma |
| `src/configuration/errors.js` | Erro estruturado de configuração e códigos diagnósticos | Nenhuma |
| `src/configuration/utf8.js` | Leitura de arquivo com decodificação UTF-8 fatal | Node.js `fs/promises`, `util` |
| `src/configuration/parse.js` | Pré-detecção de duplicatas, parsing estrutural, listas numeradas e normalização INI | `ini@7.0.0` |
| `src/configuration/validate.js` | Validação de domínio e conjunto de motores homologados injetado | `src/domain/index.js` |
| `src/configuration/index.js` | API de carregamento, parsing e configuração efetiva temporária imutável | Módulos de configuração |

## Qualidade e testes

| Arquivo | Responsabilidade | Dependências relevantes |
| --- | --- | --- |
| `scripts/quality/check-encoding.mjs` | Validação estrita de UTF-8 e sequências conhecidas de mojibake, ignorando dependências e saídas | Node.js built-ins |
| `test/configuration.test.js` | Testes focados de domínio, INI, validação e configuração efetiva | `node:test`, módulos de configuração |
| `test/encoding.test.js` | Testes focados de texto UTF-8 e detecção de mojibake | `node:test`, script de encoding |

Scanner, glob, adaptadores, minificação, backup, estado, interface e distribuição ainda não existem; não são representados como placeholders neste mapa.
