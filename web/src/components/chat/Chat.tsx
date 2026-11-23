import { useState } from "react";
import { ArrowTurnBackwardIcon, Attachment01Icon, Delete02Icon, PencilEdit02Icon, TranslateIcon } from "@hugeicons/core-free-icons";
import { api, type Anexo, type Mensagem } from "../../lib/api";
import { Icone } from "../../lib/icone";
import { Avatar } from "../Avatar";
import { avatarDe } from "./util";
import "./Chat.css";

export type AcoesMsg = { responder: (m: Mensagem) => void; editar: (m: Mensagem) => void; apagar: (m: Mensagem) => void };

/** Bolhas do chat: cliente à esquerda com avatar, suporte à direita na cor primária, "activity" como linha central. */
export function Bolhas({ msgs, acoes }: { msgs: Mensagem[]; acoes?: AcoesMsg }) {
  const [ativa, setAtiva] = useState<string | null>(null); // no toque (sem hover), a bolha tocada mostra as ações
  return <>{msgs.filter((m) => m.texto || m.anexos.length || m.apagada).map((m) => (
    <Msg key={m.id || m.ts + m.texto} m={m} acoes={acoes} ativa={ativa === m.id} onAtivar={() => setAtiva((a) => (a === m.id ? null : m.id))} />
  ))}</>;
}

function Msg({ m, acoes, ativa, onAtivar }: { m: Mensagem; acoes?: AcoesMsg; ativa: boolean; onAtivar: () => void }) {
  const [trad, setTrad] = useState<{ estado: "idle" | "busy" | "erro" } | { estado: "ok"; texto: string }>({ estado: "idle" });
  if (m.tipo === "activity") return <div className="msis">{m.texto} · {m.hora}</div>;
  const entra = m.tipo === "incoming";
  const traduzir = () => {
    setTrad({ estado: "busy" });
    api.traduzir(m.texto).then((t) => setTrad({ estado: "ok", texto: t })).catch(() => setTrad({ estado: "erro" }));
  };
  return (
    <div className={"msg " + (entra ? "in" : "out") + (ativa ? " ativa" : "")}>
      {entra && <Avatar a={avatarDe(m.nome)} size={30} />}
      <div className="bolha" onClick={acoes ? onAtivar : undefined}>
        {m.reply && <div className="cit">{m.reply_preview || "mensagem anterior"}</div>}
        <div className="mh"><b>{m.nome}</b><small>{m.hora}</small></div>
        {m.apagada ? <i className="apagada">mensagem apagada</i> : m.texto && <div className="mt">{m.texto}</div>}
        {!m.apagada && <Anexos anexos={m.anexos} />}
        {m.traduzivel && !m.apagada && (trad.estado === "ok"
          ? <div className="trad"><span>Tradução</span>{trad.texto}</div>
          : <button type="button" className="tr" onClick={traduzir} disabled={trad.estado === "busy"}>
              <Icone icon={TranslateIcon} size={14} />{trad.estado === "busy" ? "Traduzindo…" : trad.estado === "erro" ? "Falhou, tentar de novo" : "Traduzir"}
            </button>)}
      </div>
      {acoes && m.id && !m.apagada && <AcoesBts m={m} a={acoes} nossa={!entra} />}
    </div>
  );
}

function AcoesBts({ m, a, nossa }: { m: Mensagem; a: AcoesMsg; nossa: boolean }) {
  return (
    <div className="mact">
      <button type="button" className="bt-ic" title="Responder citando" aria-label="Responder citando" onClick={() => a.responder(m)}>
        <Icone icon={ArrowTurnBackwardIcon} size={16} />
      </button>
      {nossa && <>
        <button type="button" className="bt-ic" title="Editar" aria-label="Editar mensagem" onClick={() => a.editar(m)}><Icone icon={PencilEdit02Icon} size={16} /></button>
        <button type="button" className="bt-ic perigo" title="Apagar" aria-label="Apagar mensagem" onClick={() => a.apagar(m)}><Icone icon={Delete02Icon} size={16} /></button>
      </>}
    </div>
  );
}

function Anexos({ anexos }: { anexos: Anexo[] }) {
  const itens = anexos.filter((a) => a.url);
  if (!itens.length) return null;
  return (
    <div className="anexos">
      {itens.map((a, i) =>
        a.tipo === "image" ? <a key={i} href={a.url} target="_blank" rel="noreferrer" className="ax-img" title="Abrir imagem"><img src={a.thumb || a.url} alt={a.nome || "imagem"} loading="lazy" /></a>
        : a.tipo === "audio" ? <audio key={i} controls preload="none" src={a.url} />
        : a.tipo === "video" ? <video key={i} controls preload="none" src={a.url} className="ax-vid" />
        : <a key={i} href={a.url} target="_blank" rel="noreferrer" className="arq"><Icone icon={Attachment01Icon} size={15} />{a.nome || "arquivo"}</a>)}
    </div>
  );
}
