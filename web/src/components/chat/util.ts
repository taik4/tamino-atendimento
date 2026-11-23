import type { MouseEvent as ReactMouseEvent } from "react";
import type { Avatar, Mensagem } from "../../lib/api";
import { irPara } from "../../lib/rota";

export const IDIOMAS = { pt: "Português", en: "English", zh: "中文", es: "Español" } as const;
export type Lang = keyof typeof IDIOMAS;

const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
/** Unix (s) -> "22/11 20:15", no fuso do painel (igual ao app.py). */
export const dataHora = (ts: number) => fmt.format(new Date(ts * 1000)).replace(",", "");

export function iniciais(nome: string) {
  const p = (nome || "").match(/[\p{L}\p{N}]+/gu) || [];
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

/** Avatar de quem escreveu a mensagem (a mensagem não traz foto): iniciais sobre uma cor fixa pelo nome. */
export function avatarDe(nome: string): Avatar {
  let h = 0;
  for (const c of nome || "?") h = (h * 31 + c.charCodeAt(0)) % 360;
  return { foto: "", grupo: false, cor: h, iniciais: iniciais(nome) };
}

/** "Nome: trecho" da última mensagem do cliente no contexto do card (igual ao ultima_msg do app.py). */
export function ultimaDoCliente(ctx: Mensagem[]) {
  const m = [...ctx].reverse().find((x) => x.tipo === "incoming");
  return m ? `${m.nome}: ${m.texto.slice(0, 140)}` : "";
}

/** Link que navega dentro da casca, mas deixa Ctrl/⌘/meio-clique abrir em outra aba. */
export function linkInterno(caminho: string) {
  return {
    href: caminho,
    onClick: (e: ReactMouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      irPara(caminho);
    },
  };
}

/** O usuário está perto do fim da rolagem? (só então a lista desce sozinha quando chega mensagem) */
export const pertoDoFim = (el: HTMLElement | null) => !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
