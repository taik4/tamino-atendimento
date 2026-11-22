# Estudo do Tiledesk como insumo para o painel Tamino

Li os três repositórios só no código-fonte. Nada foi executado, instalado ou alterado. Os números de linha são do que li; confirmei os principais com `grep -n`.

## 1) Licenças e reuso

| Pasta | Arquivo de licença | Outras declarações |
|---|---|---|
| `tiledesk/` | `LICENSE`: MIT, "Copyright (c) 2020 Tiledesk" | `publiccode.yml:78` diz MIT |
| `tiledesk-dashboard/` | `LICENSE`: MIT | `package.json:15` diz "MIT License", mas `publiccode.yml:89` diz **AGPL-3.0-only** |
| `tiledesk-chatbot/` | `LICENSE`: MIT | `README.md:4` e `:22` dizem MIT, mas `package.json:15` (raiz e `tybotRoute`) diz **ISC** |

- **Contradição no dashboard.** O arquivo `LICENSE` é MIT e o `publiccode.yml` é AGPL. Não consegui resolver só lendo o código. Trate o dashboard como possível AGPL e **não copie código dele**. Copiar ideias e endpoints é seguro.
- **Sem `ee/` nem `enterprise/`.** Procurei por diretórios com esses nomes nas três pastas e não achei nenhum. A versão Enterprise é distribuída como imagens Docker privadas (`tiledesk/README.md:50-51`), fora destes repositórios. Isso não foi lido.
- **Também fora do que li:**
  - o `tiledesk-server` (não é público);
  - o `design-studio`;
  - as licenças dos pacotes npm;
  - o histórico do git.
- **Tema de terceiros.** `src/assets/sass/material-dashboard.scss:1-8` é do Creative Tim, MIT. Exige manter o aviso de copyright se for copiado.
- **O que pode ser reusado.**
  - Ideias, formatos de API e fluxos não são cobertos por licença.
  - Código MIT pode ser copiado se você mantiver o aviso de copyright e a permissão. Seria um trecho pequeno e raro, porque seu painel é Python e eles são Node/Angular.
  - Recomendo **reimplementar**. Se algum trecho for copiado, crie um `NOTICE`.
  - Isto é leitura técnica, não parecer jurídico.

## 2) Funcionalidades que valem adotar (14)

**F1. Tags de conversa e classificação por categoria.** *Valor alto, esforço P.*
- **O que faz:** marca a conversa com tags coloridas. Também há analytics por tag.
- **Evidência:**
  - `tiledesk-dashboard/src/app/services/websocket/ws-requests.service.ts:1131-1162` (`/requests/:id/tag`).
  - `services/tags.service.ts:86-147` (`/tags {tag,color}`), `:59` (`analytics/tags`).
  - O chatbot grava tags automaticamente em `tybotRoute/tiledeskChatbotPlugs/directives/DirAddTags.js:60-120`.
- **No painel:** coluna `categoria` (saque pendente, IP, convite, taxa, webhook). É a base da Fase 1 e da Fase 3 do `PLANO-TREINAMENTO.md` (métricas por categoria).

**F2. Classificador por rótulos fechados com `fallback`.** *Valor alto, esforço P-M.*
- **O que faz:** o LLM responde só com um rótulo da lista ou `fallback`. Rótulo desconhecido vira fallback.
- **Evidência:** `DirAiCondition.js:106-107` (prompt "Reply with the label… or fallback"), `:393-420` (trata `fallback` e rótulo inexistente).
- **No painel:** uma chamada devolve `{categoria, sentimento, escalar?}`, validada contra a lista de categorias do playbook. `fallback` vira "sem conhecimento, escalar ao N2" (casa com a v1 de `.revisao-plano.md`).

**F3. Sentimento da IA e prioridade.** *Valor alto, esforço P.*
- **O que faz:** a IA avalia a conversa e grava `ai_rating` e `ai_sentiment` nos atributos. O agente pode definir prioridade e status de trabalho.
- **Evidência:**
  - `DirSetRating.js:8-30` (`saveTo: 'attributes'`).
  - `ws-requests.service.ts:1212-1250` (PATCH de `priority` e `workingStatus`).
  - `utils/permissions.constants.ts:17` (`request_update_priority`).
- **No painel:** "cliente irritado" e "envolve dinheiro" sobem o card na fila e ligam a flag "nunca automático" (`PLANO-TREINAMENTO.md:54`).

