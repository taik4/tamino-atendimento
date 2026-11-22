# Revisão de `.plano-revisao.md` contra `app.py` (e7c4db5)

As linhas que o plano cita batem com o código (db 424-442, preparar_resposta 489-513, SISTEMA 517-537, form_n2 1737-1746, fila 2467-2485, do_POST 2973/2979/2995, vigia 913-956). Os problemas estão no comportamento, não nos endereços.

## Bloqueantes

1. **A4 / 0.2: a pergunta ao N2 sai mascarada.** `abrir_escalada` grava a `pergunta` mascarada e `enviar_escalada` envia esse texto, então o N2 recebe `8a1c03b5…` e `[EMAIL]`. Ele precisa do ID inteiro para consultar o backoffice e do e-mail para criar o convite, que é tarefa do N2 (app.py:2750). Hoje o `form_n2` manda o texto cru ao grupo interno (1744, 2980).
   - **Correção:** montar a pergunta sem máscara na hora do envio e mascarar só o que fica gravado.
2. **A4 / A6: corrida cria escalações e respostas em dobro.** O pool tem 3 workers (695).
   - Dois `tratar` da mesma conversa (947), ou um `tratar` junto com um "Gerar rascunho" (2987), podem rodar ao mesmo tempo o select→insert de `abrir_escalada` e gravar duas escalações vivas.
   - Duas mensagens seguidas do N2 disparam dois `ligar_respostas_n2` (944), e cada um chama `preparar_resposta`.
   - **Correção:** índice único parcial `on escalacoes(conversa) where status in ('aberta','enviada','respondida')` com upsert. Para a resposta, `update ... where id=? and status='enviada'`, seguindo só se `rowcount == 1`.
3. **B4 / A7: `casos` vaza dados entre tenants (só se o B4 ficar na v1).** O caso com `origem="n2"` guarda a `pergunta_n2`, que começa com `[{nome}]` e traz a linha `Tenant:`. O `mascarar` não tira nome, valor nem data. `casos_parecidos` ordena por tenant, mas não filtra, então traz casos de outros tenants para o prompt de outro cliente. O `redigir` só remove `tenants` dos resumos (556).
   - **Correção:** cortar o B4, ou gravar só a mensagem do cliente mascarada e filtrar por `tenant` confirmado.

## Importantes

- **A4/A5: `conv_n2()` depende do FEED.** Ele só procura o grupo no `FEED` (724), que tem as 25 conversas mais recentes (796) e fica vazio no processo MCP (960, sem vigia).
  - Com o grupo fora da 1ª página, "Enviar ao N2" falha e as escalações ficam presas em `aberta`.
  - **Correção:** guardar o id do N2 em `cfg` quando ele aparecer no feed e usar como fallback.
- **A3/A5: o próprio grupo N2 pode escalar para si mesmo.** "Gerar rascunho com IA" aparece em qualquer conversa, inclusive no grupo N2 (2773 → 2985-2987). Se o modelo emitir o marcador, roda `abrir_escalada(conv=n2)`.
  - **Correção:** `abrir_escalada` sai cedo se `eh_n2(nome)` ou `conv == conv_n2()`.
- **A3.4: escalação `respondida` fica presa.** Se o card com a resposta do N2 for descartado (3004-3005) ou substituído (447), a escalação continua `respondida`. Isso desliga toda escalação nova da conversa até alguém clicar em "Concluir".
  - **Correção:** descartar o card encerra a escalação, ou o A3.4 vale só por um prazo de horas.
- **A6: o casamento `unica` erra num grupo compartilhado.** J.L e Daniel também usam o grupo N2. Qualquer mensagem do N2 depois do envio vira "a resposta", gera um card novo e trava o vínculo automático.
  - **Correção:** na v1, `unica` só sugere o vínculo e não chama `registrar_resposta_n2`.
- **A7: erro depois do envio pode duplicar a mensagem ao cliente.** O `try` envolve o `evo_enviar` (2996-3000, 2977-2990). Se `fechar_escalada` ou `gravar_caso` falharem dentro dele, o painel mostra 502 "Falhou" com a mensagem já entregue, e o atendente dispara de novo.
  - **Correção:** chamar depois do `try`, num `try/except` próprio que só registra no log.
