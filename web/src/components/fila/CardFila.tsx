import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown01Icon, ArrowRight01Icon, ArrowUp01Icon, BrainIcon, Cancel01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { api, type Card, type Rapida } from "../../lib/api";
import { Icone } from "../../lib/icone";
import { irPara } from "../../lib/rota";
import { Avatar } from "../Avatar";
import { Bolhas } from "../chat/Chat";
import { Corrigir, Opcoes, SeletorIdioma, SeloClasse, type Opcao } from "../chat/Controles";
import { EscalacaoN2 } from "../chat/EscalacaoN2";
import { dataHora, linkInterno, ultimaDoCliente, type Lang } from "../chat/util";
import "./Fila.css";

type Props = {
  card: Card; rapidas: Rapida[]; aberto: boolean; nova: boolean;
  onAlternar: () => void; onSair: (id: number) => void; onRecarregar: (id: number) => void; onIdioma: (id: number, l: Lang) => void;
};

export function CardFila({ card, rapidas, aberto, nova, onAlternar, onSair, onRecarregar, onIdioma }: Props) {
  const [texto, setTexto] = useState(card.texto);
  const base = useRef(card.texto);
  // rascunho novo do servidor só entra se o atendente não mexeu no texto
  useEffect(() => { const antes = base.current; base.current = card.texto; setTexto((t) => (t === antes ? card.texto : t)); }, [card.texto]);
  const [busy, setBusy] = useState<"" | "enviar" | "descartar">("");
  const [erro, setErro] = useState("");
  const art = useRef<HTMLElement>(null);
  const chat = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (aberto && chat.current) chat.current.scrollTop = chat.current.scrollHeight; }, [aberto, card.contexto]);

  const agir = (acao: "enviar" | "descartar") => {
    setBusy(acao); setErro("");
    api.acao({ acao, id: String(card.id), texto }).then(() => {
      onSair(card.id);
      if (acao === "enviar" && card.escalada?.status === "aberta") irPara(`/c/${card.conversa}`); // falta perguntar ao N2: lá o pedido já vem pronto
    }).catch((e: Error) => { setErro(e.message); setBusy(""); });
  };
  const alternar = () => {
    onAlternar();
    if (!aberto) requestAnimationFrame(() => art.current?.scrollIntoView({ block: "nearest" }));
  };

  const sg = card.sigilo || {};
  const versoes: Opcao[] = [
    { rotulo: "Informativo A", texto: card.versoes.info ?? "", selo: sg.info },
    { rotulo: "Informativo B", texto: card.versoes.info_b ?? "", selo: sg.info_b },
    { rotulo: "Genérico", texto: card.versoes.generico ?? "", selo: sg.generico },
  ];
  const erroEl = erro && <p className="erro-in" role="alert">{erro}</p>;

  return (
    <article ref={art} className={"fcard" + (aberto ? " aberto" : "") + (busy ? " ocupado" : "")} aria-label={card.nome}>
      {!aberto && (
        <button type="button" className="fc-x" title="Descartar este card" aria-label={`Descartar o card de ${card.nome}`} disabled={!!busy} onClick={() => agir("descartar")}>
          <Icone icon={Cancel01Icon} size={18} />
        </button>
      )}
      <button type="button" className="fc-resumo" aria-expanded={aberto} onClick={alternar}>
        <span className="fc-cab">
          <Avatar a={card.avatar} size={40} />
          <span className="fc-id">
            <span className="fc-nome">{card.nome}</span>
            <span className="fc-meta"><SeloClasse c={card.classe} /><time className="num">{dataHora(card.criado)}</time></span>
          </span>
        </span>
        {!aberto && <span className="fc-ultima">{ultimaDoCliente(card.contexto) || "Sem mensagem do cliente no contexto."}</span>}
        {nova && <span className="fc-nova">Mensagem nova nesta conversa</span>}
        {card.alerta && <span className={"fc-alerta" + (card.redigindo ? " redigindo" : "")}>{card.alerta}</span>}
        <span className="fc-pe">{aberto ? "Recolher" : "Responder"}<Icone icon={aberto ? ArrowUp01Icon : ArrowDown01Icon} size={16} /></span>
      </button>
      {!aberto && erroEl}
      {aberto && (
        <div className="fc-corpo">
          {card.contexto.length > 0 && <div className="chat fc-chat" ref={chat}><Bolhas msgs={card.contexto} /></div>}
          {card.escalada && <EscalacaoN2 e={card.escalada} onFeito={() => onRecarregar(card.id)} />}
          {card.memoria && (
            <details className="fc-mem">
              <summary><Icone icon={BrainIcon} size={16} />Memória usada</summary>
              <div className="fc-mem-t">{card.memoria}</div>
            </details>
          )}
          <SeletorIdioma conv={card.conversa} lang={card.idioma} onMudou={(l) => onIdioma(card.id, l)} />
          <Opcoes forte rotulo="Versões da resposta" itens={versoes} atual={texto} onEscolher={setTexto} />
          <Opcoes rotulo="Respostas rápidas" itens={rapidas} atual={texto} onEscolher={setTexto} />
          <textarea className="campo fc-tx" rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck lang="pt-BR"
            aria-label={`Resposta para ${card.nome}`} disabled={busy === "enviar"} />
          <Corrigir valor={texto} lang={card.idioma} onTrocar={setTexto} />
          {erroEl}
          <div className="fc-acoes">
            <button type="button" className="bt bt-pri" disabled={!!busy || !texto.trim()} onClick={() => agir("enviar")}>
              <Icone icon={SentIcon} size={16} />{busy === "enviar" ? "Disparando…" : "Disparar"}
            </button>
            <button type="button" className="bt bt-sec" disabled={!!busy} onClick={() => agir("descartar")}>{busy === "descartar" ? "Descartando…" : "Descartar"}</button>
            <a className="bt-link fc-abrir" {...linkInterno(`/c/${card.conversa}`)}>abrir conversa<Icone icon={ArrowRight01Icon} size={14} /></a>
          </div>
        </div>
      )}
    </article>
  );
}
