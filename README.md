# Atendimento Tamino

Painel local para o suporte da Tamino. Ele junta o **Evo CRM** (WhatsApp) e o **backoffice da Tamino** numa tela só:

- **fila de respostas**: a IA rascunha e você revisa e dispara com um clique;
- **consulta de IDs** e **taxas** no backoffice;
- **insights do seu turno**, exportáveis em PDF ou JPEG;
- **controle pelo celular** na rede local;
- **servidor MCP**, para o Claude Code operar as mesmas ferramentas.

Funciona no **Linux** (testado no CachyOS/KDE) e no **Windows 10/11**.

> **Nada sai para o cliente sem o seu clique.** A IA só gera rascunhos.

---

## O que tem

| Aba / recurso | O que faz |
|---|---|
| **Fila** | Mensagem nova de cliente vira um card com o contexto da conversa e dois rascunhos da IA: 📋 *Informativo* e ⏳ *Genérico (segurar)*. Você edita e dispara. O **✕** fecha o card sem abrir. |
| **🔕 Ignorar conversa** | O 🔕 no canto de uma conversa da lista faz grupos fora do suporte pararem de gerar card e aviso. Para reativar, use o 🔔 (filtro *Todas*) ou 🔧 → *Conversas ignoradas*. |
| **Conversa** | Histórico completo, envio de mensagem e anexos, ↩︎ responder citando, ✏️ editar, 🗑 apagar, ✅ concluir/reabrir, 🌐 traduzir e respostas rápidas em PT/EN/中文/ES. |
| **Perguntar ao N2** | Envia a dúvida para o grupo interno a partir de qualquer conversa. |
| **📈 Insights** | Atendimentos, mensagens, tempo ativo e 1ª resposta por turno, com gráficos e exportação em **PDF/JPEG**. |
| **Dashboard / Saques / Pagamentos / Webhooks / Usuários / Taxas** | Consultas **só de leitura** ao backoffice. Nada é alterado lá. |
| **🔧 Configurações** | Seu nome, horário de trabalho, modelo da IA, grupo N2, textos das respostas rápidas, notificações, sessões e controle remoto. |
| **🔔 Notificações** | Aviso no sistema (KDE ou Windows) com som, além do bip e do contador na aba do navegador. |
| **📡 Controle remoto** | Use o painel no celular pela rede local, com pareamento por QR Code ou código de uso único. |

## Requisitos

