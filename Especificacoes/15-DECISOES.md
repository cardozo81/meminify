# Decisões

## Aprovadas

- O produto é voltado ao Windows, com interface interativa planejada em PowerShell e aplicação em Node.js.
- O comportamento é fail-closed e a integridade dos arquivos tem prioridade máxima.
- Conteúdo destinado a pessoas usa pt-BR; arquivos textuais usam UTF-8; mojibake é proibido.
- A versão 1 suporta JavaScript e CSS por meio do esbuild homologado, sem bundling.
- Perfis são intenções neutras traduzidas apenas por adaptadores.
- Existem exatamente dois modos de saída: sobrescrita com backup validado e preservação da fonte com saída `.min`.
- SHA-256 é a prova primária de integridade; timestamps e aparência visual não substituem essa prova.
- Symlinks e junctions não são seguidos automaticamente na versão 1.
- Toda mutação confirmada deve possuir rastreamento recuperável correspondente.
- O desenvolvimento é incremental, assistido por IA e realizado diretamente em `main`, sem branch por tarefa e sem pull request no fluxo atual.
- Testes são focados, proporcionais e introduzidos junto com os comportamentos.
- Commits e pushes representam checkpoints significativos e validados, não microalterações.

Os detalhes normativos de cada decisão pertencem aos documentos temáticos indicados por `_ias/INDEX.md`.

## Pendentes

As seguintes decisões permanecem deliberadamente sem valor inventado:

- política de retenção automática de backups;
- políticas de retenção automática de logs e relatórios;
- linhas e versões exatas de Node.js LTS homologadas;
- eventual limiar mínimo de redução para aceitar um resultado;
- opções detalhadas permitidas no perfil `Personalizado`;
- versões exatas das dependências;
- layout final detalhado do pacote de distribuição;
- mecanismo concreto de persistência resistente a falhas para o rastreamento da execução;
- método detalhado para calcular o risco estimado de uma execução.

Esses pontos exigem decisão explícita em tarefa futura. Nenhum padrão, fallback ou valor deve ser inferido enquanto permanecerem pendentes.
