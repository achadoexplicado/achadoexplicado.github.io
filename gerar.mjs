// Gera index.html a partir de dados/achados.json.
//
// Uso: node gerar.mjs [dados.json] [saida.html]
//
// Cada vídeo:  { "id", "titulo", "publicado": "AAAA-MM-DD", "produtos": [...] }
// Cada produto: { "faixa"?, "nome", "precoAPartirDe": número em reais,
//                 "consultadoEm": "AAAA-MM-DD", "link": link de afiliado do Mercado Livre }
// Regras do projeto: preço sempre "a partir de", com a data da consulta, e aviso de link de afiliado.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const entrada = resolve(aqui, process.argv[2] ?? "dados/achados.json");
const saida = resolve(aqui, process.argv[3] ?? "index.html");
const dados = JSON.parse(readFileSync(entrada, "utf8"));

// Os vídeos saem às 10h de Brasília. Até esse horário a seção do vídeo fica fora da página,
// para ninguém ver produtos de um vídeo que ainda não saiu.
const HORARIO = "T10:00:00-03:00";
const agora = Date.now();
const noAr = (v) => Date.parse(v.publicado + HORARIO) <= agora;

// meli.la é o encurtador do Gerador de link do portal de afiliados.
const DOMINIOS = ["meli.la", "mercadolivre.com", "mercadolivre.com.br", "mercadolibre.com"];
const REDES = [
  ["Instagram", "https://www.instagram.com/achadoexplicado/"],
  ["YouTube", "https://www.youtube.com/@achadoexplicado"],
  ["Pinterest", "https://www.pinterest.com/achadoexplicado/"],
];

