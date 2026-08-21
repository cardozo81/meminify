# Documentação

## Fontes

Markdown é o formato preferencial das fontes. Os locais planejados são:

- `Documentacao\Fonte\Manual-Usuario`
- `Documentacao\Fonte\Manual-Tecnico`

## Públicos

- O manual do usuário deve ser escrito em pt-BR e orientar uso, decisões, avisos e recuperação sem exigir conhecimento da implementação.
- O manual técnico deve ser escrito em pt-BR e atender implementação, manutenção e operação.

## Publicação

A publicação deve gerar documentação HTML offline. O HTML deve seguir as regras de idioma e charset de `01-PREMISSAS.md`, inclusive a declaração explícita de UTF-8 e `pt-BR`.

O build de HTML integra a validação do pacote local descrita em `13-DISTRIBUICAO.md`. Fontes Markdown permanecem autoritativas; artefatos HTML gerados não substituem as especificações do produto.
