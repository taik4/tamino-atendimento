import { useEffect } from "react";

// A casca faz o polling de /novidades e avisa as telas por eventos da janela:
//   "painel:cards"   detail: number[]  -> ids de cards da fila que mudaram (mensagem nova ou IA terminou)
//   "painel:eventos" detail: {conv,nome,texto,t}[] -> mensagens novas (a conversa aberta recarrega o histórico)
export type EventoMsg = { t: number; conv: string; nome: string; texto: string };

export function emitir(nome: "painel:cards", ids: number[]): void;
export function emitir(nome: "painel:eventos", evs: EventoMsg[]): void;
export function emitir(nome: string, detail: unknown) { dispatchEvent(new CustomEvent(nome, { detail })); }

export function useEvento<T>(nome: "painel:cards" | "painel:eventos", fn: (d: T) => void) {
  useEffect(() => {
    const h = (e: Event) => fn((e as CustomEvent<T>).detail);
    addEventListener(nome, h);
    return () => removeEventListener(nome, h);
  }, [nome, fn]);
}
