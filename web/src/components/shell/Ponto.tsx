import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useEstado } from "../../lib/estado";
import { BotaoFechar, Sheet } from "./Sheet";
import { mensagemErro } from "./util";

const hhmm = (s: number) => new Date(s * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function Crono({ desde }: { desde: number }) {
  const [, tic] = useState(0);
  useEffect(() => { const t = setInterval(() => tic((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor(Date.now() / 1000 - desde));
  return <span className="cs-crono">{[s / 3600, (s % 3600) / 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, "0")).join(":")}</span>;
}

// Ponto do turno: Entrar/Sair. Pergunta antes se avisa o grupo do N2 (nada vai ao grupo sem o clique em "Registrar e avisar").
export function Ponto() {
  const { estado, recarregar } = useEstado();
  const [tipo, setTipo] = useState<"entrada" | "saida" | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  if (!estado) return null;
  const p = estado.ponto;
  const msg = tipo === "entrada" ? p.msg_entrada : p.msg_saida;
  const fechar = () => { if (!ocupado) setTipo(null); };
  const registrar = async (avisar: boolean) => {
    if (!tipo) return;
    setOcupado(true); setErro("");
    try {
      await api.acao({ acao: "ponto", tipo, avisar: avisar ? "1" : "0" });
      recarregar(); setTipo(null);
    } catch (e) {
      const m = mensagemErro(e);
      if (m.startsWith("Ponto registrado")) { recarregar(); setTipo(null); alert(m); return; }
      setErro(m);
    } finally { setOcupado(false); }
  };
  const desde = p.em_servico && p.desde ? hhmm(p.desde) : "";
  return (
    <div className="cs-ponto">
      {p.em_servico ? (
        <span className="cs-ponto-st" title={desde ? `Em serviço desde ${desde}` : "Em serviço"}>
          <i className="cs-dot ok" />
          <span className="cs-sr">Em serviço{desde && ` desde ${desde}`}, há </span>
          <span className="cs-desde" aria-hidden="true">Em serviço{desde && ` desde ${desde}`}</span>
          {p.desde ? <Crono desde={p.desde} /> : null}
        </span>
      ) : (
        <span className="cs-ponto-st cs-mut"><i className="cs-dot" />Fora de serviço</span>
      )}
      <button type="button" className={"cs-bt" + (p.em_servico ? "" : " cs-bt-pri")} aria-haspopup="dialog"
        onClick={() => { setErro(""); setTipo(p.em_servico ? "saida" : "entrada"); }}>
        {p.em_servico ? "Sair" : "Entrar"}
      </button>
      <Sheet aberto={!!tipo} fechar={fechar} rotulo={tipo === "entrada" ? "Entrar no serviço" : "Sair do serviço"} className="cs-dlg">
        <div className="cs-dlg-corpo">
          <header className="cs-dlg-cab"><h2>{tipo === "entrada" ? "Entrar no serviço" : "Sair do serviço"}</h2><BotaoFechar fechar={fechar} /></header>
          {msg ? (
            <>
              <p className="cs-dlg-txt">Avisar o grupo do N2 com esta mensagem?</p>
              <p className="cs-ponto-msg">{msg}</p>
            </>
          ) : (
            <p className="cs-dlg-txt">Registrar o horário de {tipo === "entrada" ? "entrada" : "saída"}?</p>
          )}
          {erro && <p className="cs-erro-linha" role="alert">{erro}</p>}
          <div className="cs-dlg-acoes">
            <button type="button" className={"cs-bt" + (msg ? "" : " cs-bt-pri")} disabled={ocupado} onClick={() => registrar(false)}>
              {ocupado ? "Registrando…" : msg ? "Só registrar" : "Registrar"}
            </button>
            {msg && (
              <button type="button" className="cs-bt cs-bt-pri" disabled={ocupado} onClick={() => registrar(true)}>Registrar e avisar o N2</button>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