const erros = [];
const dataValida = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") && !Number.isNaN(Date.parse(d));
const ids = new Set();
for (const v of dados.videos) {
  const onde = `vídeo "${v.id ?? v.titulo ?? "?"}"`;
  if (!/^[a-z0-9-]+$/.test(v.id ?? "")) erros.push(`${onde}: id deve ter só letras minúsculas, números e hífen`);
  if (ids.has(v.id)) erros.push(`${onde}: id repetido`);
  ids.add(v.id);
  if (!v.titulo) erros.push(`${onde}: falta o título`);
  if (!dataValida(v.publicado)) erros.push(`${onde}: "publicado" precisa ser AAAA-MM-DD`);
  for (const p of v.produtos ?? []) {
    const ondeP = `${onde}, produto "${p.nome ?? "?"}"`;
    if (!p.nome) erros.push(`${ondeP}: falta o nome`);
    if (!(typeof p.precoAPartirDe === "number" && p.precoAPartirDe > 0)) erros.push(`${ondeP}: "precoAPartirDe" precisa ser um número maior que zero`);
    if (!dataValida(p.consultadoEm)) erros.push(`${ondeP}: "consultadoEm" precisa ser AAAA-MM-DD`);
    let host = "";
    try {
      const u = new URL(p.link);
      if (u.protocol === "https:") host = u.hostname.replace(/^www\./, "");
    } catch {}
    if (!DOMINIOS.some((d) => host === d || host.endsWith("." + d)))
      erros.push(`${ondeP}: o link precisa ser https e do Mercado Livre`);
  }
}
if (erros.length) {
  console.error("Dados com problema:\n- " + erros.join("\n- "));
  process.exit(1);
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const real = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const dataBR = (d) => d.split("-").reverse().join("/");

const videos = [...dados.videos].sort((a, b) => b.publicado.localeCompare(a.publicado));
const datas = videos.filter(noAr).flatMap((v) => [v.publicado, ...(v.produtos ?? []).map((p) => p.consultadoEm)]);
const atualizado = datas.sort().at(-1);

function cartao(p) {
  return `
        <li class="cartao" data-busca="${esc((p.nome + " " + (p.faixa ?? "")).toLowerCase())}">
          <span class="furo" aria-hidden="true"></span>
          ${p.faixa ? `<p class="faixa">${esc(p.faixa)}</p>` : ""}
          <h3 class="nome">${esc(p.nome)}</h3>
          <p class="preco"><span>a partir de</span> ${real(p.precoAPartirDe)}</p>
          <p class="consulta">Preço consultado em ${dataBR(p.consultadoEm)}. Pode ter mudado.</p>
          <a class="botao" href="${esc(p.link)}" target="_blank" rel="sponsored noopener">Ver no Mercado Livre<span aria-hidden="true"> →</span></a>
        </li>`;
}

function secao(v) {
  return `
      <section class="video" id="${esc(v.id)}"${noAr(v) ? "" : ` hidden data-publica="${esc(v.publicado + HORARIO)}"`}>
        <h2>${esc(v.titulo)}</h2>
        <p class="publicado">Vídeo de ${dataBR(v.publicado)}</p>
        <ul class="cartoes">${(v.produtos ?? []).map(cartao).join("")}
        </ul>
      </section>`;
}

const vazio = `
      <section class="vazio">
        <h2>Os primeiros achados chegam junto com os vídeos</h2>
        <p>Cada vídeo compara modelos e faixas de preço. Os produtos citados aparecem aqui, com o preço do dia e o link.</p>
        <p><a href="${REDES[0][1]}">Siga no Instagram</a> para ver quando sair o próximo.</p>
      </section>`;

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Achado Explicado · central de achados</title>
    <meta name="description" content="Os produtos dos vídeos do Achado Explicado: itens práticos para casa comparados por faixa de preço. Links de afiliado do Mercado Livre." />
    <meta property="og:title" content="Achado Explicado · central de achados" />
    <meta property="og:description" content="Comparo antes de você comprar. Itens práticos para casa." />
    <meta property="og:image" content="https://achadoexplicado.github.io/assets/compartilhar.png" />
    <meta property="og:url" content="https://achadoexplicado.github.io/" />
    <meta name="theme-color" content="#18c964" />
    <link rel="icon" type="image/png" href="assets/favicon.png" />
    <link rel="apple-touch-icon" href="assets/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=League+Gothic&family=Oswald:wght@500;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --verde: #18c964;
        --verde-escuro: #0f8a44;
        --grafite: #1c1c1e;
        --papel: #f4f1ea;
        --etiqueta: #fbfaf6;
        --cinza: #5c5a55;
        --display: "League Gothic", "Arial Narrow", Impact, sans-serif;
        --texto: "Oswald", "Arial Narrow", Arial, sans-serif;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: var(--papel); color: var(--grafite); font-family: var(--texto); font-weight: 500; line-height: 1.4; }
      a { color: inherit; }
      a:focus-visible, input:focus-visible { outline: 3px solid var(--grafite); outline-offset: 3px; }
      .largura { max-width: 720px; margin: 0 auto; padding: 0 16px; }

      header { background: var(--verde); padding: 28px 0 24px; }
      .marca { display: flex; align-items: center; gap: 14px; }
      .marca img { width: 64px; height: 64px; border-radius: 50%; border: 3px solid var(--grafite); }
      .marca h1 { font-family: var(--display); font-weight: 400; font-size: 46px; line-height: 0.9; letter-spacing: 0.01em; }
      .marca p { font-weight: 700; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; margin-top: 4px; }
      .redes { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; list-style: none; }
      .redes a { display: inline-block; padding: 6px 12px; background: var(--grafite); color: var(--papel); text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.03em; border-radius: 4px; }

      .aviso { background: var(--grafite); color: var(--papel); padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 15px; }
      .aviso strong { color: var(--verde); }

      .busca { display: block; margin-bottom: 8px; }
      .busca span { display: block; font-weight: 700; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px; }
      .busca input { width: 100%; padding: 12px 14px; font: inherit; font-size: 17px; border: 3px solid var(--grafite); border-radius: 6px; background: var(--etiqueta); }

      .video { margin: 28px 0 36px; scroll-margin-top: 16px; }
      .video h2, .vazio h2 { font-family: var(--display); font-weight: 400; font-size: 36px; line-height: 1; }
      .publicado { color: var(--cinza); font-size: 14px; margin-top: 4px; }
      .cartoes { list-style: none; display: grid; gap: 14px; margin-top: 14px; }
      @media (min-width: 640px) { .cartoes { grid-template-columns: 1fr 1fr; } }

      /* Cada produto é uma etiqueta de preço, como nos vídeos */
      .cartao {
        position: relative;
        background: var(--etiqueta);
        padding: 16px 16px 16px 48px;
        clip-path: polygon(26px 0, 100% 0, 100% 100%, 26px 100%, 0 50%);
        filter: drop-shadow(0 4px 0 rgba(28, 28, 30, 0.14));
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .furo { position: absolute; left: 12px; top: calc(50% - 8px); width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--grafite); background: var(--papel); }
      .faixa { align-self: flex-start; background: var(--verde); padding: 2px 8px; font-weight: 700; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; }
      .nome { font-weight: 700; font-size: 19px; line-height: 1.2; }
      .preco { font-family: var(--display); font-size: 34px; line-height: 1; margin-top: 2px; }
      .preco span { font-family: var(--texto); font-weight: 500; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; }
      .consulta { color: var(--cinza); font-size: 13px; }
      .botao { margin-top: 8px; align-self: stretch; text-align: center; background: var(--grafite); color: var(--papel); text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: 0.03em; padding: 11px 12px; border-radius: 4px; }
      .botao:hover { background: var(--verde-escuro); }

      .vazio { margin: 28px 0 40px; background: var(--etiqueta); border-radius: 6px; padding: 20px 18px; border-left: 8px solid var(--verde); }
      .vazio p { margin-top: 10px; font-size: 16px; }
      .sem-resultado { margin: 20px 0; font-size: 16px; }

      footer { border-top: 3px solid var(--grafite); padding: 18px 0 32px; color: var(--cinza); font-size: 14px; }
      footer p + p { margin-top: 6px; }
    </style>
  </head>
  <body>
    <header>
      <div class="largura">
        <div class="marca">
          <img src="assets/icone.png" alt="" width="64" height="64" />
          <div>
            <h1>Achado Explicado</h1>
            <p>Comparo antes de você comprar</p>
          </div>
        </div>
        <ul class="redes">${REDES.map(([nome, url]) => `<li><a href="${url}">${nome}</a></li>`).join("")}</ul>
      </div>
    </header>

    <main class="largura">
      <p class="aviso"><strong>Links de afiliado.</strong> Os links desta página são do programa de afiliados do Mercado Livre: se você comprar por eles, eu recebo uma comissão e você não paga nada a mais. Os preços são os do dia da consulta e podem mudar.</p>
