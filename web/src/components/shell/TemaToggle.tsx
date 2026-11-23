import { useState } from "react";
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { Icone } from "../../lib/icone";
import { gravarLocal, lerLocal } from "./util";

// Aplica o tema salvo antes do primeiro desenho (o painel antigo faz o mesmo no <head>).
const salvo = lerLocal("tema");
if (salvo) document.documentElement.dataset.theme = salvo;

const escuroAgora = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

export function TemaToggle({ recolhido }: { recolhido: boolean }) {
  const [escuro, setEscuro] = useState(escuroAgora);
  const rot = escuro ? "Usar tema claro" : "Usar tema escuro";
  const trocar = () => {
    const t = escuro ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    gravarLocal("tema", t);
    setEscuro(!escuro);
    // telas antigas (iframe da mesma origem) trocam junto, sem recarregar
    document.querySelectorAll("iframe").forEach((f) => { const r = f.contentDocument?.documentElement; if (r) r.dataset.theme = t; });
  };
  return (
    <button type="button" className="cs-mi" onClick={trocar} title={recolhido ? rot : undefined}>
      <Icone icon={escuro ? Sun03Icon : Moon02Icon} /><span className="cs-mi-rot">{rot}</span>
    </button>
  );
}
