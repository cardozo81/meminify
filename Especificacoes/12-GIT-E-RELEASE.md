# Git e releases

## Fluxo atual aprovado

- `main` é a branch ativa de desenvolvimento no fluxo atual, conduzido por uma única pessoa com assistência de IA.
- Não se cria uma branch para cada funcionalidade, prompt, correção ou alteração documental.
- Branches não são criadas automaticamente.
- O fluxo atual não utiliza pull requests.
- Git é usado para histórico, checkpoints, rastreabilidade e recuperação.
- Somente mudanças coerentes, significativas e validadas devem ser commitadas.
- Mensagens de commit devem ser escritas em pt-BR, com acentos e `ç` preservados corretamente.
- O push deve ser feito para `origin/main` quando a tarefa concluída representar um checkpoint remoto útil.
- Estados sabidamente quebrados, incompletos ou não validados não devem ser enviados.
- Force-push nunca deve ser usado, salvo pedido explícito em uma tarefa futura.
- Tags poderão identificar futuras releases ou marcos.
- A estratégia de branches só poderá ser reconsiderada se as circunstâncias do projeto mudarem materialmente.

## Releases

Os requisitos autoritativos de versionamento e publicação serão consolidados em tarefa futura. Nenhuma automação de release está aprovada nesta fase.
