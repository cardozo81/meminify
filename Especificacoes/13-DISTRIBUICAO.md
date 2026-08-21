# Distribuição

## Entrada de publicação local

O lançador local planejado é `publicar.cmd`. Ele deve apenas delegar para:

`scripts\release\publicar.ps1`

CMD não contém a lógica de empacotamento.

## Pipeline fail-closed

O empacotamento local futuro deve bloquear em qualquer prova insuficiente e percorrer:

1. validação do ambiente;
2. validação da versão;
3. validação do worktree, quando aplicável;
4. validação de UTF-8 e mojibake;
5. validação de `package.json` e `package-lock.json`;
6. testes apropriados ao pacote;
7. build da documentação HTML;
8. montagem limpa do pacote;
9. validação do pacote montado;
10. geração do ZIP;
11. cálculo de SHA-256.

Artefatos gerados ficam em `dist\`.

## Exclusões da distribuição

O pacote não deve incluir conteúdo exclusivo de desenvolvimento ou dados locais, incluindo:

- `.git` e `.github`;
- `_ias` e `Especificacoes`;
- testes e fixtures;
- scripts exclusivos de desenvolvimento;
- logs, relatórios e estado locais;
- configuração pessoal do desenvolvedor;
- `dist` anterior;
- `node_modules` de desenvolvimento.

A composição final deve ser construída em destino limpo e validada antes da compactação.

## Separação de operações

Empacotamento local e publicação de GitHub Release são operações independentes. A automação futura de GitHub Release não pode ser incorporada ao processo que gera o pacote local.

O layout final detalhado e as versões exatas das dependências permanecem pendentes em `15-DECISOES.md`.
