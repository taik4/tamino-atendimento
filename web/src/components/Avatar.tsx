import { useState } from "react";
import type { Avatar as A } from "../lib/api";
import "./Avatar.css";

// Foto do contato/grupo; sem foto (ou URL expirada), iniciais sobre a cor fixa da conversa. Grupo = quadrado, contato = círculo.
export function Avatar({ a, size = 38 }: { a: A; size?: number }) {
  const [falhou, setFalhou] = useState(false);
  return (
    <span className={"av" + (a.grupo ? " av-gr" : "")} style={{ ["--h" as string]: a.cor, width: size, height: size, fontSize: Math.round(size * 0.32) }} aria-hidden="true">
      {a.iniciais}
      {a.foto && !falhou && <img src={a.foto} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />}
    </span>
  );
}
