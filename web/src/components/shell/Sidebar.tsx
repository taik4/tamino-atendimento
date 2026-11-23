import type { ComponentProps } from "react";
import {
  Analytics01Icon, CreditCardIcon, DashboardSquare01Icon, InboxIcon, PercentSquareIcon, Settings01Icon,
  SidebarLeft01Icon, UserMultipleIcon, Wallet01Icon, WebhookIcon,
} from "@hugeicons/core-free-icons";
import { useEstado } from "../../lib/estado";
import { Icone } from "../../lib/icone";
import { BotaoFechar } from "./Sheet";
import { TemaToggle } from "./TemaToggle";
import { aoClicarLink } from "./util";
import "./Sidebar.css";

type IconeT = ComponentProps<typeof Icone>["icon"];

const ITENS: [string, string, IconeT][] = [
  ["/", "Fila", InboxIcon],
  ["/insights", "Insights", Analytics01Icon],
  ["/dashboard", "Dashboard", DashboardSquare01Icon],
  ["/saques", "Saques / Consulta", Wallet01Icon],
  ["/pagamentos", "Pagamentos", CreditCardIcon],
  ["/webhooks", "Webhooks", WebhookIcon],
  ["/usuarios", "Usuários", UserMultipleIcon],
  ["/taxas", "Taxas", PercentSquareIcon],
];

// Menu lateral. No PC fica fixo (pode recolher para só ícones); no celular vai dentro da gaveta (com `fechar`).
export function Sidebar({ rota, recolhido = false, alternar, fechar }: {
  rota: string; recolhido?: boolean; alternar?: () => void; fechar?: () => void;
}) {
  const { estado } = useEstado();
  const ativo = (h: string) => (h === "/" ? rota === "/" || rota.startsWith("/c/") : rota === h || rota.startsWith(h + "/"));
  const item = (h: string, rot: string, icon: IconeT, n = 0) => (
    <a href={h} className={"cs-mi" + (ativo(h) ? " on" : "")} aria-current={ativo(h) ? "page" : undefined}
      title={recolhido ? rot : undefined} onClick={aoClicarLink(h, fechar)}>
      <Icone icon={icon} />
      <span className="cs-mi-rot">{rot}</span>
      {n > 0 && <span className="cs-n">{n}<span className="cs-sr"> na fila</span></span>}
    </a>
  );
  return (
    <div className={"cs-menu" + (recolhido ? " recolhido" : "")}>
      <div className="cs-marca">
        <img src="/static/logo-256.png?v=2" alt="" width={28} height={28} />
        <span className="cs-mi-rot">Atendimento <b>Tamino</b></span>
        {fechar && <BotaoFechar fechar={fechar} rotulo="Fechar menu" />}
      </div>
      <nav aria-label="Telas">
        <ul>{ITENS.map(([h, rot, icon]) => <li key={h}>{item(h, rot, icon, h === "/" ? estado?.fila ?? 0 : 0)}</li>)}</ul>
      </nav>
      <div className="cs-menu-pe">
        {item("/config", "Configurações", Settings01Icon)}
        <TemaToggle recolhido={recolhido} />
        {alternar && (
          <button type="button" className="cs-mi" onClick={alternar} aria-expanded={!recolhido} title={recolhido ? "Expandir menu" : undefined}>
            <Icone icon={SidebarLeft01Icon} /><span className="cs-mi-rot">{recolhido ? "Expandir menu" : "Recolher menu"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
