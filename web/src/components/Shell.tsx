import { useState, type ReactNode } from "react";
import { EstadoProvider, useEstado } from "../lib/estado";
import { useEvento } from "../lib/eventos";
import { usePolling } from "../lib/polling";
import { ChatClaude } from "./shell/ChatClaude";
import { FabRemoto } from "./shell/FabRemoto";
import { Feed } from "./shell/Feed";
import { Sheet } from "./shell/Sheet";
import { Sidebar } from "./shell/Sidebar";
import { TopBar } from "./shell/TopBar";
import { gravarLocal, lerLocal, useMedia } from "./shell/util";
import "./Shell.css";

export function Shell({ rota, children }: { rota: string; children: ReactNode }) {
  return <EstadoProvider><Casca rota={rota}>{children}</Casca></EstadoProvider>;
}

// Tela cheia: menu | barra + conteúdo | feed. ≥ 1100 px três colunas; 820–1099 feed em gaveta; < 820 menu e feed em gaveta.
function Casca({ rota, children }: { rota: string; children: ReactNode }) {
  usePolling();
  const { estado, recarregar } = useEstado();
  useEvento("painel:cards", recarregar); // badge da fila no menu acompanha card novo sem esperar os 15 s
  const largo = useMedia("(width >= 1100px)");
  const celular = useMedia("(width < 820px)");
  const [menu, setMenu] = useState(false);
  const [feed, setFeed] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [recolhido, setRecolhido] = useState(() => lerLocal("menu_recolhido") === "1");
  const alternar = () => { gravarLocal("menu_recolhido", recolhido ? "0" : "1"); setRecolhido(!recolhido); };
  const conv = rota.match(/^\/c\/([0-9a-f-]{36})$/)?.[1] ?? null;
  const fecharFeed = () => setFeed(false);
  const conversas = <Feed ativo={conv} aoContar={setNaoLidas} fechar={largo ? undefined : fecharFeed} />;

  return (
    <div className={"cs" + (recolhido && !celular ? " recolhido" : "")}>
      <a className="cs-pular" href="#conteudo">Pular para o conteúdo</a>
      {!celular && <aside className="cs-menu-col"><Sidebar rota={rota} recolhido={recolhido} alternar={alternar} /></aside>}
      <div className="cs-centro">
        <TopBar celular={celular} largo={largo} naoLidas={naoLidas} menuAberto={menu} feedAberto={feed}
          abrirMenu={() => setMenu(true)} abrirFeed={() => setFeed(true)} />
        <main id="conteudo" className="conteudo" tabIndex={-1}>{children}</main>
        {estado && !estado.remoto && <><FabRemoto /><ChatClaude celular={celular} /></>}
      </div>
      {largo
        ? <aside className="cs-feed-col">{conversas}</aside>
        : <Sheet aberto={feed} fechar={fecharFeed} rotulo="Conversas" className="cs-gav cs-gav-dir">{conversas}</Sheet>}
      {celular && (
        <Sheet aberto={menu} fechar={() => setMenu(false)} rotulo="Menu" className="cs-gav cs-gav-esq">
          <Sidebar rota={rota} fechar={() => setMenu(false)} />
        </Sheet>
      )}
    </div>
  );
}
