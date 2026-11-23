import { useRef, useState, type RefObject } from "react";
import { ArrowTurnBackwardIcon, Attachment01Icon, Cancel01Icon, PlusSignIcon, SentIcon } from "@hugeicons/core-free-icons";
import { api, type Mensagem, type Rapida } from "../../lib/api";
import { Icone } from "../../lib/icone";
import { irPara } from "../../lib/rota";
import { Corrigir, Opcoes, SeletorIdioma } from "../chat/Controles";
import type { Lang } from "../chat/util";
import "./Conversa.css";

const MAX = 30 * 1024 * 1024; // limite do app.py para o POST inteiro

type Props = {
  conv: string; lang: Lang; rapidas: Rapida[]; citada: Mensagem | null; campo: RefObject<HTMLTextAreaElement | null>;
  onSemCitacao: () => void; onEnviado: () => void; onIdioma: (l: Lang) => void;
};

/** Mensagem livre (acao=livre, com anexos e citação) e "Gerar rascunho na fila" (acao=rascunhar). Nada sai sem o clique em Enviar. */
export function Composer({ conv, lang, rapidas, citada, campo, onSemCitacao, onEnviado, onIdioma }: Props) {
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [busy, setBusy] = useState<"" | "livre" | "rascunhar">("");
  const [erro, setErro] = useState("");
  const [mais, setMais] = useState(false); // celular: ferramentas recolhidas atrás do "+"
  const input = useRef<HTMLInputElement>(null);
  const total = arquivos.reduce((s, a) => s + a.size, 0);

  const enviar = () => {
    if (total > MAX) return setErro("Os anexos passam de 30 MB. Tire algum e tente de novo.");
    setBusy("livre"); setErro("");
    api.acao({ acao: "livre", conv, texto, in_reply_to: citada?.id ?? "" }, arquivos)
      .then(() => { setTexto(""); setArquivos([]); onSemCitacao(); onEnviado(); })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setBusy(""));
  };
  const rascunhar = () => {
    setBusy("rascunhar"); setErro("");
    api.acao({ acao: "rascunhar", conv }).then(() => irPara("/")).catch((e: Error) => { setErro(e.message); setBusy(""); });
  };

  return (
    <div className="cmp">
      {citada && (
        <div className="cmp-cit">
          <Icone icon={ArrowTurnBackwardIcon} size={16} />
          <span>Respondendo <b>{citada.nome}</b>: {(citada.texto || "anexo").slice(0, 120)}</span>
          <button type="button" className="bt-ic" aria-label="Não citar esta mensagem" title="Não citar" onClick={onSemCitacao}><Icone icon={Cancel01Icon} size={16} /></button>
        </div>
      )}
      <div className={"cmp-ferr" + (mais ? " on" : "")} id={`cmp-ferr-${conv}`}>
        <Opcoes rolar rotulo="Respostas rápidas" itens={rapidas} atual={texto} onEscolher={(x) => { setTexto(x); setMais(false); campo.current?.focus(); }} />
        <div className="cmp-barra">
          <button type="button" className="bt bt-sec" onClick={() => input.current?.click()}><Icone icon={Attachment01Icon} size={16} />Anexar</button>
          <SeletorIdioma conv={conv} lang={lang} onMudou={onIdioma} />
          <Corrigir valor={texto} lang={lang} onTrocar={setTexto} />
          <button type="button" className="bt bt-sec cmp-rasc" disabled={!!busy} onClick={rascunhar}>{busy === "rascunhar" ? "Gerando rascunho…" : "Gerar rascunho na fila"}</button>
        </div>
      </div>
      <div className="cmp-linha">
        <button type="button" className={"bt-ic cmp-mais" + (mais ? " on" : "")} aria-label={mais ? "Fechar ferramentas" : "Respostas rápidas, anexo, idioma e correção"}
          aria-expanded={mais} aria-controls={`cmp-ferr-${conv}`} onClick={() => setMais((m) => !m)}>
          <Icone icon={mais ? Cancel01Icon : PlusSignIcon} size={20} />
        </button>
        <textarea ref={campo} className="campo cmp-tx" rows={1} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva a mensagem…"
          spellCheck lang="pt-BR" aria-label="Mensagem para o cliente" disabled={busy === "livre"} />
        <button type="button" className="bt bt-pri cmp-env" disabled={!!busy || (!texto.trim() && !arquivos.length)} onClick={enviar} aria-label="Enviar">
          <Icone icon={SentIcon} size={18} /><span className="cmp-env-rot">{busy === "livre" ? "Enviando…" : "Enviar"}</span>
        </button>
      </div>
      {!!arquivos.length && (
        <ul className="cmp-arqs" aria-label="Anexos">
          {arquivos.map((a, i) => (
            <li key={i} className="cmp-arq">
              <Icone icon={Attachment01Icon} size={14} /><span>{a.name}</span>
              <button type="button" className="bt-ic" aria-label={`Tirar ${a.name}`} onClick={() => setArquivos((l) => l.filter((_, j) => j !== i))}><Icone icon={Cancel01Icon} size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      {erro && <p className="erro-in" role="alert">{erro}</p>}
      <input ref={input} type="file" multiple hidden onChange={(e) => { const fs = [...(e.target.files ?? [])]; setArquivos((l) => [...l, ...fs]); e.target.value = ""; }} />
    </div>
  );
}
