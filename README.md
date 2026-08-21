# Meminify

Status atual: estruturação inicial e desenvolvimento.

O Meminify tem como objetivo oferecer minificação segura e controlada de arquivos JavaScript e CSS. O projeto é direcionado ao Windows, com interface interativa planejada em PowerShell e execução baseada em Node.js.

As exigências autoritativas do produto ficam em [`Especificacoes/`](Especificacoes/). O desenvolvimento é incremental e assistido por IA, com mudanças pequenas, explícitas e validadas.

No fluxo atual, uma única pessoa trabalha diretamente na branch `main`. Git registra histórico, pontos de recuperação e marcos úteis; não há branches por tarefa nem pull requests automáticos.

## Navegação

- [`Especificacoes/`](Especificacoes/): fonte autoritativa de requisitos e decisões.
- [`_ias/INDEX.md`](_ias/INDEX.md): roteador de contexto para agentes de IA.
- [`_ias/MAPA-CODIGO.md`](_ias/MAPA-CODIGO.md): mapa evolutivo da implementação.
- [`CHANGELOG.md`](CHANGELOG.md): alterações relevantes do projeto.

Já existe a fundação de domínio/configuração, o adapter esbuild, o scanner read-only, a integridade por SHA-256 e a execução transacional dos dois modos com journal write-ahead e rollback comprovado. Restauração manual, interface PowerShell, análise final de risco e bootstrap ainda não estão implementados.