**F4. Ciclo de lacunas de conhecimento (perguntas sem resposta).** *Valor alto, esforço M.*
- **O que faz:** guarda as perguntas que a base não soube responder. Dá para listar, exportar e apagar, e há lista separada das respondidas.
- **Evidência:**
  - `services/unanswered-questions.service.ts:54,73,115,154-205` (`/kb/unanswered/:ns`, `/kb/answered/:ns`).
  - `DirAskGPTV2.js:142` (`skip_unanswered`) e `:485` (grava quando falha).
- **No painel:** tabela local `lacunas` (pergunta mascarada, categoria, status). Quando o rascunho escala por falta de conhecimento, entra ali. Uma tela deixa você ou o N2 responder uma vez, e a resposta entra como regra do playbook ou caso. É o laço de aprendizado da Fase 2.

**F5. Fontes e citações no rascunho, com modo "só trechos".** *Valor alto, esforço P.*
- **O que faz:** a consulta à base aceita `top_k=4`, `alpha=0.5` (busca híbrida), `reranking`, `citations` e `chunks_only`. Devolve as fontes junto com a resposta.
- **Evidência:** `DirAskGPTV2.js:134-144`, `:433-447` (`normalizeCitationSources`).
- **No painel:**
  - Mostrar em cada rascunho "baseado em: caso #12, regra X do playbook", para o atendente confiar ou corrigir.
  - Se o LLM falhar, mostrar só os 5 casos parecidos do FTS5 em vez do "Texto padrão" do README.

**F6. Handoff estruturado com motivo e métrica.** *Valor médio-alto, esforço P.*
- **O que faz:** ao passar para humano, grava o evento `handover_to_human` com motivo, departamento, intent que disparou e tempo de espera.
- **Evidência:**
  - `DirMoveToAgent.js:34-53`.
  - `AnalyticsClient.js` (evento fire-and-forget).
  - `DirIfOnlineAgentsV2.js` checa horário e agentes online antes de decidir.
- **No painel:**
  - Dar às escalações ao N2 um `motivo` em lista fechada: `sem_conhecimento`, `sem_acesso`, `cliente_irritado`, `dinheiro`.
  - Medir o tempo até o N2 responder e mostrar nos Insights.

**F7. Notas internas por conversa.** *Valor médio, esforço P.*
- **O que faz:** nota privada anexada à conversa, que o bot ignora.
- **Evidência:**
  - `ws-requests.service.ts:1172-1201` (`POST /requests/:id/notes {text}`).
  - `utils/permissions.constants.ts:21`.
  - O bot descarta mensagens `subtype === 'private'` em `tybotRoute/index.js:78-80`.
- **No painel:** tabela `notas`. Notas fixadas alimentam a memória por conversa (`memorias.fixo`). Elas **nunca** vão a clientes.

**F8. Respostas rápidas com variáveis.** *Valor médio, esforço P.*
- **O que faz:** título e texto compartilhados, com `$recipient_name` e `$agent_name`.
- **Evidência:** `canned-responses-add-edit.component.ts:42-43`, `services/canned-responses.service.ts:89-101` (`{text,title,shared}`).
- **No painel:** seus textos em PT/EN/中文/ES ganham `$cliente` e `$atendente`, substituídos no cliente antes de mostrar.

**F9. Regras no estilo trigger, só com ações que não enviam.** *Valor médio, esforço M.*
- **O que faz:** `conditions {any|all: [{fact, path, operator, value}]}` mais `actions[]`.
- **Evidência:** `models/trigger-model.ts:1-45`, `services/trigger.service.ts:68-181` (CRUD e reset), `trigger/basetrigger/basetrigger.component.ts:221-230` (fatos como `message.text`).
- **No painel:** tabela `regras` avaliada no `tratar`. Condição: texto contém "saque" ou grupo X. Ação permitida: aplicar tag, subir prioridade, sugerir playbook ou ignorar grupo. Esse último substitui o 🔕 manual. **Não** inclua uma ação "enviar".

**F10. Horário de funcionamento ("está aberto?").** *Valor médio, esforço P.*
- **O que faz:** grade semanal com manhã e tarde, ativável por projeto.
- **Evidência:** `services/project.service.ts:841-853`, `hours/utils.ts:1-20`. O chatbot pergunta `GET /projects/:id/isopen?timeSlot=` em `DirIfOpenHours.js:70-72`.
- **No painel:** seu "horário de trabalho" passa a escolher o rascunho "fora do expediente". Também desconta o fora de turno da "1ª resposta" nos Insights.