${
  videos.length
    ? `
      <label class="busca">
        <span>Procurar um produto</span>
        <input id="busca" type="search" placeholder="ex.: robô aspirador" autocomplete="off" />
      </label>
      <p class="sem-resultado" id="sem-resultado" hidden>Nenhum produto com esse nome.</p>
${videos.map(secao).join("\n")}`
    : vazio
}
    </main>

    <footer>
      <div class="largura">
        <p>Achado Explicado. Itens práticos para casa, comparados com os dados dos anúncios.</p>
        ${atualizado ? `<p>Atualizado em <span id="atualizado" data-data="${atualizado}">${dataBR(atualizado)}</span>.</p>` : ""}
      </div>
    </footer>
${
  videos.length
    ? `
    <script>
      // Vídeo agendado: aparece quando chega o horário de sair nas redes; antes disso sai da página.
      const atualizado = document.getElementById("atualizado");
      document.querySelectorAll(".video[data-publica]").forEach((secao) => {
        if (Date.parse(secao.dataset.publica) > Date.now()) return secao.remove();
        secao.hidden = false;
        const data = secao.dataset.publica.slice(0, 10);
        if (atualizado && data > atualizado.dataset.data) {
          atualizado.dataset.data = data;
          atualizado.textContent = data.split("-").reverse().join("/");
        }
      });
      // A seção revelada agora não existia quando o navegador tentou ir para a âncora do link.
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

      const busca = document.getElementById("busca");
      const aviso = document.getElementById("sem-resultado");
      busca.addEventListener("input", () => {
        const termo = busca.value.trim().toLowerCase();
        let total = 0;
        document.querySelectorAll(".video").forEach((secao) => {
          let visiveis = 0;
          secao.querySelectorAll(".cartao").forEach((c) => {
            const mostra = !termo || c.dataset.busca.includes(termo);
            c.hidden = !mostra;
            if (mostra) visiveis++;
          });
          secao.hidden = visiveis === 0;
          total += visiveis;
        });
        aviso.hidden = total > 0;
      });
    </script>`
    : ""
}
  </body>
</html>
`;

writeFileSync(saida, html);
console.log(`${videos.length} vídeo(s), ${videos.reduce((s, v) => s + (v.produtos ?? []).length, 0)} produto(s) → ${saida}`);
