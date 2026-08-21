# Experiência de uso e interface de linha de comando

## Interface planejada

PowerShell é a interface interativa planejada. CMD pode existir somente como lançador fino para operações específicas de build ou release.

A interface deve ser guiada e compreensível sem exigir que o usuário conheça npm, esbuild, sintaxe interna de glob, hashes ou adaptadores. Rótulos e mensagens apresentados ao usuário são obrigatoriamente em pt-BR.

## Menu principal conceitual

- Analisar arquivos
- Minificar
- Ajustar somente esta execução
- Configurações
- Backups e restauração
- Relatórios
- Logs técnicos
- Sair

## Apresentação semântica

- verde: sucesso;
- amarelo: aviso;
- vermelho: erro ou bloqueio;
- ciano: títulos e caminhos;
- branco: conteúdo normal;
- cinza: conteúdo secundário.

Cor nunca pode ser o único meio de comunicar estado ou severidade.

## Risco

A interface deve distinguir claramente:

- risco próprio do perfil;
- risco estimado da execução;
- fatores que aumentam esse risco.

É proibido declarar “risco zero”. Os perfis e seus níveis de risco estão em `07-MINIFICACAO-E-MOTORES.md`.

## Pré-análise e confirmação

Antes da confirmação, a interface deve mostrar, no mínimo:

- origens efetivas e recursividade;
- arquivos explícitos;
- padrões de inclusão e exclusão;
- modo de saída;
- perfil e risco;
- caminho de backup, quando aplicável;
- arquivos encontrados, elegíveis e ignorados;
- avisos e bloqueios.

O escopo efetivo deve permanecer visível durante a interação e ser apresentado novamente imediatamente antes da execução. A confirmação deve ser explícita e só pode ocorrer depois das validações.

Origem configurada ausente ou inacessível deve ser apresentada como parte do escopo, permitindo ao fluxo interativo corrigi-la, alterá-la ou desabilitá-la temporariamente, ou cancelar. Nenhuma dessas ações temporárias altera o INI sem entrada explícita na configuração persistente e salvamento.

Conflitos de destino `.min`, restaurações sobre arquivos alterados e exclusões manuais de saídas alteradas exigem as confirmações específicas descritas em `08-BACKUP-E-ROLLBACK.md`.
