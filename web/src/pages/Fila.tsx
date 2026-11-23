import { useCallback, useEffect, useRef, useState } from "react";
import { Alert02Icon, InboxIcon, RefreshIcon } from "@hugeicons/core-free-icons";
import { api, type Card, type Fila } from "../lib/api";
import { useEvento } from "../lib/eventos";
import { Icone } from "../lib/icone";
import { CardFila } from "../components/fila/CardFila";
import "../components/fila/Fila.css";

const CHAVE = "abertos"; // mesma chave da fila antiga: cards abertos sobrevivem à troca de tela
const lerAbertos = () => {
  try { return new Set<string>(JSON.parse(sessionStorage.getItem(CHAVE) || "[]")); } catch { return new Set<string>(); }
};
const ultimaId = (c: Card) => c.contexto.at(-1)?.id ?? "";

export function FilaPagina() {
  const [dados, setDados] = useState<Fila | null>(null);
  const [erro, setErro] = useState("");
  const [abertos, setAbertos] = useState(lerAbertos);
  const [novas, setNovas] = useState<Set<number>>(() => new Set());
  const atual = useRef<Fila | null>(null);
  atual.current = dados;

  const carregar = useCallback(() => {
    setErro("");
    api.fila().then(setDados).catch((e: Error) => setErro(e.message));
  }, []);
  useEffect(carregar, [carregar]);
  useEffect(() => { try { sessionStorage.setItem(CHAVE, JSON.stringify([...abertos])); } catch { /* aba privada sem storage */ } }, [abertos]);

  const marcarNova = (id: number) => setNovas((s) => new Set(s).add(id));
  const rebuscar = useCallback((id: number) => {
    api.card(id).then((r) => {
      const velho = atual.current?.cards.find((c) => c.id === id);
      const novo = r.existe ? r.card : undefined;
      if (velho && novo && ultimaId(velho) !== ultimaId(novo)) marcarNova(id);
      setDados((d) => d && { ...d, cards: novo ? d.cards.map((c) => (c.id === id ? novo : c)) : d.cards.filter((c) => c.id !== id) });
    }).catch(() => { /* a próxima novidade tenta de novo */ });
  }, []);

  // a casca avisa quais cards mudaram: conhecido = atualiza no lugar; desconhecido = card novo, relê a fila
  useEvento<number[]>("painel:cards", useCallback((ids: number[]) => {
    if (!atual.current) return;
    const conhecidos = new Set(atual.current.cards.map((c) => c.id));
    ids.filter((i) => conhecidos.has(i)).forEach(rebuscar);
    if (ids.some((i) => !conhecidos.has(i))) api.fila().then(setDados).catch(() => {});
  }, [rebuscar]));

  const alternar = (id: number) => {
    setAbertos((s) => { const n = new Set(s); if (!n.delete(String(id))) n.add(String(id)); return n; });
    setNovas((s) => { const n = new Set(s); n.delete(id); return n; });
  };
  const sair = (id: number) => {
    setDados((d) => d && { ...d, cards: d.cards.filter((c) => c.id !== id) });
    setAbertos((s) => { const n = new Set(s); n.delete(String(id)); return n; });
  };
  const mudouIdioma = (id: number, l: Card["idioma"]) =>
    setDados((d) => d && { ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, idioma: l } : c)) });

  return (
    <div className="fila-pg">
      <header className="fila-cab">
        <h1>Fila de respostas</h1>
        {dados && <span className="fila-n num" aria-label={`${dados.cards.length} na fila`}>{dados.cards.length}</span>}
      </header>
      {!dados && erro ? (
        <div className="fila-estado erro" role="alert">
          <span className="fila-ic"><Icone icon={Alert02Icon} size={26} /></span>
          <h2>Não consegui carregar a fila</h2>
          <p>{erro}</p>
          <button type="button" className="bt bt-pri" onClick={carregar}><Icone icon={RefreshIcon} size={16} />Tentar de novo</button>
        </div>
      ) : !dados ? (
        <div className="fila" aria-busy="true" aria-label="Carregando a fila">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="fcard esq" aria-hidden="true"><i /><i /><i /></div>)}
        </div>
      ) : !dados.cards.length ? (
        <div className="fila-estado">
          <span className="fila-ic"><Icone icon={InboxIcon} size={26} /></span>
          <h2>Fila vazia</h2>
          <p>Quando um cliente escrever, o rascunho da resposta aparece aqui para você revisar e disparar.</p>
        </div>
      ) : (
        <div className="fila">
          {dados.cards.map((c) => (
            <CardFila key={c.id} card={c} rapidas={dados.rapidas[c.idioma] ?? dados.rapidas.pt ?? []} aberto={abertos.has(String(c.id))} nova={novas.has(c.id)}
              onAlternar={() => alternar(c.id)} onSair={sair} onRecarregar={rebuscar} onIdioma={mudouIdioma} />
          ))}
        </div>
      )}
    </div>
  );
}
