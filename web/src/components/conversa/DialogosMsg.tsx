import { useEffect, useState } from "react";
import { api, type Mensagem } from "../../lib/api";
import { Confirmacao, Dialogo } from "../chat/Controles";

type P = { conv: string; m: Mensagem | null; onFechar: () => void; onFeito: () => void };

/** Editar mensagem nossa (acao=editar_msg): muda no WhatsApp do cliente. */
export function EditarMsg({ conv, m, onFechar, onFeito }: P) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { if (m) { setTexto(m.texto); setErro(""); } }, [m]);
  const salvar = () => {
    if (!m) return;
    setBusy(true); setErro("");
    api.acao({ acao: "editar_msg", conv, msg: m.id, texto }).then(() => { onFechar(); onFeito(); })
      .catch((e: Error) => setErro(e.message)).finally(() => setBusy(false));
  };
  return (
    <Dialogo aberto={!!m} titulo="Editar mensagem" onFechar={onFechar}>
      <p>A mensagem muda no WhatsApp do cliente também.</p>
      <textarea className="campo" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck lang="pt-BR" aria-label="Novo texto da mensagem" />
      {erro && <p className="erro-in" role="alert">{erro}</p>}
      <div className="dlg-acoes">
        <button type="button" className="bt bt-sec" onClick={onFechar}>Voltar</button>
        <button type="button" className="bt bt-pri" disabled={busy || !texto.trim() || texto === m?.texto} onClick={salvar}>{busy ? "Salvando…" : "Salvar"}</button>
      </div>
    </Dialogo>
  );
}

/** Apagar mensagem nossa (acao=apagar_msg): some para o cliente, sem volta. */
export function ApagarMsg({ conv, m, onFechar, onFeito }: P) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { setErro(""); }, [m]);
  const apagar = () => {
    if (!m) return;
    setBusy(true); setErro("");
    api.acao({ acao: "apagar_msg", conv, msg: m.id }).then(() => { onFechar(); onFeito(); })
      .catch((e: Error) => setErro(e.message)).finally(() => setBusy(false));
  };
  return (
    <Confirmacao aberto={!!m} titulo="Apagar mensagem" texto="Ela some para o cliente também e não dá para desfazer." rotuloSim="Apagar"
      onSim={apagar} onFechar={onFechar} ocupado={busy} erro={erro} />
  );
}
