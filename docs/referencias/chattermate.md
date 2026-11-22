# Estudo do ChatterMate para o painel de suporte da Tamino

Li só os arquivos e não alterei nada. O repo está em `/tmp/claude-1000/.../scratchpad/repos/chattermate`, e os caminhos abaixo são relativos a `backend/`.

## 1) Licença e reuso

- **Licença do que li:** Apache-2.0. O `LICENSE` na raiz é o texto padrão, e o `NOTICE` diz "Copyright 2024-2026 ChatterMate". O README (linhas 774-782) descreve o modelo "open-core".
- **Cabeçalhos:** todo `.py` que li (`app/agents/*`, `app/utils/*`, `app/services/*`, `app/workers/*`, `app/crm/*`) tem o cabeçalho Apache-2.0.
- **Pastas com licença diferente:** existem `backend/app/enterprise` e `frontend/src/modules/enterprise`. São submódulos git privados, declarados em `.gitmodules`: `chattermate/enterprise_backend` e `chattermate/enterprise_frontend`.
  - Estão **vazios neste checkout**, então não li nada deles.
  - O `relicense_headers.py:33-36` os chama de "proprietary enterprise submodules — licensed separately".
  - Não há pasta `ee/`.
  - Não existe outro arquivo `LICENSE` no repo, fora do `LICENSE` da raiz.
- **Consequência para `journeys`:** em `app/journeys/` só existe um `__init__.py` vazio. O modelo (`app/models/journey.py`) e o schema (`app/models/schemas/journey.py`) são abertos. A lógica de execução provavelmente está no enterprise e eu não a li.
- **Pode reusar?** Sim, ideias e código, inclusive em uso comercial e fechado, sem copyleft. Para copiar código literal:
  - mantenha o cabeçalho de copyright e inclua o texto da licença;
  - marque as alterações que fizer (Apache §4);
  - a licença tem concessão de patente.
- **Ideias e prompts** não têm restrição prática.
- **Para código literal** (por exemplo `guardrail_policy.py`, `structured_output.py`), a Apache-2.0 manda manter o aviso e declarar mudanças. Se o painel for privado, isso é só um comentário no topo do arquivo.
- **Cuidado:** nunca copie nada de `app/enterprise` nem do `frontend/.../enterprise`. Se um dia aparecerem no seu checkout, a licença deles é outra e não está neste repo.

## 2) Funcionalidades para adotar (15)

