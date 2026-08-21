# Minificação, motores e runtime

## Contrato neutro

O núcleo consome uma abstração conceitual `Minifier` com:

- `id`
- `name`
- `version`
- `supportedTypes`
- `validateInstallation()`
- `getCapabilities()`
- `validateConfiguration()`
- `minify()`
- `getDiagnostics()`

Somente adaptadores podem conhecer APIs e opções específicas de motores. O núcleo não pode depender diretamente de opções do esbuild.

## Homologação

O motor homologado para a versão 1 é o esbuild, com suporte a JavaScript e CSS e sem bundling.

Nomes arbitrários de pacotes npm não podem ser aceitos como motores. Somente motores implementados, testados, registrados e homologados podem ser selecionados.

O registro planejado é `resources/minifier-registry.json`.

## Perfis

Os perfis expressam intenção funcional neutra. Cada adaptador é responsável por traduzi-los para configurações próprias do motor.

| Perfil | Intenção | Risco próprio do perfil |
| --- | --- | --- |
| `Conservador` | Compatibilidade máxima e transformação mínima | Muito baixo |
| `Padrao` | Equilíbrio inicial recomendado | Baixo |
| `Maximo` | Maior redução dentro dos limites de segurança aprovados | Moderado |
| `Personalizado` | Opções escolhidas explicitamente | Depende das opções selecionadas |

Property mangling, bundling e transformações experimentais nunca devem ser ativados automaticamente. As opções detalhadas do perfil `Personalizado` permanecem pendentes em `15-DECISOES.md`.

A interface deve apresentar separadamente o risco do perfil, o risco estimado da execução e os fatores agravantes, conforme `05-UX-CLI.md`.

## Política de runtime Node.js

Node.js é o runtime. Somente linhas LTS homologadas podem ser aceitas; a linha Current não é aceita automaticamente. As versões LTS exatas ainda dependem de decisão registrada em `15-DECISOES.md`.

A política de runtime homologada fica em `resources/runtime-policy.json`: as linhas major 24 e 22 são aceitas, a linha 24 é preferida e a instalação automática aprovada é exatamente `24.19.0` pelo pacote winget `OpenJS.NodeJS.LTS`. Linhas Current, EOL ou não homologadas falham fechado.

O bootstrap conceitual é:

`verificar Node` → `validar LTS homologada` → `validar npm` → `validar package/lock` → `validar dependências` → `carregar configuração` → `menu`

Se Node.js estiver ausente ou não homologado e o winget estiver disponível, a instalação interativa da versão aprovada pode ser oferecida. A instalação exige autorização explícita. Depois dela, o sistema redescobre Node.js e `PATH` e valida o runtime e o npm; o código de saída do winget, isoladamente, não comprova sucesso.

## Dependências

- Dependências são locais ao projeto.
- `package.json` e `package-lock.json` são autoritativos.
- A instalação deve ser reproduzível.
- Instalações globais são proibidas.
- Não deve haver atualização automática para a versão mais recente.
- Ao invocar npm a partir do PowerShell, deve ser usado `npm.cmd`, evitando interferência da política de execução de scripts.
- A inicialização normal deve usar verificações leves.
- A inicialização normal não consulta a internet, executa `npm ci`, atualiza Node.js ou atualiza esbuild a cada uso.
