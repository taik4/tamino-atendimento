# Plano de treinamento da IA do suporte Tamino

22/11/2026

## Resumo

Não é possível fazer fine-tuning do Opus 5.5 por conta própria, e o modelo não aprende sozinho com as escolhas do atendente. O caminho é **memória + exemplos**: a cada atendimento, o modelo recebe um playbook aprovado e os casos parecidos já resolvidos (por Samuel, J.L ou Daniel). Cada escolha A/B e cada edição alimentam essa memória. Com o tempo, as categorias em que ele acerta de forma consistente passam a ser respondidas sozinhas, com regras claras de segurança.

Vantagem sobre fine-tuning: se o modelo errar, basta corrigir uma regra do playbook, sem retreinar nada.

## Antes de começar: autorização e sigilo

- Pedir autorização ao superior para usar as conversas do J.L e do Daniel e os dados de clientes, já que esse conteúdo é enviado à Anthropic.
- Mascarar CPF, chaves Pix, e-mails e nomes antes de gravar qualquer caso.
- As regras de sigilo continuam valendo para o modelo: nada de provedor, códigos HTTP, limites ou TPM nas respostas a clientes. Única exceção: informar a instituição de pagamento quando o cliente perguntar "qual IP".

## Fase 1: coleta (semanas 1 e 2)

1. **Importar o histórico do Evo.**
   - Buscar as conversas concluídas e separar as mensagens enviadas por autor (Samuel, J.L, Daniel).
   - Gravar cada caso numa tabela `casos` no sqlite do painel: pergunta do cliente, categoria, consultas feitas (IDs e status), resposta final, autor e desfecho (concluída sem reabrir ou reaberta).
2. **A/B no painel.**
   - Trocar os dois rascunhos atuais (Informativo e Genérico) por duas variantes do mesmo tipo de resposta.
   - Registrar qual variante foi escolhida e, principalmente, o texto que foi realmente enviado. A diferença entre o rascunho e o texto enviado é o sinal de aprendizado mais forte; a escolha A/B sozinha diz pouco.
   - Registrar também quando as duas variantes são rejeitadas.

## Fase 2: memória (semanas 3 e 4)

1. **Playbook.**
   - Uma vez por semana, o Opus lê os casos novos e propõe regras por categoria (saque pendente, IP, convite, taxa, webhook etc.): o que consultar, o que responder e quando escalar para o N2.
   - Cada nova versão só vale depois de aprovada pelo Samuel.
   - O playbook fica versionado no git, para ser possível voltar a uma versão anterior.
2. **Casos parecidos.**
   - Quando chega uma conversa nova, o painel busca os 5 casos mais parecidos usando a busca FTS5 do sqlite (não precisa instalar nada).
   - O prompt passa a levar: playbook (com cache) + esses 5 casos + a conversa atual.

## Fase 3: medição (semanas 5 a 8)

Nova seção na aba Insights, por categoria:

- % de rascunhos enviados sem edição;
- tamanho médio das edições;
- % de rascunhos rejeitados;
- % de conversas reabertas depois da resposta.

## Fase 4: autonomia gradual

| Nível | O que o modelo faz | Critério para subir de nível |
|---|---|---|
| 0 (hoje) | Gera rascunho; o atendente envia | — |
| 1 | Envia sozinho após 60 segundos, com botão de cancelar | Categoria com 95% ou mais enviados sem edição, em pelo menos 50 casos, por 2 semanas |
| 2 | Envia na hora nas categorias "verdes" (saudação, aguarde, status de pagamento consultado) | Taxa de reabertura igual à do atendente |

**Nunca automático:** alteração de taxa, reenvio de convite, dinheiro ou estorno, cliente irritado, ou quando não existir caso parecido na memória. Nesses casos o modelo escala para o atendente ou para o N2.

**Chave de emergência:** liga/desliga da autonomia nas configurações (🔧).

## Custo

| Modelo | Entrada (por milhão de tokens) | Saída (por milhão de tokens) |
|---|---|---|
| Opus 5.5 | US$ 4,00 | US$ 20,00 |
| Haiku 5.5 (usado hoje) | US$ 0,10 | US$ 0,50 |

O Opus custa cerca de 40 vezes mais que o Haiku. Pela assinatura do Claude Code não há cobrança por token, mas há limite de uso.

**Sugestão:** usar o Opus para montar o playbook e nos casos difíceis, e manter o Haiku nos rascunhos do dia a dia, agora com playbook e casos parecidos no prompt. Na Fase 3, comparar os dois para decidir se o Opus vale o custo também nos rascunhos.

## Pontos em aberto

- Confirmar que o Evo identifica o autor (Samuel, J.L ou Daniel) em todas as mensagens antigas.
- Confirmar na documentação oficial da Anthropic que não existe fine-tuning do Opus 5.5.
- Obter a autorização do superior para o uso das conversas.

## Próximo passo

Implementar a Fase 1 no painel: importação do histórico e registro do A/B e das edições.
