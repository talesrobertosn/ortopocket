# OrtoPocket

Este site foi estruturado como um “mini-app” para consulta rápida em ortopedia: classificações + métricas radiográficas.

## Atalhos rápidos
- Classificações: Garden, Gustilo–Anderson, Lauge–Hansen
- Métricas (RX): Hallux valgus (HVA/IMA/DMAA), Insall–Salvati, TAD

## Como adicionar conteúdo novo (fluxo rápido)
1. Crie um arquivo `.md` novo dentro de `content/` (por exemplo: `content/classificacoes/ao-ota.md`).
2. Adicione uma entrada correspondente no `content/pages.json` com `id`, `title`, `section`, `file` e `tags`.
3. Faça commit e publique (no GitHub Pages a atualização é automática).

## Como inserir imagens (RX)
- Coloque imagens em `assets/img/` (ex.: `assets/img/garden2.jpg`).
- No Markdown, use:
  `![descrição](assets/img/garden2.jpg)`

Observação: publicar imagens exige atenção rigorosa a anonimização e permissões de uso.