| # | O que faz | Evidência | Como mapeia no painel | Valor | Esforço |
|---|---|---|---|---|---|
| 1 | **Regra "ferramenta ou pessoa?"**. Antes de qualquer ferramenta, 4 perguntas na ordem: pediu humano? Precisa de alguém que decida? Uma ferramenta resolve? Um "sem match" na primeira vez não é falha. | `app/agents/handover_prompt.py:59-65`; `46-49`; `22-27` | Vira o bloco do `SISTEMA` (`app.py`). A decisão "escalar ao N2" fica explícita, e um primeiro ID sem resultado pede para conferir antes de escalar. | alto | P |
| 2 | **Motivo de transferência como enum com descrição** (`UNABLE_TO_ANSWER`, `KNOWLEDGE_GAP`, `FRUSTRATED`, `HIGH_PRIORITY_ISSUE`…). | `app/models/schemas/chat.py:45`, `313-314` | Preenche `escalacoes.motivo` com valores fechados (`no_access`, `knowledge_gap`, `tool_failure`…). Dá a quebra por categoria da Fase 3. | médio | P |
| 3 | **Histórico limitado por orçamento de caracteres.** Troca resultados antigos de ferramenta por um stub, descarta os turnos mais antigos e reenvia sem histórico se o provedor reclamar de tamanho. | `app/agents/history_memory.py:146-162`; `104-143`; `55-58` | Aplica-se ao prompt das últimas 20 mensagens (`app.py` ~554) e à memória por conversa. São funções puras sobre listas, portáveis em stdlib. | médio | P |
| 4 | **Contrato de memória do cliente.** É uma porta (`Protocol`) com `enabled/recall/note_activity`, e a falha nunca bloqueia a resposta. O contexto vem cercado como dado não confiável, em cache de 30 min, com no máximo 10.000 entradas. | `app/services/customer_memory.py:67-80`; `105-114`; `49-52`, `136-150` | Mantém o contrato da sua memória v1: ela só enriquece e nunca derruba o rascunho. Adicione TTL no cache de leitura. A chave "só identidade provada" (linhas 22-28) vira "só a mesma conversa/tenant". | médio | P |
| 5 | **Casos parecidos com redação.** Busca por similaridade (limite 5, mínimo 0,70), passa o texto por `redact_reference_text` e rotula como "de OUTROS clientes, só pelo padrão". | `app/workers/ticket_investigator.py:76-98`; `app/agents/ticket_investigator.py:354-360`; `app/services/ticket_privacy.py:105-117` | É a Fase 2 do PLANO ("5 casos parecidos"), com FTS5 no lugar de pgvector. Mascarar antes de gravar e de montar o prompt, e rotular. Isso resolve o bloqueante 3 da revisão (vazamento entre tenants). | alto | M |
| 6 | **Escada de autonomia com travas em código.** L1 só informa, L2 cria proposta, L3 resolve sozinho. L3 exige run completo, hipótese validada, confiança ≥ limiar e cliente alcançável. Qualquer falha cai para L2. | `app/workers/ticket_investigator.py:262-323` | Desenha os níveis 0/1/2 da Fase 4. Use o gate (confiança, "nunca automático", reachability) e **fique em L2** (rascunho/proposta). Ver item 4 da seção 4. | alto | M |
| 7 | **Triagem estruturada** (título, prioridade, gravidade, intenção, resumo, ≤2 tags, confiança 0-1) com bloco "UNTRUSTED USER REPORT". | `app/agents/ticket_investigator.py:50-69`; `336-362` | Cada card ganha `categoria`, `prioridade`, `confianca`. É a base das métricas por categoria da Fase 3 e do "nunca automático se irritado". | alto | M |
| 8 | **Investigação por hipóteses.** Propõe 2-5 causas testáveis. Testa uma por vez com ferramentas só de leitura, com orçamento de chamadas, e devolve `validated/invalidated/inconclusive` com confiança e log de evidências. | `app/agents/ticket_investigator.py:76-114`; `393-418`; `app/workers/ticket_investigator.py:372`, `403` | "Saque pendente" vira: hipóteses (aguardando provedor, chave inválida…), consultas read-only ao backoffice e uma conclusão citando a evidência. Só vale com ferramentas de consulta já maduras. | médio | G |
| 9 | **Linter determinístico do que sai ao cliente.** Remove identificadores de terceiros por regra (nunca depende só do prompt) e mantém os do próprio destinatário. | `app/services/ticket_privacy.py:36-42`, `66-102`; `app/agents/ticket_investigator.py:138-145` | Selo "⚠ viola sigilo" no rascunho se aparecer provedor, código HTTP, limite, TPM ou ID de outro tenant. A regra do README vira teste em código, não só frase no prompt. | alto | P-M |
| 10 | **Gerador de playbook/FAQ ancorado em evidência.** "Nunca invente fatos", lista das já existentes para não duplicar, categorias reaproveitadas, e entradas malformadas descartadas em vez de falhar o lote. | `app/agents/faq_generator.py:105-115`; `184-193`; `300-317` | É o "playbook semanal" da Fase 2: o Opus lê os casos novos e propõe regras, sem repetir as atuais. O resultado entra como proposta, e só vale depois da aprovação do Samuel. | alto | M |
| 11 | **Resumo/título por conversa, uma vez só.** Um `UPDATE … WHERE titled_at IS NULL … RETURNING` reivindica a conversa, com janela de 2 dias e lotes de 10. | `app/services/conversation_titles.py:52-103`; `app/workers/conversation_titler.py` | Título curto na lista e no histórico. Reaproveite o padrão "reivindicar com UPDATE condicional" para memória e escalação. | baixo | P |
| 12 | **Analytics com variação contra o período anterior**, separando fechadas pela IA e por humano. | `app/api/analytics.py:205-213`, `215-236`, `338-339` | Cada gráfico dos Insights mostra a variação contra o turno anterior. A Fase 3 vai além disso, porque o ChatterMate não mede edição nem 1ª resposta. Atenção: `between(prev_start, start_date)` conta a linha da fronteira em dois períodos. | médio | P |
| 13 | **Handoff decidido em código, LLM só redige.** Dentro/fora do horário e agentes disponíveis decidem; o modelo só escreve o texto; no timeout há frase fixa. | `app/agents/transfer_agent.py:34-38`, `148`, `158-167`; `app/utils/business_hours.py` | Liga o ⏱️ Ponto e o horário ao rascunho "Genérico (segurar)", que muda conforme o expediente. | médio | P |
| 14 | **Parser JSON tolerante a truncamento.** Fecha strings e colchetes e descarta o último fragmento até parsear. Também recupera os campos de um erro de provedor. | `app/agents/structured_output.py:60-125`, `128-157` | Substitui parsing frágil do `claude -p`. É só `json`/`re`, cabe no `app.py` e vale para rascunhos A/B e playbook. | médio | P |
| 15 | **Causa da falha → conselho específico.** Cada causa tem seu texto, e o desconhecido cai numa mensagem genérica sem vazar detalhe interno. | `app/knowledge/failure_advice.py:30-112`, `121-130` | No rascunho "Texto padrão", mostrar a causa real (Claude deslogado, chave inválida, timeout) em vez de um aviso único. Ajuda a resolver a "Solução de problemas" do README. | médio | P |