- **B3: a memória disputa o pool com os rascunhos.** O pool de 3 threads (695) já recebe um `coletar_insights` a cada volta do vigia (931), e o `claude -p` pode levar até 180 s (593). Três atualizações de memória atrasam em minutos o rascunho de uma mensagem nova.
  - **Correção:** 1 atualização por varredura, num executor próprio de 1 thread.
- **B3: a primeira varredura tem fila enorme.** `ENVIOS_PAINEL` inclui `importado` (1827) e conversas sem memória têm `atualizado` nulo, então entra todo o histórico.
  - **Correção:** só envios das últimas 24 h.
- **A3.3: falha do Tamino escala todas as conversas.** Com o Tamino fora do ar (915-921) ou o lookup em 403, toda conversa com ID vira escalação.
  - **Correção:** `tool_failure` vira só alerta; `no_access` escala uma vez por conversa.
- **A4: `n2_auto` abre um caminho de injeção.** O `falta` é texto do modelo influenciado pelo cliente e sairia no grupo interno como se fosse do atendente, sem clique.
  - **Correção:** cortar na v1.
- **A5/A6: XSS no HTML novo.** O `falta`, a `resposta` do N2 e os textareas pré-preenchidos precisam de `html.escape`, e os atributos `onclick` precisam de `quote=True` (padrão de 1299 e 1378). A prova do plano só cobre o `memoria_html`.
- **0.4: o arcabouço do teste vaza para fora.**
  - Os asserts antigos continuam no `fila.db` real (3100 → `cfg` → `db()`).
  - O `cfg` cai no ambiente (709), então `N2_AUTO`/`MEMORIA_AUTO` exportados mudam o resultado.
  - Com `ANTHROPIC_API_KEY`, a prova do B5 chama a API real (562-564).
  - **Correção:** trocar o `DB` no início, limpar essas chaves do ambiente e trocar `_redigir_api` também.

## Menores

- **Telefone e CNPJ:** o `RE_TEL` não pega `(11) 91234-5678` nem `11 91234-5678`, e qualquer número de 14 dígitos vira `[CNPJ]` (testei em memória).
- **Referência `#E`:** `"#E1" in texto` casa com `#E12`. Usar `#E{id}\b`.
- **Ids do Evo:** são uuids em texto (2289, 2980). Comparar com `str()` e ordenar por posição depois de `msg_n2`, não por `ts > enviado`, que mistura o relógio do Evo (314) com o local.
- **`pode_auto_n2`:** testa o motivo, mas não recebe o motivo.
- **`separar_escalada`:** precisa aceitar `None` (505-507).
- **`consultar_seguro`:** montar o resumo vazio com `resumir(ident, None) | {"erro": ...}`, para manter as chaves que o resto lê (240-241).
- **Botões no card:** ficam dentro do `<form>` (2470), então precisam de `type=button`. As chaves do JS em `pagina()` precisam ser dobradas.
- **Aviso:** usar a tupla de 4 do `EVENTOS` (853, 862, 2445).
- **Card substituído:** a resposta do N2 substitui o card pendente (447), e o "Disparar" do card antigo não faz nada, sem aviso (2994-3006).
- **`fts_consulta`:** o mínimo de 4 letras descarta `pix`, `med`, `ip` e `não`. A prova "nao caiu" passa só por causa de "caiu".
- **`desfecho='reaberta'`:** só registra o botão do painel, porque o Evo reabre sozinho (2691).
- **Caso no `enviar`:** exige ler os `detalhes`, mas o select de 2994 só lê `conversa`.
- **Esquema:** `db()` recria o esquema a cada chamada (424-441). Guardar numa global que já foi criado.
- **Insights:** nada quebra. `enviar_painel` com a conversa do N2 é o que o `form_n2` já registra hoje (2981, 1827).

## Cortes para v1

Os dois objetivos continuam cobertos: um grupo de WhatsApp é uma conversa do Evo, então a chave por conversa já separa a memória de cada cliente e de cada grupo.

