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

A política de runtime planejada fica em `resources/runtime-policy.json`.

O bootstrap conceitual é:

`verificar Node` → `validar LTS homologada` → `validar npm` → `validar package/lock` → `validar dependências` → `carregar configuração` → `menu`

Se Node.js estiver ausente e o winget estiver disponível, a instalação interativa de uma LTS aprovada pode ser oferecida. A instalação exige autorização explícita. Depois dela, o sistema deve redescobrir Node.js e `PATH` e validar o runtime; o código de saída do winget, isoladamente, não comprova sucesso.

## Dependências

- Dependências são locais ao projeto.
- `package.json` e `package-lock.json` são autoritativos.
- A instalação deve ser reproduzível.
- Instalações globais são proibidas.
- Não deve haver atualização automática para a versão mais recente.
- A inicialização normal deve usar verificações leves.
- A inicialização normal não consulta a internet, executa `npm ci`, atualiza Node.js ou atualiza esbuild a cada uso.
