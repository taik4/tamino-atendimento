import { useEffect, useRef, useState } from "react";
import { AiChat02Icon, Alert02Icon, SentIcon } from "@hugeicons/core-free-icons";
import { api } from "../../lib/api";
import { Icone } from "../../lib/icone";
import { BotaoFechar, Sheet } from "./Sheet";
import "./ChatClaude.css";

type Msg = { de: "eu" | "claude"; texto: string };
type Chat = { sessao: string; msgs: Msg[] };
const CHAVE = "claude_chat";

function lerChat(): Chat {
  try {
    const v = JSON.parse(sessionStorage.getItem(CHAVE) || "");
    if (v && Array.isArray(v.msgs)) return { sessao: String(v.sessao || ""), msgs: v.msgs };
  } catch { /* vazio ou inválido */ }
  return { sessao: "", msgs: [] };
}

// api.claude só devolve o texto do erro (sem o status): reconhece os casos conhecidos pelo texto.
function explicar(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  if (/409|ocupad|busy/i.test(m)) return "O Claude ainda está trabalhando em outro pedido. Espere terminar e tente de novo.";
  if (/403|forbidden|proibid|token/i.test(m)) return "Sem permissão. O chat só funciona no PC; se estiver no PC, recarregue o painel.";
  if (/timeout|timed out|tempo/i.test(m)) return "O pedido passou de 10 minutos e foi interrompido.";
  if (/failed to fetch|networkerror|load failed/i.test(m)) return "Sem conexão com o painel.";
  return m || "Algo deu errado.";
}

// Texto com quebras preservadas; ```blocos``` em fonte mono com rolagem horizontal. Sem markdown além disso.
function Texto({ t }: { t: string }) {
  return <>{t.split("```").map((p, i) => i % 2
    ? <pre key={i}><code>{p.replace(/^[\w+.#-]*\n/, "")}</code></pre>
    : p.trim() ? <p key={i}>{p.replace(/^\n+|\n+$/g, "")}</p> : null)}</>;
}

const crescer = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; };

// Botão flutuante (canto inferior direito, só no PC) + chat com o Claude Code. No PC é janela não modal
// (dá para seguir atendendo enquanto ele trabalha); no celular, tela cheia modal.
export function ChatClaude({ celular }: { celular: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [chat, setChat] = useState(lerChat);
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const [erro, setErro] = useState<{ msg: string; pedido: string } | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { sessionStorage.setItem(CHAVE, JSON.stringify(chat)); } catch { /* cheio */ } }, [chat]);
  useEffect(() => { const l = lista.current; if (l) l.scrollTop = l.scrollHeight; }, [chat.msgs, esperando, erro, aberto]);
  useEffect(() => { if (aberto) campo.current?.focus(); }, [aberto, celular]); // depois do show/showModal do Sheet (efeito do filho roda antes)

  const pedir = async (pedido: string, sessao: string) => {
    setEsperando(true); setErro(null);
    try {
      const r = await api.claude(pedido, sessao);
      if (r.sessao) setChat((c) => ({ ...c, sessao: r.sessao }));
      if (r.erro) throw new Error(r.erro);
      setChat((c) => ({ ...c, msgs: [...c.msgs, { de: "claude", texto: r.resposta }] }));
    } catch (e) { setErro({ msg: explicar(e), pedido }); } finally { setEsperando(false); }
  };
  const enviar = () => {
    const t = texto.trim();
    if (!t || esperando) return;
    setTexto("");
    if (campo.current) campo.current.style.height = "";
    setChat((c) => ({ ...c, msgs: [...c.msgs, { de: "eu", texto: t }] }));
    pedir(t, chat.sessao);
  };
  const nova = () => { setChat({ sessao: "", msgs: [] }); setErro(null); campo.current?.focus(); };

  return (
    <>
      <button type="button" className="cs-fab cs-fab-dir cs-fab-pri" onClick={() => setAberto((a) => !a)} aria-haspopup="dialog" aria-expanded={aberto}
        aria-label={esperando ? "Claude Code (trabalhando)" : "Conversar com o Claude Code"} title="Claude Code">
        <Icone icon={AiChat02Icon} size={24} />
        {esperando && <span className="cs-fab-dot" />}
      </button>
      <Sheet aberto={aberto} fechar={() => setAberto(false)} rotulo="Claude Code" className="cs-chat" modal={celular}>
        <header className="cs-chat-cab">
          <Icone icon={AiChat02Icon} />
          <h2>Claude Code</h2>
          <button type="button" className="cs-bt cs-bt-sm" onClick={nova} disabled={esperando || (!chat.msgs.length && !chat.sessao && !erro)}>Nova conversa</button>
          <BotaoFechar fechar={() => setAberto(false)} />
        </header>
        <p className="cs-chat-aviso"><Icone icon={Alert02Icon} size={16} />Acesso completo ao projeto: pode editar arquivos e rodar comandos.</p>
        <div className="cs-chat-lista" ref={lista} role="log" aria-live="polite">
          {!chat.msgs.length && !esperando && (
            <p className="cs-chat-vazio">Peça ajustes no painel, consultas no código ou explicações. Um pedido pode levar alguns minutos.</p>
          )}
          {chat.msgs.map((m, i) => <div key={i} className={"cs-msg " + m.de}><Texto t={m.texto} /></div>)}
          {esperando && <p className="cs-pensando">pensando<span aria-hidden="true"><i /><i /><i /></span></p>}
          {erro && (
            <div className="cs-chat-erro" role="alert">
              <span>{erro.msg}</span>
              <button type="button" className="cs-bt cs-bt-sm" disabled={esperando} onClick={() => pedir(erro.pedido, chat.sessao)}>Tentar de novo</button>
            </div>
          )}
        </div>
        <form className="cs-chat-comp" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
          <textarea ref={campo} rows={1} value={texto} placeholder="Peça algo ao Claude…" aria-label="Mensagem para o Claude"
            enterKeyHint={celular ? "enter" : "send"}
            onChange={(e) => { setTexto(e.target.value); crescer(e.target); }}
            onKeyDown={(e) => {
              // no celular Enter quebra linha (não há Shift); envia pelo botão
              if (!celular && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(); }
            }} />
          <button type="submit" className="cs-chat-env" disabled={esperando || !texto.trim()} aria-label="Enviar" title={celular ? "Enviar" : "Enviar (Enter)"}>
            <Icone icon={SentIcon} />
          </button>
        </form>
      </Sheet>
    </>
  );
}
