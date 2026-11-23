import { useCallback, useEffect, useState } from "react";
import { RemoteControlIcon } from "@hugeicons/core-free-icons";
import { api, type Remoto } from "../../lib/api";
import { Icone } from "../../lib/icone";
import { BotaoFechar, Sheet } from "./Sheet";
import { mensagemErro } from "./util";
import "./FabRemoto.css";

// Botão flutuante (canto inferior esquerdo, só no PC) + painel do acesso pelo celular.
export function FabRemoto() {
  const [aberto, setAberto] = useState(false);
  const [r, setR] = useState<Remoto | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const fechar = () => setAberto(false);

  const carregar = useCallback(() => api.remoto().then((x) => { setR(x); setErro(""); }).catch((e) => setErro(mensagemErro(e))), []);
  // aberto: atualiza a cada 5 s para mostrar o celular entrando logo depois de ler o QR
  useEffect(() => {
    if (!aberto) return;
    carregar();
    const t = setInterval(carregar, 5000);
    return () => clearInterval(t);
  }, [aberto, carregar]);

  const fazer = async (acao: string) => {
    setOcupado(true); setErro("");
    try { await api.acao({ acao }); await carregar(); } catch (e) { setErro(mensagemErro(e)); } finally { setOcupado(false); }
  };

  return (
    <>
      <button type="button" className="cs-fab cs-fab-esq" onClick={() => setAberto(true)} aria-haspopup="dialog" aria-expanded={aberto}
        aria-label="Controle remoto pelo celular" title="Controle remoto pelo celular">
        <Icone icon={RemoteControlIcon} size={24} />
      </button>
      <Sheet aberto={aberto} fechar={fechar} rotulo="Controle remoto" className="cs-dlg">
        <div className="cs-dlg-corpo">
          <header className="cs-dlg-cab"><h2>Controle remoto</h2><BotaoFechar fechar={fechar} /></header>
          {!r ? (
            erro ? <p className="cs-erro-linha" role="alert">{erro}</p> : <p className="cs-dlg-txt cs-mut">Carregando…</p>
          ) : (
            <>
              <div className="cs-rem-linha">
                <span>
                  <b id="cs-rem-rot">Acesso pelo celular</b>
                  <span className="cs-mut">{r.ligado ? "Ligado. Leia o QR no celular e digite o código." : "Desligado."}</span>
                </span>
                <button type="button" role="switch" className="cs-switch" aria-checked={r.ligado} aria-labelledby="cs-rem-rot" disabled={ocupado}
                  onClick={() => fazer(r.ligado ? "remoto_off" : "remoto_on")}><span /></button>
              </div>
              {r.ligado && (
                <>
                  {/* SVG gerado pelo próprio app.py */}
                  {r.qr_svg && <div className="cs-rem-qr" role="img" aria-label="QR code do link do painel" dangerouslySetInnerHTML={{ __html: r.qr_svg }} />}
                  {r.link && <p className="cs-rem-link">{r.link}</p>}
                  <div className="cs-rem-linha">
                    <span><span className="cs-mut">Código de pareamento</span>{r.codigo ? <b className="cs-rem-cod">{r.codigo}</b> : <span className="cs-mut"> · expirou (vale 5 min). Gere um novo para mostrar o QR.</span>}</span>
                    <button type="button" className="cs-bt" disabled={ocupado} onClick={() => fazer("remoto_codigo")}>Novo código</button>
                  </div>
                  <div className="cs-rem-linha">
                    <span className="cs-mut">{r.sessoes === 1 ? "1 celular conectado" : `${r.sessoes} celulares conectados`}</span>
                    <button type="button" className="cs-bt" disabled={ocupado || !r.sessoes} onClick={() => fazer("remoto_revogar")}>Desconectar celulares</button>
                  </div>
                </>
              )}
              {erro && <p className="cs-erro-linha" role="alert">{erro}</p>}
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
