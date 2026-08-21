# Meminify

Status atual: interface interativa, minificação transacional, restauração manual segura, logs, relatórios e documentação offline.

O Meminify tem como objetivo oferecer minificação segura e controlada de arquivos JavaScript e CSS. O projeto é direcionado ao Windows, com interface interativa planejada em PowerShell e execução baseada em Node.js.

As exigências autoritativas do produto ficam em [`Especificacoes/`](Especificacoes/). O desenvolvimento é incremental e assistido por IA, com mudanças pequenas, explícitas e validadas.

No fluxo atual, uma única pessoa trabalha diretamente na branch `main`. Git registra histórico, pontos de recuperação e marcos úteis; não há branches por tarefa nem pull requests automáticos.

## Navegação

- [`Especificacoes/`](Especificacoes/): fonte autoritativa de requisitos e decisões.
- [`_ias/INDEX.md`](_ias/INDEX.md): roteador de contexto para agentes de IA.
- [`_ias/MAPA-CODIGO.md`](_ias/MAPA-CODIGO.md): mapa evolutivo da implementação.
- [`CHANGELOG.md`](CHANGELOG.md): alterações relevantes do projeto.
- [`Documentacao/Fonte/`](Documentacao/Fonte/): fontes Markdown dos manuais.

Use `Executar.ps1` para iniciar o menu PowerShell. Para gerar os manuais HTML offline, execute `npm.cmd run build:docs`; as fontes Markdown são autoritativas e os arquivos gerados ficam em `Documentacao/Gerada`.

Já existem domínio/configuração, adapter esbuild, scanner read-only, integridade SHA-256, execução transacional, bootstrap Windows, menu PowerShell, restauração manual, logs e relatórios. O algoritmo final de risco de execução, o perfil `Personalizado`, retenção automática, empacotamento e release permanecem pendentes.