- **Cortar:**
  - envio automático: `n2_auto`, `pode_auto_n2`, `escalar_n2_auto`;
  - o casamento `unica`;
  - `casos` e `casos_fts`, `gravar_caso`, o B4 e o `desfecho` (são Fase 1 e 2 do roadmap e dependem da autorização);
  - o escopo tenant e todo o B2;
  - `tipo_conversa` e o prompt especial do grupo N2;
  - as ferramentas MCP novas;
  - a reescrita do `form_n2` (basta pré-preencher com a escalação viva);
  - a lista de escalações acima dos cards.
- **`escalacoes` enxuta:** `id, conversa, nome, motivo, falta, status, msg_n2, resposta, criado, enviado, respondido`.
- **`memorias`:** `(conversa pk, resumo, pendencias, fatos, fixo, ate_msg, atualizado)`.
- **Fica:**
  - 0.2 só para o que é gravado, 0.3 e 0.4;
  - A1 a A3, e A4 sem envio automático;
  - A5 com o bloco no card, `n2_enviar`/`n2_cancelar`/`n2_vincular` e a trava `[[N2`;
  - A6 com citação, `#E` e vínculo manual;
  - `fechar_escalada` sem gravar caso;
  - B1, B3, B5 e B6 só no escopo conversa.

## Respostas às perguntas abertas

1. **O POST do Evo devolve o id?** O código não diz: nenhum chamador lê o retorno de `evo_enviar` (458, 2944, 2980, 2997). Ler `id` e cair no fallback do `#E<id>`.
2. **O `in_reply_to` é o id do Evo?** Nas mensagens que nós enviamos, sim: é o `m["id"]` uuid do Evo (1379 → 2980 → 344). Nas citações vindas do WhatsApp, o código não prova, e o `msgs_html` esconde a falha com "mensagem anterior" (1373-1374). Precisa de um teste ao vivo.
3. **O Evo marca grupo?** O código não lê nenhum indicador. O `sender_name` só aparece em mensagens de participante de grupo (323-326, 3089), o que é melhor que "mais de um autor". Com o corte do `tipo`, a pergunta sai da v1.
4. **O N2 aceita mensagem automática e `#E<id>`?** Não dá pelo código. Hoje até o aviso de ponto pede confirmação (1162, 2939).
5. **A autorização cobre a memória?** Não dá pelo código. Os rascunhos já mandam as últimas 20 mensagens à IA (554-557), então a memória acrescenta guarda local e chamadas extras, não um destinatário novo. Pelo roadmap (linhas 13 e 73), `memoria_auto` deve nascer desligado.
6. **Retenção?** O código hoje nunca apaga nada, então seria a primeira regra. Os `casos` saem da v1.
7. **Memória do N2 nos rascunhos?** Manter fora, e na v1 nem gravar.

## Veredito

**Aprovar com mudanças.** O desenho encaixa nas funções reais. O marcador cortado no código, a trava no envio e o fato de nada ir ao cliente sem clique respeitam as regras duras. Antes de implementar, corrigir os 3 bloqueantes e aplicar os cortes da v1.

---

**Handoff**
- **Resultado:** revisão completa acima. Uma cópia está no arquivo de plano do harness, `~/.claude/plans/review-an-implementation-plan-magical-puddle-of-4af9b854-f820-4459-a5d5-b741609690c8.md`.
- **Evidência:** li o `.plano-revisao.md` e o `PLANO-TREINAMENTO.md` inteiros, e todas as seções do `app.py` que o plano toca (1-1019, 1116-1205, 1283-1392, 1695-1760, 1825-1880, 2145-2490, 2672-3135). Testei em memória, com `python3 -I`, as regex de máscara propostas, o casamento `#E` e o `remove_diacritics` do FTS5.
- **Arquivos alterados:** nenhum no repositório. Só o arquivo de plano acima, o único permitido no modo plano.
- **Verificações:** não rodei o `uv run app.py teste`, porque ele grava no `fila.db` real.
- **Falhas:** nenhuma.
- **Riscos:** as perguntas abertas 1, 2 e 4 dependem da API ao vivo do Evo e das regras do time N2. Não verifiquei fora do código.

STATUS: DONE
SUMMARY: Review in pt-BR finds 3 blockers (masked N2 question, non-atomic escalation/reply handling, cross-tenant `casos` leak), lists fixes and a minimal v1 cut, and recommends approving with changes.