## 3) Ideias não funcionais (10)

| # | Ideia | Evidência | Como mapeia | Valor | Esforço |
|---|---|---|---|---|---|
| N1 | **Defesa contra injeção por estrutura.** O bloco de política é código, fica no topo e tem âncora no fim. Todo texto não confiável entra cercado em `<<< >>>` e sem os delimitadores. O fail-open é por design. | `app/agents/guardrail_policy.py:121-126`; `163-170`; `278-316`; `319-341` | Cercar a mensagem do cliente, a resposta do N2 e o campo `falta` no `SISTEMA`. Isso cobre o risco do `n2_auto` apontado na revisão. Para nós, fail-open é aceitável porque o humano revisa. | alto | P |
| N2 | **Detector de injeção em duas camadas, contando antes de bloquear.** Tokens de template do chat e frases de "ignore as instruções" pontuam forte, as fracas pesam 0,25 e caem pela metade perto de código/log. Há modos `off`, `template_only` e `strict`. A saída é checada por "canários" que denunciam vazamento do prompt. | `app/utils/guardrails.py:150-160`, `165-182`, `277-278`; `app/utils/guardrail_runtime.py:179-242`; `245-285`; `guardrail_policy.py:72-77` | Com click-to-send não precisa bloquear: basta um selo "possível injeção" no card e um contador. **Os padrões são só em inglês**, então escreva equivalentes em pt-BR ("ignore as instruções anteriores", "revele seu prompt"). | médio | P |
| N3 | **Redação de segredos com validação.** Chaves por formato, "senha: …" e cartão só se passar no Luhn. | `app/utils/secret_redaction.py:27-66` | Aplicar antes de gravar casos e memórias e antes de enviar ao LLM. Estenda para CPF e CNPJ com dígito verificador. Isso evita os falsos positivos de 14 dígitos que a revisão apontou. | alto | P |
| N4 | **PII com política por tipo.** "Sempre redigir" (SSN, cartão, nascimento) versus "só o dono vê" (e-mail, telefone). Telefone só conta com ≥ 7 dígitos. | `app/services/ticket_privacy.py:36-63`; `app/utils/guardrails.py:75-83` | O detector deles é dos EUA (SSN, telefone americano). Troque por CPF, CNPJ, chave Pix e celular BR. Ao mascarar o que é gravado, preserve o que o N2 precisa para consultar (bloqueante 1 da revisão). | alto | M |
| N5 | **Retenção e apagamento.** Expurgo diário por `RETENTION_DAYS`. O apagamento remove cada tabela filha antes da pai, por e-mail ou telefone, e devolve só contagens. Há um teste de "pegada" que semeia todas as tabelas. | `app/workers/journey_data_purge.py:35-59`; `app/services/customer_erasure.py:16-30`, `99-121`; `tests/erasure_footprint.py:40-74` | Hoje o painel nunca apaga nada. Adicione `retencao_dias` (memórias, casos, escalações) com expurgo no vigia e um "esquecer cliente". Teste que, depois de apagar, não sobra linha. Necessário antes de ligar o PLANO. | alto | M |
| N6 | **Cifragem em repouso do espelho da conversa**, e logs que guardam só IDs de regra (o trecho cifrado fica em outra coluna). | `app/agents/encrypted_storage.py:16-25`, `67-72`; `app/utils/guardrail_runtime.py:111-123` | O `fila.db` guarda texto de clientes. Em stdlib não há cifra forte: ou aceite a dependência `cryptography`, ou use permissão 600 e disco cifrado. Em logs, grave regra/ação e nunca o trecho. | médio | M |
| N7 | **Observabilidade.** Linha de log primeiro, depois um evento append-only com IDs de regra estáveis. A contagem de chamadas e tokens é registrada em todos os caminhos, inclusive timeout e erro. | `app/utils/guardrail_runtime.py:111-152`; `app/agents/ticket_investigator.py:176-185`, `215-237`; `app/workers/ticket_investigator.py:206-216` | Tabela `ia_eventos` (camada, regra, conversa, tokens, ms, causa). Alimenta o custo por categoria (Fase 3) e mostra os "Texto padrão". | alto | P-M |
| N8 | **Orçamento de tempo e de chamadas.** Cada execução tem timeout, e o fallback é frase fixa. O limite de ferramentas é por hipótese. O rate limit do repo é Redis por org+IP e **não vale copiar** (`get/setex/incr` não é atômico, `app/utils/rate_limit.py:81-100`). | `app/agents/transfer_agent.py:153-167`; `app/agents/ticket_investigator.py:301-310`; `app/workers/ticket_investigator.py:52` | Um executor de 1 thread para a memória (`.revisao-plano.md`), no máximo N chamadas de IA por conversa por hora, e `claude -p` sempre com timeout. | médio | P |
| N9 | **Concorrência e retentativa.** Reivindicação atômica com `UPDATE … RETURNING`, e a aprovação humana só segue com `claim(...)` verdadeiro. Há lock por chave e classificação de erro (401 renova, 429 respeita `Retry-After`, 5xx tenta de novo) com backoff e jitter. Se a conexão morreu, o resto do lote falha rápido. | `app/services/host_action_runtime.py:295-296`; `app/utils/keyed_lock.py:21-33`; `app/crm/base.py:110-128`; `app/utils/backoff.py:11-22`; `app/workers/crm_sync.py:68-90` | Resolve em sqlite o bloqueante 2 da revisão (escalação duplicada e envio em dobro) com `UPDATE … WHERE status='enviada'` e checagem de `rowcount`. Use a mesma classificação para Evo e Tamino. | alto | P |
| N10 | **Estratégia de testes em camadas.** Contrato de "o que NÃO detectar" sustentado um a um por testes. A suíte viva fica fora do CI e confere evidência objetiva (token proibido, canário, instruções do próprio agente). Cada execução tem timeout. | `app/utils/guardrails.py:136-148`; `tests_live/README.md:40-43`, `54-58`, `59-63`; `tests/README.md` | O `uv run app.py teste` hoje grava no `fila.db` real (revisão 0.4). Injete o caminho do banco. Faça uma suíte "ao vivo" separada, com casos reais mascarados e checagem do "sigilo" (item 9). | alto | M |

