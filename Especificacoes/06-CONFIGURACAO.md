# Configuração

## Arquivos e responsabilidades

- Configuração persistente do usuário: `Configuracao\configuracao.ini`.
- Modelo versionado: `Configuracao\configuracao.ini.example`.
- O INI real do usuário não deve ser versionado.
- O INI armazena preferências, nunca estado técnico da aplicação.

Estado técnico e controle de recuperação são definidos em `08-BACKUP-E-ROLLBACK.md`.

## Listas e origens

Listas devem usar chaves numeradas:

```ini
Incluir01=
Incluir02=
Excluir01=
Excluir02=
```

Arrays separados por ponto e vírgula e chaves idênticas repetidas não são permitidos.

A configuração deve aceitar qualquer quantidade de origens de diretório e de arquivos explícitos. Uma origem de diretório segue conceitualmente:

```ini
[Origem.001]
Tipo=Diretorio
Caminho=...
ExecutarPorPadrao=true
Recursivo=true
Modo=Todos
Incluir01=*.js
```

Modos de origem válidos:

- `Todos`
- `Selecionados`
- `Arquivo`

A recursividade deve ser sempre explícita por `Recursivo=true` ou `Recursivo=false`.

As origens podem combinar inclusões e exclusões globais, específicas por origem e temporárias. A sintaxe e a precedência de seleção estão em `03-REGRAS-NEGOCIO.md`.

## Modo de saída

A chave `ModoSaida=` aceita exatamente dois valores mutuamente exclusivos:

- `BackupESobrescreverOriginais`
- `PreservarOriginaisECriarMinificados`

O valor padrão é `BackupESobrescreverOriginais`. Qualquer outro valor bloqueia a execução.

No primeiro modo, o original só pode ser substituído depois de um backup validado da fonte não minificada. No segundo, a fonte nunca é alterada, não requer backup por não ser sobrescrita e a saída é criada ao lado dela com o nome definido em `03-REGRAS-NEGOCIO.md`. As transações, conflitos e recuperações de ambos os modos são autoritativamente definidos em `08-BACKUP-E-ROLLBACK.md`.

## Validação

Não existe fallback silencioso para configuração inválida. Enum, booleano, motor, caminho, destino, perfil ou qualquer outro valor inválido deve bloquear o avanço e informar os valores permitidos ou a correção esperada.

Ausência ou inacessibilidade de origens configuradas segue `10-SEGURANCA-E-INTEGRIDADE.md`.

## Configuração efetiva temporária

A configuração persistente e a configuração efetiva de uma execução são objetos distintos. Inclusões, exclusões, origens, opções ou outros ajustes temporários valem apenas para a execução atual.

Um ajuste temporário nunca modifica `Configuracao\configuracao.ini`. A persistência só ocorre quando o usuário entra explicitamente na área de configuração persistente e salva.

A seleção temporária do modo de saída apresenta exatamente:

- `1`: manter a configuração persistente atual;
- `2`: usar temporariamente `BackupESobrescreverOriginais`;
- `3`: usar temporariamente `PreservarOriginaisECriarMinificados`;
- `0`: cancelar a operação temporária atual.

As opções 1, 2 e 3 concluem a seleção sem etapa adicional de aplicação. A opção 0 descarta o rascunho da operação atual, preserva o estado efetivo anterior da sessão e nunca modifica o INI.
