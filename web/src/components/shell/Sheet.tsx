import { useEffect, useRef, type ReactNode } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icone } from "../../lib/icone";
import "./Sheet.css";

// Gaveta / diálogo sobre o <dialog> nativo: showModal() prende o foco (o resto da página fica inert), põe no topo
// e devolve o foco a quem abriu ao fechar. Os filhos ficam montados com ele fechado (o chat não perde a conversa,
// o feed em gaveta continua contando as não lidas).
export function Sheet({ aberto, fechar, rotulo, className, modal = true, children }: {
  aberto: boolean; fechar: () => void; rotulo: string; className: string; modal?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (d.open) d.close(); // reabre se mudou de modal para não modal (celular <-> PC)
    if (aberto) { if (modal) d.showModal(); else d.show(); }
  }, [aberto, modal]);
  return (
    <dialog ref={ref} className={"cs-sh " + className} aria-label={rotulo} aria-modal={modal || undefined}
      onCancel={(e) => { e.preventDefault(); fechar(); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fechar(); } }}
      onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      {children}
    </dialog>
  );
}

export function BotaoFechar({ fechar, rotulo = "Fechar" }: { fechar: () => void; rotulo?: string }) {
  return (
    <button type="button" className="cs-ic" onClick={fechar} aria-label={rotulo} title={rotulo}>
      <Icone icon={Cancel01Icon} />
    </button>
  );
}
