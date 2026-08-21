# Manual do Usuário — Meminify

## Finalidade e segurança

O Meminify minifica arquivos JavaScript e CSS no Windows. Toda alteração exige confirmação explícita, validação prévia e prova de integridade por SHA-256. Em dúvida, erro de configuração, origem inacessível ou estado técnico não comprovado, a operação é bloqueada.

Não existe risco zero. O risco do perfil é exibido separadamente; o algoritmo final de risco da execução ainda não está disponível.

## Requisitos e primeira execução

- Windows com Windows PowerShell.
- Node.js LTS homologado: linhas 24 ou 22; a linha 24 é preferida.
- Dependências locais do projeto.

Execute `Executar.ps1` na raiz. O bootstrap valida Node, npm, `package.json`, `package-lock.json` e dependências. Se Node estiver ausente ou não homologado, pode oferecer a instalação exata autorizada via winget. Recusar a instalação não altera o sistema.

Após o bootstrap, o menu oferece análise, minificação, ajuste temporário, configurações, backups/restauração, relatórios e logs técnicos.

## Configuração

A configuração persistente é `Configuracao\configuracao.ini`; o modelo versionado é `Configuracao\configuracao.ini.example`. Se o arquivo real não existir, o menu informa o caminho e só o cria a partir do modelo após confirmação. Ele nunca sobrescreve uma configuração existente.

O arquivo INI usa listas numeradas, por exemplo:

```ini
[Configuracao]
Motor=esbuild
Perfil=Padrao
ModoSaida=BackupESobrescreverOriginais
Incluir01=**/*.js
Excluir01=node_modules

[Origem.001]
Tipo=Diretorio
Caminho=C:\Projetos\exemplo
ExecutarPorPadrao=true
Recursivo=true
Modo=Todos
Incluir01=*.js
```

Use `Incluir01`, `Incluir02` e `Excluir01`; listas por ponto e vírgula, chaves repetidas, valores inválidos ou o perfil `Personalizado` bloqueiam o avanço. O perfil `Personalizado` permanece indisponível enquanto seu schema estiver pendente.

### Origens, recursão e padrões

As origens podem ser diretórios ou arquivos explícitos. Para diretórios, `Recursivo=true` ou `Recursivo=false` é obrigatório. Os modos são `Todos`, `Selecionados` e `Arquivo` (somente para origem de arquivo). Inclusões e exclusões globais e por origem são avaliadas pelo scanner; links, arquivos somente leitura, extensões não suportadas e exclusões técnicas são ignorados com motivo.

### Modos de saída e perfis

`BackupESobrescreverOriginais` cria e valida uma cópia em `_source_versions` antes de substituir o original. `PreservarOriginaisECriarMinificados` conserva a fonte e cria um destino `.min.js` ou `.min.css` ao lado dela.

Os perfis disponíveis são `Conservador` (risco muito baixo), `Padrao` (baixo) e `Maximo` (moderado). O motor homologado atual é esbuild para JavaScript e CSS, sem bundling.

## Analisar e minificar

Escolha **Analisar arquivos** para ver origens efetivas, recursão, modo de saída, perfil, risco do perfil, encontrados, elegíveis, ignorados, conflitos `.min`, avisos e bloqueios. A análise não modifica arquivos.

**Minificar** sempre refaz a pré-análise. Antes de qualquer escrita, o menu mostra o escopo e solicita confirmação. Como não há algoritmo final de risco de execução, a interface deixa essa ausência clara e pede autorização explícita adicional; ela não declara risco zero.

Se um destino `.min` já existir, todos os conflitos são listados e uma autorização global específica é exigida. Recusar cancela a execução inteira sem gerar saídas parciais.

## Ajustes temporários

O menu atual permite ajustar o modo de saída somente para a execução atual. O ajuste fica em memória e não modifica o INI. Fechar o programa descarta o ajuste.

## Backups e restauração manual

No modo de sobrescrita, a restauração lista backups válidos em `_source_versions` e também aceita uma pasta exata informada manualmente. O manifesto, a cópia de backup, os hashes, os caminhos e o estado técnico são validados antes de formar um plano.

Se o arquivo atual ainda corresponde ao hash minificado registrado, basta a confirmação normal. Se foi alterado ou está ausente, há uma confirmação adicional; recusá-la preserva esse item. O arquivo minificado atual não recebe backup durante a restauração.

No modo `.min`, a opção restaura somente a última execução concluída removendo exatamente saídas que foram criadas nela. Saídas `.min` preexistentes e sobrescritas não são removidas nem restauradas. Uma saída já ausente é apenas reportada; uma saída alterada após a criação exige confirmação adicional antes da exclusão.

Uma restauração interrompida ou ambígua entra em `recovery-required`. Nesse estado, não force nova minificação ou restauração: preserve os arquivos, consulte os logs e corrija o estado somente por um procedimento comprovado.

## Relatórios e logs

Após análise, execução ou restauração, o Meminify pode gerar relatórios operacionais UTF-8 em `Dados\Relatorios` (TXT e CSV) e logs técnicos UTF-8 em `Dados\Logs`. O menu permite listar e visualizar esses arquivos em modo somente leitura.

Relatórios mostram totais, itens ignorados com motivo, resultados de restauração e falhas. Logs técnicos podem conter caminhos, diagnósticos e stack traces; eles não são exibidos como mensagem normal do menu.

## Problemas comuns

- **Configuração ausente ou inválida:** corrija `Configuracao\configuracao.ini` ou crie-o explicitamente a partir do modelo.
- **Origem inacessível, link ou arquivo somente leitura:** o scanner informa o motivo e bloqueia quando o escopo não pode ser comprovado.
- **Conflito `.min`:** revise a lista e confirme globalmente somente se aceitar sobrescrever todos os destinos listados.
- **Node não homologado:** instale uma linha LTS homologada; não use versões Current, EOL ou globais.
- **`recovery-required`:** não tente contornar o bloqueio; consulte o log técnico e preserve o estado para recuperação comprovada.