**F11. Ficha do contato com propriedades e histórico.** *Valor médio, esforço M.*
- **O que faz:** contato (lead) com propriedades customizadas e lista das conversas dele.
- **Evidência:** `services/contacts.service.ts:95,489-520` (`/leads/:id/properties`), `:643` (`/requests?lead=`).
- **No painel:** ficha por número ou grupo com tenant confirmado, IDs já consultados e conversas anteriores. Cuidado com vazamento entre tenants (bloqueante 3 de `.revisao-plano.md`).

**F12. Insights: mapa semana×hora, espera e custo de tokens.** *Valor médio, esforço M.*
- **O que faz:** analytics de espera, duração, satisfação e mensagens por dia. Gráficos de tokens por agente e por dia.
- **Evidência:** `services/analytics.service.ts:133` (`aggregate/dayoftheweek/hours`), `:144` (`waiting`), `:199-247`, `:335`. `services/knowledge-base.service.ts:428-606` (tokens).
- **No painel:** heatmap de chegada de mensagens e coluna de tokens ou custo por modelo. Isso sustenta a comparação Haiku×Opus da Fase 3.

**F13. Modo de teste (dry-run) com conversas salvas.** *Valor alto, esforço M.*
- **O que faz:** o Tiledesk tem permissão `simulate_conv` e roda "rascunhos" (`draft`) sem contar nos analytics.
- **Evidência:** `utils/permissions.constants.ts:38`, `DirMoveToAgent.js:20,44-46` (só execuções publicadas geram evento).
- **No painel:** reexecutar casos antigos contra uma nova versão do playbook e comparar com o texto que foi enviado. Nada é enviado nem gravado como métrica. Sustenta o A/B da Fase 1 e a aprovação do playbook pelo Samuel.

**F14. Exportar a transcrição (PDF/CSV).** *Valor baixo, esforço P.*
- **Evidência:** `ws-requests.service.ts:1018-1050` (`messages.csv` e `messages.pdf`).
- **No painel:** botão para exportar a conversa como anexo de escalação ou auditoria. Você já gera PDF/JPEG dos Insights, então o `exportar.py` serve de base.

### API do núcleo inferida pelo dashboard

- **Formato:** base `SERVER_BASE_URL + <projectId> + /...`, com cabeçalho `Authorization` em cada chamada. O chatbot usa `'JWT ' + token` (`DirMoveToAgent`, `DirAskGPTV2.js:~403`).
- **Conversas:** `/requests` (lista paginada, `?status=`, `/csv`, `/count`). Por id: `/close`, `/reopen`, `/participants`, `/followers`, `/tag`, `/notes`, `/departments`, `/chatbot/parameters`. `PATCH` para prioridade, status e tags.
- **Cadastros:**
  - `/canned`, `/tags`, `/groups` (inclui `enable` e `disable`) e `/departments` (campos `routing`, `id_group`, `id_bot`, `bot_only`).
  - `/modules/triggers`.
  - `/leads` e `/properties`.
  - `/subscriptions` (webhooks) e `/logs/:canal`.
  - `PUT /projects/:id` com `operatingHours`.
- **Conhecimento:** `/kb/namespace/*`, `/kb/qa` (com `stream`), `/kb/unanswered/*`, `/kb/answered/*`, `/kbsettings`.
- **Analytics:** `/analytics/*` (listados em F12).
- **Limite:** são só caminhos e corpos vistos no cliente. Formatos de resposta e regras do servidor não aparecem.

## 3) Ideias não funcionais (10)

**N1. Redação de segredos nos logs.** *Valor alto, esforço P.*
- `tybotRoute/utils/winston.js:6-77` copia o objeto, mascara chaves como `authorization|token|apikey|password|secret` e tokens `Bearer`. Limita profundidade e nós, e trata referência circular.
- `executions/Checkpointer.js:9,68` nunca grava o token do bot no checkpoint.
- **No painel:** um filtro no logger do `app.py` para cookie do Tamino, token do Evo, CPF e chaves Pix.
- Contra-exemplo: `canned-responses.service.ts:105` loga o `TOKEN` do usuário.

**N2. Falha tem saída segura e timeout limitado.** *Valor médio, esforço P.*
- Toda diretiva tem saída de erro. Se a consulta de horário falha, segue o ramo "falso" (`DirIfOpenHours.js:90-100`). Se a base falha, também (`DirAskGPTV2.js:~410-425`).
- Timeout padrão de 20 s, mínimo 1 ms e máximo 300 s (`DirWebRequestV2.js:98,390-400`). A telemetria usa 3 s e não derruba o fluxo (`AnalyticsClient.js`).
- **No painel:** se o LLM falhar, o card diz "IA indisponível: escalar ou responder à mão" e mostra os casos parecidos (F5), em vez do "Texto padrão". Reduz o risco do `claude -p` de até 180 s travando o pool de 3 workers (`.revisao-plano.md:29`).

