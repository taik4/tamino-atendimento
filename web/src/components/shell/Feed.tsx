import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Notification01Icon, NotificationOff01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { api, type FeedItem } from "../../lib/api";
import { useEvento } from "../../lib/eventos";
import { Icone } from "../../lib/icone";
import { irPara } from "../../lib/rota";
import { Avatar } from "../Avatar";
import { BotaoFechar } from "./Sheet";
import { aoClicarLink, gravarLocal, lerLocal, mensagemErro } from "./util";
import "./Feed.css";

type Filtro = "novas" | "todas";

function Item({ f, ativo, aoNavegar, recarregar }: { f: FeedItem; ativo: boolean; aoNavegar?: () => void; recarregar: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const bt = useRef<HTMLButtonElement>(null);
  const href = "/c/" + f.id;
  const cancelar = () => { setConfirmar(false); setErro(""); requestAnimationFrame(() => bt.current?.focus()); };
  const ignorar = async (sim: boolean) => {
    setOcupado(true); setErro("");
    try {
      await api.acao({ acao: "ignorar", conv: f.id, nome: f.nome, sim: sim ? "1" : "0" });
      setConfirmar(false); recarregar();
    } catch (e) { setErro(mensagemErro(e)); } finally { setOcupado(false); }
  };

  if (confirmar) return (
    <li className="cs-fi cs-fi-conf" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelar(); } }}>
      <p>Ignorar <b>{f.nome}</b>? Não gera mais card nem aviso. Dá para voltar a acompanhar em “Todas”.</p>
      {erro && <p className="cs-erro-linha" role="alert">{erro}</p>}
      <div className="cs-fi-acoes">
        <button type="button" className="cs-bt" disabled={ocupado} onClick={cancelar}>Cancelar</button>
        <button type="button" className="cs-bt cs-bt-pri" disabled={ocupado} autoFocus onClick={() => ignorar(true)}>{ocupado ? "Ignorando…" : "Ignorar"}</button>
      </div>
    </li>
  );

  const c = f.classe;
  const rotIgn = f.ignorado ? `Voltar a acompanhar ${f.nome}` : `Ignorar ${f.nome}: sem cards nem avisos`;
  return (
    <li className={"cs-fi" + (f.tipo === "incoming" ? " in" : "") + (f.ignorado ? " off" : "") + (ativo ? " on" : "")}>
      <a href={href} className="cs-fi-a" aria-current={ativo ? "page" : undefined} onClick={aoClicarLink(href, aoNavegar)}>
        <Avatar a={f.avatar} size={36} />
        <span className="cs-fi-c">
          <span className="cs-fi-l1">
            <span className="cs-fi-n">{f.nome}</span>
            <span className="cs-fi-sel">
              {f.n2 && <span className="cs-sb n2">N2</span>}
              {c?.prioridade === 1 && <span className="cs-sb er">P1</span>}
              {c && c.sentimento !== "calmo" && <span className="cs-sb warn">{c.sentimento}</span>}
              {f.status === "resolved" && <span className="cs-sb ok">concluída</span>}
              {f.ignorado && <span className="cs-sb">ignorado</span>}
              {c?.categoria && <span className="cs-sb">{c.categoria}</span>}
            </span>
            {f.pendente > 0 && <span className="cs-n">{f.pendente}<span className="cs-sr"> não lidas</span></span>}
            <span className="cs-fi-h">{f.hora}</span>
          </span>
          <span className="cs-fi-t">{f.quem ? `${f.quem}: ` : ""}{f.texto}</span>
        </span>
      </a>
      <button ref={bt} type="button" className="cs-fi-ign" aria-label={rotIgn} title={f.ignorado ? "Voltar a acompanhar" : "Ignorar: sem cards nem avisos"}
        disabled={ocupado} onClick={() => (f.ignorado ? ignorar(false) : setConfirmar(true))}>
        <Icone icon={f.ignorado ? Notification01Icon : NotificationOff01Icon} size={18} />
      </button>
      {erro && <p className="cs-erro-linha cs-fi-erro" role="alert">{erro}</p>}
    </li>
  );
}

// Feed "Conversas": coluna da direita no PC, gaveta abaixo de 1100 px (aí recebe `fechar`).
export function Feed({ ativo, aoContar, fechar }: { ativo: string | null; aoContar: (n: number) => void; fechar?: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>(() => (lerLocal("feed_filtro") === "todas" ? "todas" : "novas"));
  const [itens, setItens] = useState<FeedItem[] | null>(null);
  const [erro, setErro] = useState(false);
  const [q, setQ] = useState("");
  const seq = useRef(0);

  const carregar = useCallback(() => {
    const n = ++seq.current; // resposta atrasada (ou do filtro anterior) não sobrescreve a mais nova
    api.feed(filtro)
      .then((r) => { if (n !== seq.current) return; setItens(r.itens); setErro(false); aoContar(r.itens.reduce((s, f) => s + f.pendente, 0)); })
      .catch(() => { if (n === seq.current) setErro(true); });
  }, [filtro, aoContar]);
  useEffect(() => { carregar(); const t = setInterval(carregar, 4000); return () => clearInterval(t); }, [carregar]);
  useEvento("painel:eventos", carregar);

  const trocar = (f: Filtro) => { if (f === filtro) return; gravarLocal("feed_filtro", f); setItens(null); setErro(false); setFiltro(f); };
  const buscar = (e: FormEvent) => { e.preventDefault(); irPara(`/buscar?q=${encodeURIComponent(q.trim())}&status=all`); fechar?.(); };

  return (
    <section className="cs-feed" aria-label="Conversas">
      <header className="cs-feed-cab"><h2>Conversas</h2>{fechar && <BotaoFechar fechar={fechar} rotulo="Fechar conversas" />}</header>
      <form className="cs-busca" role="search" onSubmit={buscar}>
        <Icone icon={Search01Icon} size={18} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conversa…" aria-label="Buscar conversa" enterKeyHint="search" />
      </form>
      <div className="cs-seg" role="group" aria-label="Mostrar">
        <button type="button" aria-pressed={filtro === "novas"} onClick={() => trocar("novas")}>Aguardando resposta</button>
        <button type="button" aria-pressed={filtro === "todas"} onClick={() => trocar("todas")}>Todas</button>
      </div>
      <div className="cs-feed-lista">
        {erro && itens && <p className="cs-feed-aviso" role="status">Sem conexão com o painel. Tentando de novo…</p>}
        {itens === null ? (
          erro ? (
            <div className="cs-feed-vazio" role="alert">
              <p>Não consegui carregar as conversas.</p>
              <button type="button" className="cs-bt" onClick={carregar}>Tentar de novo</button>
            </div>
          ) : <p className="cs-feed-vazio">Carregando conversas…</p>
        ) : itens.length === 0 ? (
          <p className="cs-feed-vazio">{filtro === "novas" ? "Nenhuma conversa aguardando resposta." : "Nenhuma conversa por aqui ainda."}</p>
        ) : (
          <ul>{itens.map((f) => <Item key={f.id} f={f} ativo={f.id === ativo} aoNavegar={fechar} recarregar={carregar} />)}</ul>
        )}
        <a className="cs-feed-mais" href="/buscar?status=all" onClick={aoClicarLink("/buscar?status=all", fechar)}>Ver todas as conversas, inclusive antigas</a>
      </div>
    </section>
  );
}
