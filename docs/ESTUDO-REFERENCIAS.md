# Estudo de referências: ChatterMate e Tiledesk

22/11/2026. Leitura do código-fonte (os dois são open source, então não foi preciso engenharia reversa com o REA). Relatórios completos, com arquivo e linha de cada evidência:

- [referencias/chattermate.md](referencias/chattermate.md)
- [referencias/tiledesk.md](referencias/tiledesk.md)

## Licenças

| Projeto | Licença | Pode reusar? |
|---|---|---|
| ChatterMate | Apache-2.0. A parte `enterprise` é um submódulo privado, ausente do repositório. | Ideias, sim. Código copiado precisa manter o aviso de copyright e marcar as alterações. Nunca copiar nada de `enterprise`. |
| Tiledesk (`tiledesk`, `tiledesk-chatbot`) | MIT | Ideias, sim. Código copiado precisa manter o aviso. |
| Tiledesk (`tiledesk-dashboard`) | `LICENSE` diz MIT, `publiccode.yml` diz AGPL-3.0 | Tratar como AGPL: só ideias, não copiar código. |

O núcleo do Tiledesk (`tiledesk-server`) não é público; a API dele foi deduzida a partir do dashboard.

## Backlog priorizado para o painel

Juntei o que os dois projetos sugerem. "CM" é ChatterMate, "TD" é Tiledesk.

### Prioridade 1: pequeno esforço, alto valor

| # | Item | De onde vem | No painel |
|---|---|---|---|
| 1 | Linter de sigilo em código | CM 9 | Selo "⚠ viola sigilo" no rascunho se aparecer provedor, código HTTP, limite, TPM ou ID de outro tenant. Hoje a regra só existe no prompt. |
| 2 | Texto não confiável cercado no prompt | CM N1, TD N5/N6 | Mensagem do cliente, resposta do N2 e campo "falta" entre delimitadores marcados como dado. Notas, mensagens de sistema e o grupo N2 fora do prompt do cliente. |
| 3 | Segredos fora dos logs | TD N1, CM N3 | Filtro no log para o cookie do Tamino, o token do Evo, CPF e chave Pix. |
| 4 | Falha da IA com causa real | CM 15, TD N2 | Em vez de "Texto padrão", o card diz por que falhou (Claude deslogado, timeout, chave inválida) e oferece escalar ou responder à mão. |
| 5 | Classificação numa chamada só | TD F1-F3, CM 7 | Categoria (lista fechada, com `fallback`), sentimento e prioridade em cada card. Cliente irritado ou envolvendo dinheiro sobe na fila. É a base das métricas por categoria. |
| 6 | Retenção e "esquecer cliente" | CM N5, TD N8 | Prazo configurável para memórias, escalações e casos, com expurgo no vigia e teste de que nada sobra. Necessário agora que a autorização saiu. |
| 7 | Eventos da IA | CM N7, TD N7/F12 | Tabela `ia_eventos` (tipo, conversa, tokens, tempo, causa da falha). Alimenta custo por categoria e a comparação Haiku × Opus. |

### Prioridade 2: esforço médio

| # | Item | De onde vem | No painel |
|---|---|---|---|
| 8 | Lacunas de conhecimento | TD F4 | Toda escalação por falta de conhecimento entra numa lista. A resposta do N2 vira regra do playbook ou caso. Fecha o ciclo de aprendizado. |
| 9 | Casos parecidos com redação | CM 5, TD F5 | Busca FTS5, texto mascarado, rótulo "de outros clientes, só pelo padrão", filtro por tenant confirmado. O rascunho mostra em que caso se baseou. |
| 10 | Dry-run do playbook | TD F13 | Reexecutar casos antigos contra uma versão nova do playbook e comparar com o que foi enviado, sem enviar nada. |
| 11 | Gerador de playbook ancorado | CM 10 | Propostas semanais de regra que só usam fatos ditos pelo atendente, sem duplicar as existentes, aprovadas por você. |
| 12 | Horário de funcionamento | CM 13, TD F10 | O rascunho de espera muda fora do expediente; a "1ª resposta" desconta o fora de turno. |
| 13 | Variáveis e notas internas | TD F7/F8 | `$cliente` e `$atendente` nas respostas rápidas; notas privadas por conversa que alimentam a memória fixa. |

### Depois

- Investigação por hipóteses com consultas só de leitura (CM 8).
- Regras no estilo trigger, sem nenhuma ação de envio (TD F9).
- Ficha do contato com histórico (TD F11) e mapa semana × hora (TD F12).

### O que não copiar

- Multi-tenant, planos, Keycloak e Stripe: o painel tem um atendente.
- Postgres, pgvector, Redis, RabbitMQ, Mongo, Qdrant: o FTS5 do sqlite cobre o caso.
- Qualquer envio automático ao cliente (autonomia L3, broadcast, `bot_only`): fere a regra do clique.
- O motor visual de fluxos do Tiledesk: o domínio aqui é um playbook de texto.
- Padrões ruins encontrados no Tiledesk: transcrição com marcadores `<bot:...>` que o cliente consegue forjar, template Liquid sobre texto do cliente, token no `localStorage` e endpoints sem autenticação.

## Arquitetura: Rust/Axum + Angular ou continuar em Python?

**Recomendação: continuar em Python e organizar em hexagonal + DDD agora. Reescrever em Rust e Angular só se o painel virar um sistema da equipe.**

Por que não reescrever agora:

- **As automações dependem de Python.** O `renovar.py` e o `exportar.py` usam Playwright, que não tem versão oficial em Rust. A Anthropic também não tem SDK oficial para Rust.
- **O gargalo não é a linguagem.** O tempo vai para a IA (segundos por rascunho) e para as APIs do Evo e do Tamino. Para um atendente, o Python dá conta com folga.
- **Angular pesa para o uso atual.** Hoje são páginas HTML geradas pelo servidor, que já funcionam no celular. Angular traria build, uma API separada e autenticação por token para o mesmo resultado. O dashboard do Tiledesk mostra o custo disso em escala: arquivos de 8 mil linhas e dependências velhas.
- **O custo de reescrever é alto.** São cerca de 4 mil linhas, com regras de sigilo e de taxa que precisariam ser revalidadas.

O que vale fazer já, em Python:

- Separar o `app.py` em camadas, no formato hexagonal:
  - `dominio/`: Conversa, Rascunho, Escalação, Memória, Caso, Playbook, sem nenhuma chamada de rede;
  - `portas/`: interfaces para o Evo, o Tamino, a IA e o armazenamento;
  - `adaptadores/`: Evo, Tamino, `claude -p` e API Anthropic, sqlite;
  - `web/`: as rotas e o HTML do painel;
  - `casos_de_uso/`: tratar conversa, preparar resposta, abrir e fechar escalação.
- Ganho imediato: os testes trocam os adaptadores por versões falsas, sem trocar variáveis globais como hoje.
- Fazer aos poucos, um módulo por vez, com `uv run app.py teste` verde a cada passo.

Quando reavaliar Rust e Angular:

- se J.L, Daniel e outros forem usar o mesmo painel num servidor compartilhado;
- se for preciso distribuir como um executável único;
- se a IA passar a responder sozinha 24 horas por dia, com muitas conversas ao mesmo tempo.

Nesse caso, a separação em camadas feita agora facilita a migração: as portas viram traits em Rust e as rotas viram a API do Angular.
