# Achado Explicado · central de achados

Página do link na bio: https://achadoexplicado.github.io

Os produtos citados nos vídeos ficam em `dados/achados.json`. Depois de editar, gere a página e publique:

```
node gerar.mjs
git add -A && git commit -m "Atualiza achados" && git push
```

Pode cadastrar o vídeo antes de ele sair: a seção só aparece na página a partir das 10h (Brasília) do dia em `"publicado"`, o mesmo horário das redes, ou no horário do campo opcional `"hora"` ("HH:MM"). Antes disso ela não aparece nem na busca.

O gerador recusa produto sem preço, sem data da consulta ou com link que não seja do Mercado Livre.
Todos os links são de afiliado, e a página avisa isso no topo.
