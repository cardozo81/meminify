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
- As dependências `ini@7.0.0` e `esbuild@0.28.2` foram introduzidas em versões exatas e estão bloqueadas no lockfile; versões futuras são selecionadas quando cada dependência for introduzida e devem permanecer reproduzíveis.
- A seleção de padrões do scanner usa `micromatch@4.0.8`, fixada exatamente no manifesto e lockfile.
- O diretório temporário interno do runtime é `Dados\Temporarios\` e permanece uma exclusão técnica obrigatória do scanner.
- O rastreamento resistente a interrupções usa journal JSON UTF-8 write-ahead em `Dados\Restauracao\ultima-execucao.bkp`, persistido por temporário durável e `rename` antes das mutações registradas.
- O runtime Node.js homologa as linhas major 24 e 22, prefere 24 e autoriza instalação automática somente da versão `24.19.0` pelo pacote winget `OpenJS.NodeJS.LTS`; chamadas npm no PowerShell usam `npm.cmd`.
- A versão inicial de desenvolvimento é `0.1.0`, com `package.json` como autoridade única; nomes de pasta, ZIP e checksum são derivados dessa versão.
- O pacote local usa uma raiz `Meminify-<version>` e allowlist de launcher, manifestos npm, módulos `src`, recursos, modelo de configuração e documentação HTML gerada, sem `node_modules` nem conteúdo de desenvolvimento/local.

Os detalhes normativos de cada decisão pertencem aos documentos temáticos indicados por `_ias/INDEX.md`.

## Identidade de versão

- A política segue SemVer; a versão pré-1.0 atual é `0.1.0`, derivada exclusivamente de `package.json`, formando pasta, ZIP, checksum, futura tag `v<version>` e futuro GitHub Release.
- Tags são imutáveis; uma publicação futura reutiliza exatamente os artefatos validados, e a distribuição gerada permanece fora do Git.

## Convenção de encoding do PowerShell

Scripts PowerShell (`.ps1`/`.psm1`) executados pelo Windows PowerShell usam UTF-8 com BOM para interpretação confiável de pt-BR; Node.js, JSON, Markdown e demais formatos seguem sua codificação UTF-8 apropriada.

## Pendentes

As seguintes decisões permanecem deliberadamente sem valor inventado. A área futura indicada orienta a próxima consolidação:

- política de retenção automática de backups — recuperação e backup;
- políticas de retenção automática de logs e relatórios — logs e relatórios;
- eventual limiar mínimo de redução para aceitar um resultado — minificação e qualidade;
- opções detalhadas permitidas no perfil `Personalizado` — perfis e adaptadores;
- versões exatas de futuras dependências — fase que introduzir cada dependência;
- método detalhado para calcular o risco estimado de uma execução — UX e análise de risco.

Esses pontos exigem decisão explícita em tarefa futura. Nenhum padrão, fallback ou valor deve ser inferido enquanto permanecerem pendentes.
