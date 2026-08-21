# Orientações para agentes de IA

1. Leia `_ias/INDEX.md` primeiro e consulte somente as especificações necessárias.
2. Não invente requisitos, padrões, defaults, fallbacks ou comportamentos.
3. Texto destinado a pessoas, relatórios finais, mensagens de commit e comentários úteis devem estar em pt-BR; identificadores internos podem usar EN-US.
4. Preserve UTF-8, acentos e `ç`; ao alterar texto, valide encoding e mojibake proporcionalmente. `Ã` isolado pode ser válido em `NÃO`; procure sequências corrompidas reais.
5. Este projeto é operado por uma pessoa, em uma máquina, sem desenvolvimento concorrente.
6. Trabalhe diretamente em `main`; não crie branch ou PR sem necessidade futura concreta.
7. Faça verificações Git quando forem relevantes a commit/push, release, operação destrutiva ou estado inesperado; não repita sincronização remota sem motivo concreto.
8. Commite somente checkpoints significativos e validados, faça push somente de checkpoints remotos úteis e nunca force-push sem pedido explícito.
9. Mantenha testes e validações focados e proporcionais, preserve arquivos sem relação e mantenha os relatórios finais concisos.
10. Diante de requisito ambíguo, siga o princípio fail-closed: não modifique e relate.
