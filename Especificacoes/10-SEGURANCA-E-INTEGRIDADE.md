# Segurança e integridade

## Comportamento fail-closed

A regra fundamental e o princípio obrigatório de segurança estão definidos em `01-PREMISSAS.md`. Uma operação só avança com regra explícita, estado comprovado e todas as validações aplicáveis aprovadas. Em dúvida, ambiguidade ou estado não comprovado, o sistema não modifica e reporta.

São proibidos:

- inferir a intenção do usuário;
- corrigir silenciosamente configuração inválida;
- selecionar fallback silencioso;
- contornar validações ou confirmações;
- modificar arquivo cuja integridade não possa ser estabelecida;
- apresentar execução como completa quando o escopo configurado não foi integralmente acessível.

## Links do sistema de arquivos

Symlinks e junctions não são seguidos automaticamente. Ao encontrá-los, o sistema deve ignorar e reportar:

- caminho;
- tipo;
- destino, quando identificável com segurança.

Para processar o destino, o usuário deve configurá-lo explicitamente como outra origem. Não existe `SeguirLinks=true` na versão 1.

## Arquivos somente leitura

O atributo somente leitura não deve ser removido. Arquivos readonly são ignorados e reportados com o motivo.

## Origens ausentes ou inacessíveis

Uma origem configurada ausente ou inacessível nunca pode ser ignorada silenciosamente. Ela deve permanecer visível como parte do escopo e bloquear o avanço. As opções interativas estão em `05-UX-CLI.md`, e ajustes temporários seguem `06-CONFIGURACAO.md`. A execução nunca pode aparentar conclusão integral enquanto parte do escopo estiver inacessível.

## Mutações e integridade

Hashes SHA-256, estado, condições para mutação, backup, restauração e rollback seguem as regras autoritativas de `08-BACKUP-E-ROLLBACK.md`.

Exclusões técnicas e deduplicação estão em `03-REGRAS-NEGOCIO.md`; valores inválidos de configuração estão em `06-CONFIGURACAO.md`.