Sobre i18n: o repo não tem biblioteca de i18n no frontend. Só encontrei a decisão de responder "na língua do visitante" (`guardrail_policy.py:50-53`). Para o painel, o ganho é escrever as regras de segurança em pt-BR.

## 4) O que NÃO copiar

1. **Multi-tenant, planos e feature gate.** `app/services/feature_gate.py`, `agent_quota.py`, `usage_metering.py`, `app/enterprise` e o espelhamento por organização. Seu painel tem 1 atendente e 1 empresa.
2. **Postgres, pgvector, Redis, agno e dezenas de dependências.** Veja `requirements.txt`: agno, onnxruntime, opencv, google-cloud-aiplatform, firebase_admin e outras. Isso contradiz "stdlib + sqlite, 1 arquivo". Aproveite as ideias (FTS5 no lugar de pgvector) e não as bibliotecas.
3. **Rate limit e sanitizador regex.** `app/utils/rate_limit.py` precisa de Redis e não é atômico. O `app/utils/sanitize.py:63-164` é uma lista negra de tags e eventos; use `html.escape` com `quote=True`, como a revisão já pede.
4. **Autonomia L3 e envio sem clique.** `workers/ticket_investigator.py:297-312` resolve e avisa o cliente sozinho. Isso fere a regra "nada sai sem o clique". Pegue só o gate de confiança como desenho de proposta (item 6).
5. **Fluxos automáticos do canal.** `app/channels/*` fala com Meta/Slack/Telegram e `app/services/channel_chat.py` responde sozinho. O seu fluxo parte de um Evo CRM e não tem equivalente aqui.
6. **O módulo `crm/` não é um leitor de conversas.** Ele empurra leads para HubSpot/Pipedrive e não lê WhatsApp. Só serve de molde para tratamento de erro (N9).
7. **Conector de SQL do investigador.** `sql_guardrails.py` e `db_connector_service.py` com túnel SSH e `paramiko` são pesados e só se justificam se você for dar SQL direto ao modelo. O backoffice da Tamino é API, então não precisa.
8. **Crawlers e ingestão web** (`enhanced_website_reader.py`, 67 KB). O conhecimento do suporte é interno.
9. **`journeys`.** São guias dentro do widget do cliente final. A execução está no enterprise, fora do repo, e não serve para o seu fluxo.
10. **Frontend Vue/TS e widget.** O painel é HTML servido pelo `app.py`.

