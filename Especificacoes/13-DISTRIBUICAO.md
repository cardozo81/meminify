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

## Layout aprovado do pacote local

`package.json` é a autoridade única de versão. O pacote usa a raiz versionada `dist\Meminify-<version>\` e gera `dist\Meminify-<version>.zip` e `dist\Meminify-<version>.zip.sha256`.

A montagem usa allowlist e preserva os caminhos relativos do runtime:

```text
Meminify-<version>\
  Executar.ps1
  package.json
  package-lock.json
  README.md
  CHANGELOG.md
  Configuracao\configuracao.ini.example
  src\
  resources\
  Documentacao\Gerada\Manual-Usuario\index.html
  Documentacao\Gerada\Manual-Tecnico\index.html
```

`src\` contém somente módulos JavaScript, MJS e PowerShell; `resources\` contém somente JSON requerido pelo runtime. `node_modules` não é distribuído: o bootstrap usa os manifestos bloqueados para instalação local reproduzível quando necessária. O ZIP contém exatamente uma raiz `Meminify-<version>/`.

O checksum usa SHA-256 em texto convencional: hash hexadecimal minúsculo, dois espaços e o nome do ZIP.

## Identidade de versão

`package.json` é a fonte única da versão SemVer. A identidade validada mantém a invariância `package.json.version = Meminify-<version> = Meminify-<version>.zip = Meminify-<version>.zip.sha256 = futura tag v<version> = futura versão do GitHub Release`. A futura publicação deve reutilizar exatamente o ZIP e o checksum validados localmente. Tags publicadas são imutáveis; conteúdo alterado exige nova versão. Esta tarefa não cria tag nem release.

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

Versões exatas de dependências futuras continuam sendo decididas quando cada dependência for introduzida.
