import { Menu01Icon, Message01Icon } from "@hugeicons/core-free-icons";
import type { StatusItem } from "../../lib/api";
import { useEstado } from "../../lib/estado";
import { Icone } from "../../lib/icone";
import { Ponto } from "./Ponto";
import "./TopBar.css";

const idade = (s: number | null) => (s == null ? "" : s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min`);

function Pilula({ s }: { s: StatusItem }) {
  const i = idade(s.idade_s);
  return (
    <li className={"cs-pil" + (s.ok ? "" : " er")} title={s.detalhe || s.msg}>
      <i className={"cs-dot " + (s.ok ? "ok" : "er")} />
      <b>{s.nome}</b>
      <span className="cs-sr">{s.ok ? " ativo" : ` com problema: ${s.msg}`}</span>
      {i && <span className="cs-idade">{i}</span>}
    </li>
  );
}

// Barra do conteúdo: hambúrguer (celular) | status Tamino/Evo/IA no meio | ponto e "Conversas" (abaixo de 1100 px).
export function TopBar({ celular, largo, naoLidas, menuAberto, feedAberto, abrirMenu, abrirFeed }: {
  celular: boolean; largo: boolean; naoLidas: number; menuAberto: boolean; feedAberto: boolean;
  abrirMenu: () => void; abrirFeed: () => void;
}) {
  const { estado } = useEstado();
  return (
    <header className="cs-top">
      <div className="cs-top-esq">
        {celular && (
          <button type="button" className="cs-ic" onClick={abrirMenu} aria-label="Abrir menu" aria-expanded={menuAberto} aria-haspopup="dialog">
            <Icone icon={Menu01Icon} size={22} />
          </button>
        )}
      </div>
      <ul className="cs-status" aria-label="Status dos serviços">
        {estado ? estado.status.map((s) => <Pilula key={s.nome} s={s} />) : <li className="cs-pil cs-mut">verificando…</li>}
      </ul>
      <div className="cs-top-dir">
        <Ponto />
        {!largo && (
          <button type="button" className="cs-bt cs-conv-bt" onClick={abrirFeed} aria-expanded={feedAberto} aria-haspopup="dialog"
            aria-label={naoLidas ? `Conversas, ${naoLidas} não lidas` : "Conversas"}>
            <Icone icon={Message01Icon} size={18} />
            <span className="cs-conv-rot">Conversas</span>
            {naoLidas > 0 && <span className="cs-n">{naoLidas}</span>}
          </button>
        )}
      </div>
    </header>
  );
}