## 5) Notas de arquitetura para uma reescrita

O ChatterMate é bem separado em camadas. Para a Tamino, copie o recorte de módulos e deixe as dependências de fora.

| Camada | Onde está no ChatterMate | O que levar |
|---|---|---|
| **Prompts puros, sem I/O** | `app/agents/handover_prompt.py`, `guardrail_policy.py`, `choice_prompt.py` | Módulos de texto e funções puras, versionadas (`POLICY_VERSION`, `guardrail_policy.py:41`). Viram `prompts/` com testes sem rede. |
| **Domínio** | `app/models/schemas/chat.py`, `models/schemas/investigation.py` | `ChatResponse` e enums de motivo (`TransferReasonType`). Modelos pequenos validados (pydantic ou dataclass) em vez de dicts soltos. |
| **Portas (interfaces)** | `app/services/customer_memory.py:67-80` (`Protocol`), `app/crm/base.py:131-163` (ABC), `app/channels/*` | Uma porta por dependência externa: `Conversas` (Evo), `Backoffice` (Tamino), `LLM`, `Memoria`. Cada adaptador é um singleton sem estado, e os tokens entram em cada chamada (`crm/base.py:131-134`). |
| **Adaptadores** | `app/crm/hubspot.py`, `pipedrive.py`, `registry.py`; `app/utils/agno_utils.py:create_model` | Uma fábrica por provedor (`claude -p`, API Anthropic) atrás da porta `LLM`, com a mesma classificação de erro (`CrmPushResult`: `retryable`, `auth_failed`). |
| **Casos de uso / serviços** | `app/services/*` (`customer_erasure.py`, `ticket_privacy.py`, `conversation_titles.py`) | Funções que só encenam e quem chama faz o commit (`customer_erasure.py:27-29`). Facilita o envio sem duplicar mensagem (bloqueante 7 da revisão). |
| **Guardrails como camada** | `app/utils/guardrails.py` (detecção pura) + `guardrail_runtime.py` (política, registro, fail-open) | Separar "detectar" de "decidir e registrar". Os modos (`off/template_only/strict`) ficam em config e não no código. |
| **Workers** | `app/workers/*` com laço próprio e intervalo por variável de ambiente | No painel: um executor para rascunho e outro (1 thread) para memória. Cada tarefa reivindica o trabalho por `UPDATE … RETURNING`. |
| **Persistência** | `app/repositories/*`; migrations em `alembic/` | Um `Repo` por agregado. No sqlite, uma tabela `schema_versao` e migrações numeradas, em vez de recriar o esquema a cada chamada (revisão: `db()` em 424-441). |
| **Testes** | `tests/` espelha `app/`; `tests/conftest.py`; `tests_live/` fora do `testpaths` | Espelhar a estrutura, injetar o caminho do banco e manter a suíte ao vivo separada do CI. |