- [**uv**](https://docs.astral.sh/uv/getting-started/installation/), que cuida do Python e das dependências
- Acesso ao **backoffice da Tamino** e ao **Evo CRM**
- Opcional: [**Claude Code**](https://docs.claude.com/claude-code) logado. Ele é a IA padrão dos rascunhos e da tradução, sem chave extra. Outra opção é uma `ANTHROPIC_API_KEY` no `.env`.

---

## Instalação

### Linux

```bash
git clone https://github.com/taik4/tamino-atendimento.git
cd tamino-atendimento
uv sync
uv run playwright install chromium   # navegador usado para pegar as sessões e exportar PDF
cp .env.example .env
uv run renovar.py login              # abre uma janela: faça login no Tamino e no Evo, volte e aperte Enter
uv run app.py checar                 # deve mostrar "Tamino: OK" e "Evo: OK"
```

### Windows (PowerShell)

```powershell
# instale o uv (uma vez)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

git clone https://github.com/taik4/tamino-atendimento.git
cd tamino-atendimento
uv sync
uv run playwright install chromium
copy .env.example .env
uv run renovar.py login
uv run app.py checar
```

---

## Uso diário

| | Linux | Windows |
|---|---|---|
| **Abrir tudo** (renova as sessões, sobe o painel, abre o navegador e o Claude Code) | `./iniciar.sh` | duplo clique em `iniciar.bat` |
| **Parar o painel** | `./parar.sh` | duplo clique em `parar.bat` |
| **Só o painel** | `uv run app.py painel` | `uv run app.py painel` |

O painel fica em **http://127.0.0.1:8765**.

### Atalho no menu (Linux/KDE)

Crie o arquivo `~/.local/share/applications/tamino-atendimento.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=Atendimento Tamino
Exec=/CAMINHO/tamino-atendimento/iniciar.sh
Path=/CAMINHO/tamino-atendimento
Icon=/CAMINHO/tamino-atendimento/static/logo-256.png
Terminal=true
Categories=Network;
```

### Atalho na Área de Trabalho (Windows)

Clique com o botão direito em `iniciar.bat` → **Enviar para** → **Área de trabalho (criar atalho)**. Nas propriedades do atalho, em **Alterar ícone**, dá para usar a logo, mas ela precisa estar convertida para `.ico`.

---

## Sessões (tokens)

O `renovar.py` usa um **perfil de navegador só dele**, separado do seu navegador do dia a dia. Você faz login uma vez nesse perfil. Depois disso:

- quando o painel recebe um 401, ele renova a sessão sozinho em segundo plano;
- se a sessão cair de vez, rode de novo `uv run renovar.py login`, ou use 🔧 → **Renovar sessões agora**.

Onde ficam os dados:

| | Linux | Windows |
|---|---|---|
| Perfil do navegador, banco da fila e insights | `~/.local/share/tamino-atendimento/` | `%LOCALAPPDATA%\tamino-atendimento\` |
| Tokens | `.env` na pasta do projeto | `.env` na pasta do projeto |

> **O `.env` e a pasta de dados dão acesso de admin ao backoffice.** Não compartilhe nenhum dos dois. O `.env` já está no `.gitignore`.

---

## IA dos rascunhos e da tradução

Ordem de uso:
1. `ANTHROPIC_API_KEY` no `.env`, se existir: usa a API da Anthropic.
2. Senão, o **Claude Code** instalado (`claude -p`), com a sua assinatura.

O modelo se escolhe em 🔧 → *IA dos rascunhos*. O padrão é o Haiku 5.5, rápido e barato.

Para o painel rodar sem parar mesmo quando o login do Claude Code vencer, gere um token de longa duração com `claude setup-token` e coloque em `CLAUDE_CODE_OAUTH_TOKEN=` no `.env`.

Na tradução, se existir `GOOGLE_TRANSLATE_KEY`, o painel usa o Google Cloud Translation.

**Sigilo:** os rascunhos para clientes nunca citam provedor, códigos HTTP, limites, TPM nem dados de outros tenants. O detalhe técnico aparece só para você, na aba Saques/Consulta.

---

## Claude Code (MCP)

Registre o servidor MCP, trocando `/CAMINHO` pela pasta do projeto:

```bash
claude mcp add tamino -- uv run -q --project /CAMINHO/tamino-atendimento /CAMINHO/tamino-atendimento/app.py mcp
```

Ferramentas disponíveis para o agente:

| Ferramenta | O que faz |
|---|---|
| `ler_conversa` | lê a conversa e extrai os IDs |
| `consultar_ids` | consulta IDs no backoffice e devolve só campos seguros |
| `consultar_taxas` | mostra as taxas de um tenant |
| `preparar_resposta` | coloca a resposta na fila, sem enviar |
| `enviar_espera` | envia a mensagem de espera, só quando você pedir explicitamente |

---

## Controle remoto (celular)

1. No computador: 🔧 → **📡 Controle remoto** → *Ligar*.
2. Libere a porta **8766** só para a rede local:
   - Linux (ufw): `sudo ufw allow from 192.168.0.0/16 to any port 8766 proto tcp`
   - Windows (PowerShell como administrador): `New-NetFirewallRule -DisplayName "Atendimento Tamino" -Direction Inbound -Protocol TCP -LocalPort 8766 -RemoteAddress LocalSubnet -Action Allow`
3. No celular, conectado ao mesmo Wi-Fi, leia o QR Code ou digite o código de 6 dígitos.

O tráfego é HTTP, sem criptografia, e só passa pela rede local. Use apenas em rede confiável e desligue quando não estiver usando.

---

## Solução de problemas

| Sintoma | Causa provável e solução |
|---|---|
| `Sessão expirada` | Rode `uv run renovar.py login` |
| `token inválido: recarregue o painel` | O painel foi reiniciado: aperte F5 |
| Rascunho com "Texto padrão" | A IA falhou. Confira se o `claude` está logado ou se a `ANTHROPIC_API_KEY` é válida |
| Celular não conecta | Controle remoto desligado, porta 8766 bloqueada no firewall ou celular fora do Wi-Fi |
| Exportar PDF falha | Rode `uv run playwright install chromium` |
| Áudio não toca | Instale o **ffmpeg** (Linux: pelo gerenciador de pacotes; Windows: `winget install ffmpeg`). Sem ele, o Safari/iPhone não toca o OGG do WhatsApp |
| 403 em Saques/Provedores | O perfil de suporte não tem acesso; peça ao N2 |

---

## Estrutura

```
app.py        painel web, vigia, MCP, IA, insights e controle remoto (um arquivo só)
renovar.py    pega e renova o cookie do Tamino e o token do Evo, usando um perfil próprio de navegador
exportar.py   gera o PDF/JPEG dos Insights
iniciar.*     abre tudo (sh = Linux, ps1/bat = Windows)
parar.*       para o painel
static/       logo e favicon
```

Self-check: `uv run app.py teste`
