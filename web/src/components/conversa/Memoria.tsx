import { useState } from "react";
import { BrainIcon, Delete02Icon, PencilEdit02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { api, type Memoria } from "../../lib/api";
import { Icone } from "../../lib/icone";
import { Confirmacao } from "../chat/Controles";
import { dataHora } from "../chat/util";
import "./Conversa.css";

type Campos = { resumo: string; pendencias: string; fatos: string; fixo: string };
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Memória da conversa: leitura primeiro; editar recolhido; Esquecer cliente com confirmação. */
export function PainelMemoria({ conv, m, onFeito }: { conv: string; m: Memoria; onFeito: () => void }) {
  const [busy, setBusy] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [inteiro, setInteiro] = useState(false);
  const [ed, setEd] = useState<Campos | null>(null);
  const [confirmar, setConfirmar] = useState<"" | "limpar" | "esquecer">("");

  const ir = (acao: string, extra: Record<string, string>, depois?: () => void) => {
    setBusy(acao); setErro(""); setAviso("");
    api.acao({ acao, conv, ...extra })
      .then(() => { setConfirmar(""); depois?.(); onFeito(); })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setBusy(""));
  };
  const resumo = m.resumo.trim(), fixo = m.fixo.trim();
  const vazia = !(resumo || fixo || m.pendencias.length || m.fatos.length);
  const longo = resumo.length > 420;
  const quando = m.atualizado ? "atualizada " + dataHora(m.atualizado).replace(" ", " às ") : "ainda não gerada";
  const contagem = [m.pendencias.length && plural(m.pendencias.length, "pendência", "pendências"), m.fatos.length && plural(m.fatos.length, "fato", "fatos")]
    .filter(Boolean).join(" · ");
  const campo = (k: keyof Campos, rotulo: string, dica: string, rows: number) => ed && (
    <label className="mem-campo">
      <span>{rotulo}{dica && <small>{dica}</small>}</span>
      <textarea className="campo" rows={rows} value={ed[k]} onChange={(e) => setEd({ ...ed, [k]: e.target.value })} />
    </label>
  );

  return (
    <section className="mem" aria-labelledby="mem-tit">
      <div className="lado-cab"><Icone icon={BrainIcon} size={18} /><h2 id="mem-tit">Memória da conversa</h2></div>
      <p className="lado-sub">{quando}{contagem && ` · ${contagem}`}</p>
      {vazia ? (
        <div className="mem-vazia">
          <p>Ainda não há memória desta conversa.</p>
          <p className="lado-sub">Ela se forma sozinha conforme a conversa anda. Para gerar agora, use Atualizar agora.</p>
        </div>
      ) : <>
        {resumo && <p className={"mem-resumo" + (longo && !inteiro ? " curto" : "")}>{resumo}</p>}
        {longo && <button type="button" className="bt-link mem-ler" onClick={() => setInteiro(!inteiro)}>{inteiro ? "Mostrar menos" : "Ler resumo inteiro"}</button>}
        <div>
          <h3>Pendências {!!m.pendencias.length && <span className="num">{m.pendencias.length}</span>}</h3>
          {m.pendencias.length ? <ul className="mem-l mem-pend">{m.pendencias.map((p, i) => <li key={i}>{p}</li>)}</ul> : <p className="mem-vz">Nenhuma pendência em aberto.</p>}
        </div>
        <div>
          <h3>Fatos {!!m.fatos.length && <span className="num">{m.fatos.length}</span>}</h3>
          {m.fatos.length ? <ul className="mem-l mem-fatos">{m.fatos.map((f, i) => <li key={i}>{f}</li>)}</ul> : <p className="mem-vz">Nenhum fato registrado.</p>}
        </div>
        {fixo && <div className="mem-fixo"><h3>Suas notas <span>a IA não reescreve</span></h3><p>{fixo}</p></div>}
      </>}
      {aviso && <p className="mem-ok" role="status">{aviso}</p>}
      {erro && !confirmar && <p className="erro-in" role="alert">{erro}</p>}
      <div className="mem-barra">
        <button type="button" className="bt bt-sec" disabled={!!busy}
          onClick={() => ir("mem_atualizar", {}, () => { setAviso("Atualizando em segundo plano. Leva alguns segundos."); setTimeout(onFeito, 10000); })}>
          <Icone icon={RefreshIcon} size={16} />{busy === "mem_atualizar" ? "Pedindo…" : "Atualizar agora"}
        </button>
        <button type="button" className="bt-link" aria-expanded={!!ed}
          onClick={() => setEd(ed ? null : { resumo: m.resumo, pendencias: m.pendencias.join("\n"), fatos: m.fatos.join("\n"), fixo: m.fixo })}>
          <Icone icon={PencilEdit02Icon} size={16} />{ed ? "Fechar edição" : "Editar memória"}
        </button>
      </div>
      {ed && (
        <div className="mem-ed">
          {campo("resumo", "Resumo", "", 6)}
          {campo("pendencias", "Pendências", "uma por linha", Math.max(4, m.pendencias.length + 1))}
          {campo("fatos", "Fatos", "um por linha", Math.max(4, m.fatos.length + 1))}
          {campo("fixo", "Suas notas", "a IA não reescreve", 3)}
          <div className="linha">
            <button type="button" className="bt bt-pri" disabled={!!busy} onClick={() => ir("mem_salvar", ed, () => setEd(null))}>{busy === "mem_salvar" ? "Salvando…" : "Salvar"}</button>
            <button type="button" className="bt bt-perigo" disabled={!!busy} onClick={() => setConfirmar("limpar")}>Limpar memória</button>
          </div>
        </div>
      )}
      <p className="lado-sub">Tudo fica gravado mascarado: sem CPF, CNPJ, e-mail, telefone nem ID inteiro.</p>
      <button type="button" className="bt-link mem-esq" onClick={() => setConfirmar("esquecer")}><Icone icon={Delete02Icon} size={16} />Esquecer cliente</button>
      <Confirmacao aberto={confirmar === "limpar"} titulo="Limpar memória" texto="Apagar a memória desta conversa?" rotuloSim="Limpar memória"
        onSim={() => ir("mem_limpar", {}, () => setEd(null))} onFechar={() => setConfirmar("")} ocupado={busy === "mem_limpar"} erro={erro} />
      <Confirmacao aberto={confirmar === "esquecer"} titulo="Esquecer cliente" texto="Apaga memória, escalações, rascunhos e métricas desta conversa. Não dá para desfazer."
        rotuloSim="Apagar tudo desta conversa" onSim={() => ir("esquecer_cliente", {})} onFechar={() => setConfirmar("")} ocupado={busy === "esquecer_cliente"} erro={erro} />
    </section>
  );
}
