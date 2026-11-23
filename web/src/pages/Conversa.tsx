import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert02Icon, ArrowLeft01Icon, Cancel01Icon, CheckmarkCircle02Icon, RefreshIcon, UndoIcon, Wrench01Icon } from "@hugeicons/core-free-icons";
import { api, type Conversa, type Fila, type Mensagem } from "../lib/api";
import { useEvento, type EventoMsg } from "../lib/eventos";
import { Icone } from "../lib/icone";
import { Avatar } from "../components/Avatar";
import { Bolhas, type AcoesMsg } from "../components/chat/Chat";
import { EscalacaoN2 } from "../components/chat/EscalacaoN2";
import { linkInterno, pertoDoFim, type Lang } from "../components/chat/util";
import { Composer } from "../components/conversa/Composer";
import { ApagarMsg, EditarMsg } from "../components/conversa/DialogosMsg";
import { PainelMemoria } from "../components/conversa/Memoria";
import "../components/conversa/Conversa.css";
import "../components/fila/Fila.css";

// key={id}: trocar de conversa recomeça o estado (composer, citação, rolagem)
export function ConversaPagina({ id }: { id: string }) {
  return <ConversaTela key={id} id={id} />;
}

function ConversaTela({ id }: { id: string }) {
  const [conv, setConv] = useState<Conversa | null>(null);
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [maisAntiga, setMaisAntiga] = useState<string | null>(null);
  const [ant, setAnt] = useState<"" | "busy" | "erro">("");
  const [erro, setErro] = useState("");
  const [lang, setLang] = useState<Lang>("pt");
  const [rapidas, setRapidas] = useState<Fila["rapidas"]>({});
  const [citada, setCitada] = useState<Mensagem | null>(null);
  const [editando, setEditando] = useState<Mensagem | null>(null);
  const [apagando, setApagando] = useState<Mensagem | null>(null);
  const [aba, setAba] = useState<"conversa" | "detalhes">("conversa");
  const [ferr, setFerr] = useState(false);
  const [status, setStatus] = useState<{ busy: boolean; erro: string }>({ busy: false, erro: "" });
  const hist = useRef<HTMLDivElement>(null);
  const noFim = useRef(true); // imagem que termina de carregar não tira o chat do fim
  const campo = useRef<HTMLTextAreaElement>(null);
  const rolar = useRef<"fim" | { alt: number } | null>("fim");
  const antigas = useRef(false); // já trouxe mensagens anteriores: recarregar não pode jogá-las fora

  const carregar = useCallback(() => {
    api.conversa(id).then((c) => {
      if (pertoDoFim(hist.current)) rolar.current = "fim";
      setConv(c); setLang(c.idioma); setErro("");
      if (!antigas.current) { setMsgs(c.mensagens); setMaisAntiga(c.mais_antiga); return; }
      const ids = new Set(c.mensagens.map((m) => m.id));
      const t0 = c.mensagens[0]?.ts ?? Infinity;
      setMsgs((p) => [...p.filter((m) => !ids.has(m.id) && m.ts < t0), ...c.mensagens]);
    }).catch((e: Error) => setErro(e.message));
  }, [id]);
  useEffect(carregar, [carregar]);
  useEffect(() => { api.fila().then((f) => setRapidas(f.rapidas)).catch(() => { /* sem rápidas, o resto funciona */ }); }, []);
  useEvento<EventoMsg[]>("painel:eventos", useCallback((evs: EventoMsg[]) => { if (evs.some((e) => e.conv === id)) carregar(); }, [id, carregar]));

  useLayoutEffect(() => {
    const el = hist.current, r = rolar.current;
    if (!el || !r) return;
    el.scrollTop = r === "fim" ? el.scrollHeight : el.scrollTop + el.scrollHeight - r.alt;
    rolar.current = null;
  }, [msgs]);

  const anteriores = () => {
    if (!maisAntiga) return;
    setAnt("busy");
    api.anteriores(id, maisAntiga).then((r) => {
      antigas.current = true;
      rolar.current = { alt: hist.current?.scrollHeight ?? 0 };
      setMsgs((p) => { const ids = new Set(p.map((m) => m.id)); return [...r.mensagens.filter((m) => !ids.has(m.id)), ...p]; });
      setMaisAntiga(r.mensagens.length ? r.mais_antiga : null);
      setAnt("");
    }).catch(() => setAnt("erro"));
  };

  const acoes = useMemo<AcoesMsg>(() => ({
    responder: (m) => { setCitada(m); setAba("conversa"); requestAnimationFrame(() => campo.current?.focus()); },
    editar: setEditando,
    apagar: setApagando,
  }), []);

  if (!conv) {
    return (
      <div className="cv">
        {erro ? (
          <div className="fila-estado erro" role="alert">
            <span className="fila-ic"><Icone icon={Alert02Icon} size={26} /></span>
            <h2>Não consegui abrir a conversa</h2>
            <p>{erro}</p>
            <div className="linha">
              <a className="bt bt-sec" {...linkInterno("/")}>Voltar para a fila</a>
              <button type="button" className="bt bt-pri" onClick={carregar}><Icone icon={RefreshIcon} size={16} />Tentar de novo</button>
            </div>
          </div>
        ) : (
          <div className="cv-esq" aria-busy="true" aria-label="Carregando a conversa"><i /><i /><i /><i /></div>
        )}
      </div>
    );
  }

  const concluida = conv.status === "resolved";
  const mudarStatus = () => {
    setStatus({ busy: true, erro: "" });
    api.acao({ acao: "status", conv: id, status: concluida ? "open" : "resolved" })
      .then(() => { setStatus({ busy: false, erro: "" }); carregar(); })
      .catch((e: Error) => setStatus({ busy: false, erro: e.message }));
  };
  const rotuloLado = conv.eh_n2 ? "Detalhes" : conv.escalada ? "Memória e N2" : "Memória";

  return (
    <div className="cv" data-aba={aba}>
      <header className="cv-topo">
        <a className="bt-ic cv-voltar" title="Voltar para a fila" aria-label="Voltar para a fila" {...linkInterno("/")}><Icone icon={ArrowLeft01Icon} size={20} /></a>
        <Avatar a={conv.avatar} size={36} />
        <div className="cv-tit">
          <h1 title={conv.nome}>{conv.nome}</h1>
          {(conv.eh_n2 || concluida || conv.ignorado) && (
            <div className="cv-selos">
              {conv.eh_n2 && <span className="selo">N2</span>}
              {concluida && <span className="selo selo-ok">concluída</span>}
              {conv.ignorado && <span className="selo">ignorada</span>}
            </div>
          )}
        </div>
        <button type="button" className={"bt " + (concluida ? "bt-sec" : "bt-ok")} disabled={status.busy} onClick={mudarStatus}
          title={concluida ? "Reabrir conversa" : "Concluir conversa"} aria-label={concluida ? "Reabrir conversa" : "Concluir conversa"}>
          <Icone icon={concluida ? UndoIcon : CheckmarkCircle02Icon} size={16} />
          <span className="cv-st-rot">{status.busy ? "Aguarde…" : concluida ? "Reabrir" : "Concluir"}</span>
        </button>
      </header>
      {status.erro && <p className="erro-in cv-faixa" role="alert">{status.erro}</p>}
      {concluida && <p className="cv-aviso">Conversa concluída. Ao enviar mensagem, o Evo reabre.</p>}
      {erro && <p className="erro-in cv-faixa" role="alert">Não consegui atualizar a conversa: {erro}</p>}

      <div className="cv-abas" role="tablist" aria-label="Seções da conversa">
        <button type="button" role="tab" aria-selected={aba === "conversa"} onClick={() => setAba("conversa")}>Conversa</button>
        <button type="button" role="tab" aria-selected={aba === "detalhes"} onClick={() => setAba("detalhes")}>{rotuloLado}</button>
      </div>

      <div className="cv-corpo">
        <section className="cv-principal" aria-label="Histórico e resposta">
          <div className="chat cv-hist" ref={hist}
            onScroll={(e) => { const h = e.currentTarget; noFim.current = h.scrollHeight - h.scrollTop - h.clientHeight < 80; }}
            onLoadCapture={() => { const h = hist.current; if (h && noFim.current) h.scrollTop = h.scrollHeight; }}>
            {maisAntiga && (
              <button type="button" className="bt bt-sec cv-mais" disabled={ant === "busy"} onClick={anteriores}>
                {ant === "busy" ? "Carregando…" : ant === "erro" ? "Falhou, tentar de novo" : "Carregar mensagens anteriores"}
              </button>
            )}
            {msgs.length ? <Bolhas msgs={msgs} acoes={acoes} /> : <p className="cv-vazio">Sem mensagens.</p>}
          </div>
          <Composer conv={id} lang={lang} rapidas={rapidas[lang] ?? rapidas.pt ?? []} citada={citada} campo={campo}
            onSemCitacao={() => setCitada(null)} onEnviado={() => { rolar.current = "fim"; carregar(); }} onIdioma={setLang} />
        </section>
        <aside className="cv-lado" aria-label={rotuloLado}>
          <button type="button" className="bt-link cv-ferr-bt" onClick={() => setFerr(true)}>
            <Icone icon={Wrench01Icon} size={16} />Ferramentas da conversa (taxa, IDs, convite)
          </button>
          {conv.eh_n2 ? (
            <p className="lado-sub">Este é o grupo do N2. Para ligar uma resposta do N2 à conversa do cliente, use as Ferramentas da conversa.</p>
          ) : <>
            {conv.escalada && <EscalacaoN2 key={conv.escalada.id + conv.escalada.status} e={conv.escalada} onFeito={carregar} vincular />}
            <PainelMemoria conv={id} m={conv.memoria} onFeito={carregar} />
          </>}
        </aside>
      </div>

      {ferr && (
        <div className="cv-ferr" role="dialog" aria-label="Ferramentas da conversa" onKeyDown={(e) => { if (e.key === "Escape") setFerr(false); }}>
          <div className="cv-ferr-cab">
            <h2>Ferramentas da conversa</h2>
            <button type="button" className="bt-ic" aria-label="Fechar ferramentas" title="Fechar" onClick={() => setFerr(false)} autoFocus><Icone icon={Cancel01Icon} size={18} /></button>
          </div>
          <iframe src={`/classico/c/${id}?embed=1`} title="Ferramentas da conversa (tela antiga)" />
        </div>
      )}

      <EditarMsg conv={id} m={editando} onFechar={() => setEditando(null)} onFeito={carregar} />
      <ApagarMsg conv={id} m={apagando} onFechar={() => setApagando(null)} onFeito={carregar} />
    </div>
  );
}