**N3. Limite de uso (quota) antes de cada chamada ao LLM, e botão de emergência.** *Valor alto, esforço P.*
- `DirAskGPTV2.js:224-240` consulta a quota antes de chamar, desvia para a saída de erro se estourou, e atualiza o consumo depois (`:458`).
- **No painel:** teto diário de tokens e de chamadas por hora na tabela `cfg`, mais a chave que desliga a IA (`PLANO-TREINAMENTO.md:56`).
- Não achei rate limit de requisições nos repositórios (busca sem resultado). Só quota de tokens.

**N4. Allowlist de ferramentas e segredos de MCP fora do log.** *Valor médio, esforço P.*
- `DirAiPrompt.js:735,822-831` só habilita as ferramentas listadas por servidor. `:802-819` mascara cabeçalhos nos logs, e `:928` sanitiza valores de cabeçalho.
- **No painel:** o servidor MCP do `app.py` ganha uma lista explícita de ferramentas e opção de desligar `enviar_espera`.

**N5. Mensagens privadas e ocultas nunca entram no contexto do LLM.** *Valor alto, esforço P.*
- `tybotRoute/index.js:78-80` ignora mensagens `private`. `TiledeskChatbotUtil.js:630-632,695-699` exclui as de subtipo `info` da transcrição.
- **No painel:** excluir notas, chat do grupo N2 e mensagens de sistema do prompt de rascunho. Hoje as últimas 20 mensagens vão inteiras à IA (`.revisao-plano.md:90`).

**N6. Defesas contra injeção de prompt (e o que evitar).** *Valor alto, esforço M.*
- **Boa prática copiável:** validar a saída do LLM contra um conjunto fechado (`DirAiCondition.js:393-420`). No painel: categoria e `escalar` devem pertencer à lista, e o rascunho nunca dispara ação sozinho.
- **Anti-padrão encontrado:**
  - A transcrição vira texto com marcadores `<user:Nome> ...` e `<bot:Nome> ...` (`TiledeskChatbotUtil.js:623-651`). Depois é relida com regex `(<.*>)` (`:662-680`). Um cliente que escreva `<bot:X> ...` pode forjar um turno do assistente.
  - `tiledeskChatbotPlugs/Filler.js:19-35` substitui `${var}` pelo valor da variável e depois renderiza o resultado como Liquid. Texto do cliente com `{{ }}` pode virar template.
- **No painel:** mensagens em JSON estruturado, texto do cliente dentro de delimitadores marcados como não confiáveis, sem pós-processamento por template.

**N7. Eventos estruturados e versionados.** *Valor alto, esforço M.*
- `AnalyticsClient.js` emite `event_id`, `event_type`, `timestamp`, `source_service`, `event_version` e `payload`, sem derrubar o fluxo.
- **No painel:** tabela local `eventos` com os mesmos campos e payload já mascarado. Alimenta os Insights e a medição da Fase 3 (enviado sem edição, rejeitado, reaberto).

**N8. Retenção e criptografia do que fica guardado.** *Valor médio-alto, esforço M.*
- `executions/config.js` define TTL de checkpoint de 7 dias (`checkpointTtlS: 604800`), limites de bytes por valor e por buffer, e rastreio desligado por padrão.
- `executions/Sealer.js` faz criptografia em envelope: AES-256-GCM com chave embrulhada em RSA-OAEP, para o operador não ler o conteúdo.
- **No painel:** hoje o código nunca apaga nada (`.revisao-plano.md:90`). Adotar prazo de retenção para memórias, notas, casos e eventos, com limite de tamanho. Criptografia em repouso é opcional, e só vale se a autorização do superior a exigir.
- Não encontrei mascaramento de PII nos três repositórios. Seu `mascarar` já está à frente nisso.

**N9. Testes por cenário, não por esqueleto.** *Valor alto, esforço M.*
- O chatbot tem testes mocha com bots e servidores simulados (`tybotRoute/test/conversation-ai_condition_test.js`, `executions_lease_test.js`, `askgptv2_engine_apikey_test.js` e outros).
- O dashboard tem, na maioria, specs vazios: `canned-responses.service.spec.ts` só testa "should be created".
- **No painel:** conversas de ouro com um LLM falso, cobrindo sigilo, escalação, mascaramento e injeção. Troque o `DB` de teste antes, como pede `.revisao-plano.md:42`.

