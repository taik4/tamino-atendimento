import { useEffect } from "react";
import { api } from "./api";
import { emitir } from "./eventos";
import { irPara } from "./rota";

// Avisos da casca (como o painel antigo): /novidades a cada 2 s, bip, "(n)" no título, notificação do navegador;
// e o ping de tempo ativo (1 min contado se a aba está visível e houve interação nos últimos 3 min).
const num = (k: string) => { try { return +(sessionStorage.getItem(k) || 0); } catch { return 0; } };
const guardar = (k: string, v: number) => { try { sessionStorage.setItem(k, String(v)); } catch { /* sem storage */ } };

export function bip() {
  try {
    const a = new AudioContext(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination); o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35);
    o.onended = () => { a.close().catch(() => {}); }; // o navegador limita quantos AudioContext ficam abertos
    o.start(); o.stop(a.currentTime + 0.35);
  } catch { /* sem áudio */ }
}

export function usePolling() {
  useEffect(() => {
    let desde = num("desde"), naoLidas = num("naoLidas"), ocupado = false, vivo = true, ultimo = Date.now();
    const marcar = () => { document.title = (naoLidas ? `(${naoLidas}) ` : "") + document.title.replace(/^\(\d+\) /, ""); };

    const checar = async () => {
      if (ocupado) return;
      ocupado = true;
      try {
        const d = await api.novidades(desde);
        if (!vivo) return;
        const primeira = !desde;
        desde = d.agora; guardar("desde", desde);
        if (primeira) return; // a primeira consulta só marca o ponto de partida
        if (d.cards.length) emitir("painel:cards", d.cards);
        if (!d.eventos.length) return;
        emitir("painel:eventos", d.eventos);
        bip();
        if (document.hasFocus()) return; // quem está olhando a tela não precisa de contador nem notificação
        naoLidas += d.eventos.length; guardar("naoLidas", naoLidas); marcar();
        if ("Notification" in window && Notification.permission === "granted")
          d.eventos.slice(-3).forEach((e) => {
            const n = new Notification(e.nome, { body: e.texto, icon: "/static/logo-256.png?v=2", tag: e.conv });
            n.onclick = () => { focus(); irPara("/c/" + e.conv); n.close(); };
          });
      } catch { /* sem conexão: tenta no próximo ciclo */ } finally { ocupado = false; }
    };

    const focado = () => { naoLidas = 0; guardar("naoLidas", 0); marcar(); };
    const mexeu = () => { ultimo = Date.now(); };
    const evs = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    // capture: o scroll acontece nos painéis internos (o documento não rola) e não sobe até a janela
    evs.forEach((e) => addEventListener(e, mexeu, { passive: true, capture: true }));
    addEventListener("focus", focado);
    marcar(); checar();
    const t1 = setInterval(checar, 2000);
    const t2 = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - ultimo < 180000) fetch("/ping", { method: "POST" }).catch(() => {});
    }, 60000);
    return () => {
      vivo = false; clearInterval(t1); clearInterval(t2);
      removeEventListener("focus", focado);
      evs.forEach((e) => removeEventListener(e, mexeu, { capture: true }));
    };
  }, []);
}