Pontos que valem a pena imitar:
- Passe valores simples (dataclass congelado) para a montagem do prompt, nunca objetos de banco (`guardrail_policy.py:103-118`, comentário "plain scalars captured while the DB session is still open").
- Registre tudo no formato "log primeiro, banco depois, regra por ID" (`guardrail_runtime.py:111-152`).
- Faça cada defesa falhar de modo explícito e documentado: "a guardrail bug must degrade to no guardrail, not no chat" (`guardrail_policy.py:324-325`). No seu caso a falha segura é cair para "pedir revisão", porque o humano é o último filtro.

## Handoff

- **Resultado:** relatório acima, com licença, 15 funcionalidades, 10 ideias não funcionais, anti-recomendações e notas de arquitetura.
- **Evidência:** li o `LICENSE`, o `NOTICE`, o `.gitmodules` e o `relicense_headers.py`. Li também os 7 módulos de `app/agents` pedidos (mais o `choice_prompt.py` só no tamanho), `app/utils/guardrails.py`, `guardrail_runtime.py`, `secret_redaction.py`, `rate_limit.py`, `sanitize.py` (até a linha 164) e vários serviços e workers. Dos seus documentos li o README, o PLANO-TREINAMENTO e o `.revisao-plano.md`.
- **Arquivos alterados:** nenhum. Não escrevi o arquivo de plano do modo plano porque você pediu para não mudar arquivos.
- **Checagens:** só leitura, sem rodar nada.
- **Falhas:** chamadas do `Bash` com `rtk` e `wc` foram bloqueadas pelo classificador do modo automático. Continuei com `Read` e `grep`.
- **Riscos:**
  - Não li o `chat_agent.py` por inteiro (94 KB, só pontos específicos), nem `api/analytics.py:1-180`, `crm/hubspot.py` e `pipedrive.py`, nem `knowledge/enhanced_website_reader.py`.
  - A aplicação real de `journeys` e dos módulos enterprise está fora do repo e **não foi verificada**.
  - Linhas citadas conferem com o checkout atual.
  - Os esforços (P/M/G) e valores são estimativas minhas.

STATUS: DONE_WITH_CONCERNS
SUMMARY: ChatterMate é Apache-2.0 e pode inspirar o painel, e entreguei 15 funcionalidades, 10 ideias não funcionais, o que não copiar e as notas de arquitetura. A parte enterprise e a execução de journeys estão fora do repo e não foram lidas.

Não verifiquei o que fica nos submódulos enterprise. O maior risco é copiar padrões que dependem de Redis/Postgres ou de autonomia sem clique, que pesam mais do que o ganho.
