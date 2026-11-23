import { useEffect, useState, type MouseEvent } from "react";
import { irPara } from "../../lib/rota";

export const lerLocal = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
export const gravarLocal = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };

export const mensagemErro = (e: unknown) => (e instanceof Error && e.message) || "Algo deu errado. Tente de novo.";

// <a href> de verdade (Ctrl/⌘+clique e botão do meio abrem em aba nova); clique simples navega sem recarregar.
export const aoClicarLink = (href: string, depois?: () => void) => (e: MouseEvent<HTMLAnchorElement>) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  irPara(href);
  depois?.();
};

export function useMedia(q: string) {
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const mq = matchMedia(q), f = () => setM(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [q]);
  return m;
}
