# Painel em React: contrato entre o `app.py` e o `web/`

Os tipos TypeScript em `web/src/lib/api.ts` são a fonte da verdade do formato. Este arquivo explica o comportamento.

## Como o painel é servido

- `web/` é um projeto Vite + React + TypeScript. `npm run build` gera `static/app/` (index.html + assets), que vai para o Git: o painel roda sem Node.
- O `app.py` serve `static/app/assets/*` em `/static/app/assets/*` (js, css, svg, woff2, png, com o content-type certo e cache longo) e devolve `static/app/index.html` nas **rotas do painel** quando o navegador abre a página:
  `/`, `/c/<uuid>`, `/insights`, `/dashboard`, `/saques`, `/pagamentos`, `/webhooks`, `/usuarios`, `/taxas`, `/taxas/<id>`, `/config`, `/remoto`, `/buscar`.
- Se `static/app/index.html` não existir, essas rotas continuam com o HTML antigo (o painel nunca fica fora do ar por falta de build).
- `/classico/<rota>` devolve a tela antiga. Com `?embed=1`, `pagina()` devolve só o conteúdo principal (sem marca, abas, status, feed nem botão 🔧) mais o CSS e os scripts, e um `<base target=_top>` para links e formulários navegarem a janela de cima (a casca React). A recarga automática da página antiga continua.
- Os endpoints antigos usados por AJAX continuam iguais: `/novidades`, `/card/<id>`, `/c/<id>/anteriores`, `/audio`, `/corrigir`, `/traduzir`, `/taxa-da-conversa`, `/consultar-ids`, `/convite-da-conversa`, `/webhook-media`, `/conversao`, `/insights/exportar`, `/ping`.
- O `PainelRemoto` (celular pareado, porta 8766) serve a mesma casca. Nele, `/api/estado` devolve `remoto: true`, `/api/claude` e `/api/remoto` respondem 403.

## GET (JSON)

| Rota | Devolve |
|---|---|
| `/api/estado` | `Estado`: token anti-CSRF (`TOKEN`), modo remoto, status (Tamino, Evo, IA), ponto do turno, tamanho da fila, nome do atendente |
| `/api/feed?f=novas\|todas` | `{itens: FeedItem[]}` na mesma ordem e filtro de `feed_html` (P1 e irritado primeiro, ignorados fora em "novas"), até 60 |
| `/api/fila` | `Fila`: cards pendentes na ordem da fila (`urgencia`), e as respostas rápidas já resolvidas por idioma (`{atendente}` trocado) |
| `/api/card/<id>` | `{existe, card?}`: um card (para atualizar o aberto sem recarregar) |
| `/api/conversa/<uuid>` | `Conversa`: histórico (20 últimas do Evo), memória, escalação viva, idioma. Com `?antes=<msg_id>`: `{mensagens, mais_antiga}` com as 20 anteriores |
| `/api/remoto` | `Remoto`: estado do acesso pelo celular (ligado, link, código, QR em SVG, sessões). Só no PC |

Formato das mensagens (`Mensagem`): `apagada` vem com `texto` vazio; `reply_preview` é "Nome: trecho" da mensagem citada, quando ela está no mesmo lote; `anexos[].url` de áudio já vem como `/audio?u=...` (proxy que converte para mp3); `traduzivel` = `outra_lingua(texto)`.

`Avatar.cor` é o matiz (0–359) que hoje vai em `style="--h:"`; `Avatar.iniciais` vem de `iniciais()`.

## POST

- **Ações**: `POST /` com os mesmos campos dos formulários antigos (form-urlencoded; multipart quando há anexo, campo de arquivo com qualquer nome). Sempre com `t=<token>`. Sucesso = 2xx ou 303; erro = 4xx/5xx com texto. Principais:
  - card da fila: `acao=enviar|descartar`, `id`, `texto`
  - idioma: `acao=idioma`, `conv`, `lang`
  - conversa: `acao=livre`, `conv`, `texto`, `in_reply_to` (+ arquivos); `acao=editar_msg|apagar_msg`, `conv`, `msg`, `texto`; `acao=status`, `conv`, `status=open|resolved`; `acao=rascunhar`, `conv`
  - memória: `acao=mem_salvar` (`resumo`, `pendencias` e `fatos` uma por linha, `fixo`), `mem_limpar`, `mem_atualizar`, `conv`; `acao=esquecer_cliente`, `conv`
  - N2: `acao=n2_enviar|n2_cancelar|n2_vincular`, `esc`, `texto`
  - feed: `acao=ignorar`, `conv`, `nome`, `sim=1|0`
  - ponto: `acao=ponto`, `tipo=entrada|saida`, `avisar=1|0`
  - remoto (só PC): `acao=remoto_on|remoto_off|remoto_codigo|remoto_revogar`
- `/corrigir`, `/traduzir`: form com `t`, `texto` (`lang` no corrigir), resposta texto puro.
- **`POST /api/claude`** (só PC; 403 no remoto): JSON `{mensagem, sessao}` com cabeçalho `x-token: <token>`.
  Roda `claude -p --output-format json` no diretório do projeto, com `--resume <sessao>` quando houver sessão e com permissões completas (o usuário escolheu "Claude Code completo, só no PC"). Timeout de 10 min. Responde `{resposta, sessao, erro?}`. Só um pedido por vez (lock); o segundo recebe 409.
- O guard do marcador `[[N2` e o restante das validações continuam no servidor.

## Polling

A casca chama `/novidades?desde=<t>` a cada 2 s: `eventos` (mensagem nova: som, notificação, título) e `cards` (ids de cards que mudaram: atualizar no lugar o que está na tela; card novo entra na lista sem recarregar a página).