**N10. i18n com arquivo por idioma e fonte única.** *Valor baixo, esforço P.*
- `src/assets/i18n/{en,pt,...}.json` carregados em `app.module.ts:415-417`, idioma escolhido em `app.component.ts:249-265`. `crowdin.yml` usa `en.json` como fonte.
- **No painel:** só importa numa reescrita em Angular. Use a fonte em pt-BR e as traduções das respostas rápidas como arquivos separados.

## 4) O que NÃO copiar

- **Multi-tenant e negócio SaaS.**
  - O `projectId` está em todas as URLs, e há papéis e permissões granulares (`utils/permissions.constants.ts`).
  - Também há Keycloak, Stripe, planos, brand e Sleekplan (`services/keycloak.service.ts`, `quotes.service.ts`, `brand.service.ts`).
  - Você tem um agente e um backoffice.
- **Infraestrutura pesada.**
  - `tiledesk/docker-compose/docker-compose-latest.yml:6-325` sobe dashboard, design studio, widget, ionic, chatbot, server, chat21, dois backends LLM, proxy, qdrant e rabbitmq. Os charts do Helm incluem mongodb, postgresql, redis e rabbitmq.
  - O engine de execuções usa lease, retomada e RabbitMQ (`executions/*.js`). Isso é para vários pods.
  - Você só tem Python stdlib e sqlite.
- **O motor visual de fluxos.** São mais de 80 diretivas (`directives/`) e o Design Studio. Seu domínio é um playbook de texto.
- **Qualquer envio automático.** Conflita com a regra do clique:
  - `DirReply*`;
  - broadcast de WhatsApp (`services/automations.service.ts:123-157`);
  - `bot_only` em departamentos (`department.service.ts:280-283`);
  - triggers com ação de enviar.
  - A autonomia gradual só entra com o interruptor do `PLANO-TREINAMENTO.md`.
- **Dependências e padrões ruins.**
  - `vm2` (`package.json` do `tybotRoute`) é descontinuado e teve fugas de sandbox.
  - O dashboard está em Angular 15 com rxjs 6, firebase 7, três bibliotecas de gráfico (apexcharts, echarts, chart.js) e HashLocationStrategy.
  - O token JWT fica no `localStorage`, vai em cada serviço e é logado.
  - O chatbot mistura callbacks e promises em arquivos de mais de 1000 linhas. No dashboard, `ws-requests-msgs.component.ts` tem 8375.
- **Endpoints sem autenticação no chatbot.**
  - `index.js:547-561` devolve todos os parâmetros da requisição com `?all`. O código do `Checkpointer.js:9` indica que esses parâmetros incluem o token do bot.
  - `index.js:563-575` tem um id de projeto fixo no código.
  - `index.js:5` liga `cors()` aberto.
  - `GET /message/context/:id` (`:534`) também não exige autenticação.
- **Higiene do repositório.** `tybotRoute/dump.rdb` (dump de Redis) está versionado no git. Seu `.env` e sua pasta de dados dão acesso admin ao backoffice, então mantenha-os fora do git.
- **URLs fixas.** `services/openai.service.ts:36-38` tem endpoints do GPT no código.

## 5) Notas de arquitetura para uma reescrita

**Dashboard (Angular 15, módulos).**
- **Rotas e módulos.**
  - `app.routing.ts:176-259` carrega cada área com `loadChildren`, guardada por `AuthGuard`. Exemplo: `canned-responses/canned-responses-list.module.ts:11-31` (`RouterModule.forChild`, `SharedModule`, `TranslateModule`).
  - Papel por rota via `data.roles` em `core/role.guard.ts:41-60`.
- **Estado.**
  - Sem NgRx. O estado vive em `BehaviorSubject` dentro de `core/auth.service.ts:68-76` (`user_bs`, `project_bs`).
  - Cada serviço assina `user_bs` e `project_bs` para guardar token e projeto (`canned-responses.service.ts:14-46`). Esse trecho se repete em dezenas de serviços.
- **Configuração e interceptor.**
  - Configuração em tempo de execução via `APP_INITIALIZER` (`app.module.ts:793-798`) e `services/app-config.service.ts:20-40` (usa `HttpBackend` para pular interceptors).
  - O único interceptor (`services/interceptor/log-requests.interceptor.ts`) mede tempo. Não coloca o `Authorization`.
