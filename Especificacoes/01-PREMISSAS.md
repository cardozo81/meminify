# Premissas do projeto

## Produto

- O Meminify é uma aplicação direcionada ao Windows.
- Uma interface interativa em PowerShell está planejada.
- O runtime planejado é Node.js.
- O produto realizará minificação controlada de JavaScript e CSS.
- A arquitetura de motores de minificação será modular.
- O esbuild é o primeiro motor planejado para homologação.

## Segurança e prioridade

O comportamento é fail-closed: somente uma regra explícita apoiada por um estado comprovado autoriza uma ação. Diante de ambiguidade ou estado não comprovado, nada deve ser modificado e a condição deve ser relatada.

Princípio aprovado: **“Nenhuma conveniência de UX poderá reduzir as proteções de integridade.”**

A ordem definitiva de prioridades do produto é:

1. Integridade dos arquivos
2. Segurança e comportamento explícito
3. Possibilidade de recuperação
4. Rastreabilidade
5. Previsibilidade
6. Clareza para o usuário
7. Compatibilidade
8. Redução obtida pela minificação
9. Conveniência

## Idioma e codificação

- Todo conteúdo destinado a pessoas deve ser escrito em pt-BR.
- Arquivos textuais devem usar UTF-8.
- Acentos, `ç` e demais caracteres do português devem ser preservados corretamente.
- Mojibake é proibido; problemas de codificação devem ser corrigidos na origem.

## Desenvolvimento

- O desenvolvimento é incremental e assistido por IA.
- O fluxo atual trabalha diretamente na branch `main`.
- Testes e validações devem ser focados e proporcionais ao comportamento alterado.
- Branches desnecessárias não devem ser criadas.
- Diretórios vazios e placeholders de arquitetura futura não devem inflar o scaffold.
- Commits e pushes são feitos apenas em pontos coerentes, significativos e validados.
