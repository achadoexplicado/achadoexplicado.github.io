# Achado Explicado · central de achados

Página do link na bio: https://achadoexplicado.github.io

Os produtos citados nos vídeos ficam em `dados/achados.json`. Depois de editar, gere a página e publique:

```
node gerar.mjs
git add -A && git commit -m "Atualiza achados" && git push
```

O gerador recusa produto sem preço, sem data da consulta ou com link que não seja do Mercado Livre.
Todos os links são de afiliado, e a página avisa isso no topo.