- **Outros pontos.**
  - Logger com níveis em `services/logger/logger.service.ts:25-60`.
  - Caches em `services/cache/*.ts`.
  - Conversa é um iframe do app Chat21 (`services/conversation-detail-iframe.service.ts`). Em Angular você faria o painel de conversa por conta própria.
- **O que levar para uma reescrita.**
  - Angular recente com componentes standalone e signals.
  - Um `ApiClient` único e interceptor funcional para o token.
  - Pastas por feature: Fila, Conversa, Insights, Consultas, Config.
  - Guards para a rota de configurações.
  - `ngx-translate` só se precisar de vários idiomas.

**Chatbot (Node), camadas reaproveitáveis como ideia.**
- **Borda HTTP.** `tybotRoute/index.js:51` (`/ext/:botid`) e `:309` (`/exec/:botid`).
- **Domínio e estado.** `engine/TiledeskChatbot.js`.
- **Porta de dados de intents.**
  - Interface em `engine/TiledeskIntentsMachine.js`.
  - Adaptador Mongo em `MongodbIntentsMachine.js` e `MongodbBotsDataSource.js`.
  - Fábrica em `IntentsMachineFactory.js`.
  - Duplo de teste em `engine/mock/`.
- **Clientes de saída.** `services/*.js` (`KbService`, `QuotasService`, `IntegrationService`, `RequestService`, `McpOAuthTokenService`).
- **Pipeline de saída.** `tiledeskChatbotPlugs/MessagePipeline.js` encadeia plugs (`Filler`, `MarkbotChatbotPlug`, `SplitsChatbotPlug`, `WebhookChatbotPlug`).
- **Ações.** `tiledeskChatbotPlugs/directives/Directives.js` é um registro, com uma classe por ação (`execute(directive, callback)`).
- **Transversais.** `executions/` (gravação, checkpoint, selagem, aborto) e `utils/winston.js` (log).

**Como isso mapearia no seu `app.py` numa reescrita.**
- **Portas (interfaces):**
  - Canal de chat (adaptador Evo).
  - Backoffice (adaptador Tamino, só leitura).
  - LLM (adaptadores `claude -p` e API Anthropic).
  - Armazenamento (sqlite).
  - Notificação.
- **Domínio:** Conversa, Rascunho, Escalação, Memória, Playbook, Caso. Sem I/O.
- **Casos de uso:** `tratar_conversa`, `preparar_resposta`, `abrir_escalada`, `fechar_escalada`, `rodar_dry_run`.
- **Pipeline de rascunho:** mascarar, validar sigilo, validar contra lista fechada, corretor. Cada etapa é uma função pura, como os plugs. Falhas terminam em saída segura (N2).
- **Tarefas assíncronas:** o executor de 1 thread para memória que `.revisao-plano.md:30` propõe equivale ao isolamento de pods do Tiledesk, em pequeno.

---

Não li o `tiledesk-server`, o `design-studio`, as imagens Enterprise nem os pacotes npm, e não resolvi a contradição MIT×AGPL do dashboard. Não gravei arquivo de plano, porque você pediu para não alterar nenhum arquivo e a ferramenta de saída do modo de planejamento não estava disponível.

**Handoff**
- **Resultado:** relatório acima, com licenças, 14 funcionalidades, 10 ideias não funcionais, lista do que não copiar e notas de arquitetura.
- **Evidência:** li os três documentos da Tamino. No Tiledesk, li `LICENSE`, `publiccode.yml`, `package.json` e o `docker-compose` do `tiledesk/`, os serviços e módulos do dashboard citados, e as diretivas, o `index.js` e `executions/` do chatbot.
- **Arquivos alterados:** nenhum.
- **Verificações:** nenhuma execução. Só leitura e `grep -n` para confirmar linhas.
- **Falhas:** o hook `rtk` encurtou algumas saídas, então reli os trechos críticos com `rtk bypass`. Alguns comandos foram reescritos pelo hook e eu os reenviei como a mensagem pedia. Os números de linha de `DirAskGPTV2.js:~403` e `:~410-425` são aproximados.
- **Riscos:** a divergência MIT×AGPL fica em aberto. A API do núcleo é inferida só do cliente.

STATUS: DONE_WITH_CONCERNS
SUMMARY: Estudo em pt-BR dos três repositórios do Tiledesk (MIT, mas com AGPL declarada no `publiccode.yml` do dashboard) com 14 funcionalidades, 10 ideias não funcionais, lista do que não copiar e notas de arquitetura, sem alterar arquivos.
