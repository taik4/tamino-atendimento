import { useState } from "react";
import { api, type Escalada } from "../../lib/api";
import { Confirmacao, Corrigir } from "./Controles";
import "./Chat.css";

const STATUS: Record<string, string> = { aberta: "falta enviar", enviada: "aguardando o N2", respondida: "respondida", resolvida: "resolvida", cancelada: "cancelada" };

/** Escalação ao N2 viva (fila e conversa): pergunta editável + Enviar, aguardando (com Vincular resposta na conversa), resposta. */
export function EscalacaoN2({ e, onFeito, vincular }: { e: NonNullable<Escalada>; onFeito: () => void; vincular?: boolean }) {
  const [pergunta, setPergunta] = useState(e.pergunta);
  const [resposta, setResposta] = useState("");
  const [busy, setBusy] = useState("");
  const [erro, setErro] = useState("");
  const [cancelar, setCancelar] = useState(false);
  const ir = (acao: "n2_enviar" | "n2_cancelar" | "n2_vincular", texto = "") => {
    setBusy(acao); setErro("");
    api.acao({ acao, esc: String(e.id), texto })
      .then(() => { setCancelar(false); onFeito(); })
      .catch((x: Error) => setErro(x.message))
      .finally(() => setBusy(""));
  };
  const viva = e.status === "aberta" || e.status === "enviada" || e.status === "respondida";
  return (
    <section className="esc" aria-label="Escalação ao N2">
      <div className="esc-tit">
        <b>N2 <span className="num">#E{e.id}</span></b>
        <span className="esc-mot">{e.motivo_txt || e.motivo}</span>
        <span className={"selo" + (e.status === "aberta" ? " selo-warn" : "")}>{STATUS[e.status] || e.status}</span>
      </div>
      {e.falta && <p className="esc-falta">Falta: {e.falta}</p>}
      {e.status === "aberta" && <>
        <textarea className="campo" rows={6} value={pergunta} onChange={(x) => setPergunta(x.target.value)} spellCheck lang="pt-BR" aria-label="Pergunta ao N2" />
        <div className="linha">
          <Corrigir valor={pergunta} lang="pt" onTrocar={setPergunta} />
          <button type="button" className="bt bt-pri" disabled={!!busy || !pergunta.trim()} onClick={() => ir("n2_enviar", pergunta)}>
            {busy === "n2_enviar" ? "Enviando…" : "Enviar ao N2"}
          </button>
        </div>
      </>}
      {e.status === "enviada" && vincular && <>
        <textarea className="campo" rows={3} value={resposta} onChange={(x) => setResposta(x.target.value)} placeholder="Cole aqui a resposta do N2" aria-label="Resposta do N2" />
        <div className="linha">
          <button type="button" className="bt bt-sec" disabled={!!busy || !resposta.trim()} onClick={() => ir("n2_vincular", resposta)}>
            {busy === "n2_vincular" ? "Ligando…" : "Ligar esta resposta à conversa do cliente"}
          </button>
        </div>
      </>}
      {e.resposta && <div className="esc-resp"><b>N2:</b> {e.resposta}</div>}
      {erro && <p className="erro-in" role="alert">{erro}</p>}
      {viva && <button type="button" className="bt bt-link" disabled={!!busy} onClick={() => setCancelar(true)}>Cancelar escalação</button>}
      <Confirmacao aberto={cancelar} titulo="Cancelar escalação" texto="Cancelar esta escalação ao N2?" rotuloSim="Cancelar escalação"
        onSim={() => ir("n2_cancelar")} onFechar={() => setCancelar(false)} ocupado={busy === "n2_cancelar"} erro={erro} />
    </section>
  );
}
