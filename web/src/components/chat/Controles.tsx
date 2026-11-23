import { useEffect, useRef, useState, type ReactNode } from "react";
import { SparklesIcon, TranslateIcon, UndoIcon } from "@hugeicons/core-free-icons";
import { api, type Classe } from "../../lib/api";
import { Icone } from "../../lib/icone";
import { IDIOMAS, type Lang } from "./util";
import "./Chat.css";

/** Corrigir (pt) ou Corrigir e traduzir (outro idioma), com Desfazer enquanto o texto corrigido não foi mexido. */
export function Corrigir({ valor, lang, onTrocar }: { valor: string; lang: string; onTrocar: (v: string) => void }) {
  const [estado, setEstado] = useState<"idle" | "busy" | "sem" | "erro">("idle");
  const [desfazer, setDesfazer] = useState<{ antes: string; depois: string } | null>(null);
  const traduz = lang !== "pt";
  useEffect(() => { setEstado((e) => (e === "busy" ? e : "idle")); }, [valor]);
  const ir = () => {
    const orig = valor;
    setEstado("busy");
    api.corrigir(orig, lang).then((x) => {
      if (x.trim() && x !== orig) { setDesfazer({ antes: orig, depois: x }); onTrocar(x); setEstado("idle"); } else setEstado("sem");
    }).catch(() => setEstado("erro"));
  };
  return (
    <div className="corr">
      <button type="button" className="bt bt-sec" onClick={ir} disabled={estado === "busy" || !valor.trim()}>
        <Icone icon={SparklesIcon} size={16} />
        {estado === "busy" ? (traduz ? "Traduzindo…" : "Corrigindo…") : estado === "sem" ? "Sem erros"
          : estado === "erro" ? "Falhou, tentar de novo" : traduz ? `Corrigir e traduzir (${lang.toUpperCase()})` : "Corrigir"}
      </button>
      {desfazer && desfazer.depois === valor && (
        <button type="button" className="bt bt-sec" onClick={() => { onTrocar(desfazer.antes); setDesfazer(null); }}>
          <Icone icon={UndoIcon} size={16} />Desfazer
        </button>
      )}
    </div>
  );
}

/** Selo da classificação da IA: categoria, P1 e humor do cliente quando não está calmo. */
export function SeloClasse({ c }: { c: Classe }) {
  if (!c) return null;
  const tom = c.sentimento === "urgente" ? " selo-er" : c.prioridade === 1 || c.sentimento === "irritado" ? " selo-warn" : "";
  return (
    <span className={"selo" + tom}>
      {c.prioridade === 1 && <b>P1</b>}{c.categoria}{c.sentimento !== "calmo" && ` · ${c.sentimento}`}
    </span>
  );
}

export type Opcao ={ rotulo: string; texto: string; selo?: string[] };

/** Botões que trocam o texto do campo (versões da IA e respostas rápidas). No celular, uma fileira que rola para o lado. */
export function Opcoes({ itens, atual, onEscolher, rotulo, forte, rolar }: {
  itens: Opcao[]; atual: string; onEscolher: (t: string) => void; rotulo: string; forte?: boolean; rolar?: boolean;
}) {
  const visiveis = itens.filter((o) => o.texto);
  if (!visiveis.length) return null;
  return (
    <div className={"lbls" + (forte ? " forte" : "") + (rolar ? " rolar" : "")} role="group" aria-label={rotulo}>
      {visiveis.map((o) => {
        const on = o.texto === atual;
        return (
          <button key={o.rotulo} type="button" className={"lbl" + (on ? " on" : "")} aria-pressed={on} onClick={() => onEscolher(o.texto)}>
            <span>{o.rotulo}</span>
            {!!o.selo?.length && <span className="selo-er" title={"Termos internos: " + o.selo.join(", ")}>viola sigilo</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Idioma da conversa (acao=idioma). Muda o idioma das respostas rápidas e do Corrigir. */
export function SeletorIdioma({ conv, lang, onMudou }: { conv: string; lang: string; onMudou: (l: Lang) => void }) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const mudar = (v: string) => {
    setBusy(true); setErro("");
    api.acao({ acao: "idioma", conv, lang: v }).then(() => onMudou(v as Lang)).catch((e: Error) => setErro(e.message)).finally(() => setBusy(false));
  };
  return (
    <label className="idi">
      <Icone icon={TranslateIcon} size={16} />
      <span>Idioma</span>
      <select value={lang} disabled={busy} onChange={(e) => mudar(e.target.value)}>
        {Object.entries(IDIOMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {erro && <span className="erro-in" role="alert">{erro}</span>}
    </label>
  );
}

/** Diálogo próprio (dialog nativo: foco preso, Esc fecha). */
export function Dialogo({ aberto, titulo, onFechar, children }: { aberto: boolean; titulo: string; onFechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog ref={ref} className="dlg" onClose={onFechar} onClick={(e) => { if (e.target === ref.current) onFechar(); }} aria-label={titulo}>
      {aberto && <div className="dlg-c"><h3>{titulo}</h3>{children}</div>}
    </dialog>
  );
}

/** Confirmação de ação sem volta (2º passo). */
export function Confirmacao({ aberto, titulo, texto, rotuloSim, onSim, onFechar, ocupado, erro }: {
  aberto: boolean; titulo: string; texto: string; rotuloSim: string; onSim: () => void; onFechar: () => void; ocupado?: boolean; erro?: string;
}) {
  return (
    <Dialogo aberto={aberto} titulo={titulo} onFechar={onFechar}>
      <p>{texto}</p>
      {erro && <p className="erro-in" role="alert">{erro}</p>}
      <div className="dlg-acoes">
        <button type="button" className="bt bt-sec" onClick={onFechar}>Voltar</button>
        <button type="button" className="bt bt-perigo" onClick={onSim} disabled={ocupado}>{ocupado ? "Aguarde…" : rotuloSim}</button>
      </div>
    </Dialogo>
  );
}
