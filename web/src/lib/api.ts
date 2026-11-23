// Contrato com o app.py (ver docs/REACT-API.md). Todas as rotas são same-origin.

export type Classe = { categoria: string; sentimento: "calmo" | "irritado" | "urgente"; prioridade: 1 | 2 | 3 } | null;

export type Avatar = { foto: string; grupo: boolean; cor: number; iniciais: string };

export type StatusItem = { nome: string; ok: boolean; msg: string; idade_s: number | null; detalhe: string };

export type Estado = {
  token: string;
  remoto: boolean; // true = aberto pelo celular (PainelRemoto): sem Claude, sem controle remoto
  status: StatusItem[];
  ponto: { em_servico: boolean; desde: number | null; turno: string; msg_entrada: string; msg_saida: string };
  fila: number;
  atendente: string;
};

export type FeedItem = {
  id: string; nome: string; quem: string; texto: string; hora: string;
  tipo: "incoming" | "outgoing" | string; status: string; pendente: number;
  avatar: Avatar; ignorado: boolean; n2: boolean; classe: Classe;
};

export type Anexo = { tipo: string; url: string; thumb: string; nome: string };

export type Mensagem = {
  id: string; tipo: "incoming" | "outgoing" | "activity" | string; nome: string; hora: string; ts: number;
  texto: string; reply: string | null; reply_preview: string; apagada: boolean; privada: boolean;
  anexos: Anexo[]; traduzivel: boolean;
};

export type Escalada = {
  id: number; status: "aberta" | "enviada" | "respondida" | "resolvida" | "cancelada"; motivo: string; motivo_txt: string;
  falta: string; pergunta: string; resposta: string;
} | null;

export type Card = {
  id: number; conversa: string; nome: string; criado: number; texto: string;
  alerta: string; // já com ⚠ quando é problema; "✍️ ..." quando a IA está redigindo
  redigindo: boolean; contexto: Mensagem[];
  versoes: { info?: string; info_b?: string; generico?: string };
  sigilo: Record<string, string[]>; memoria: string; escalada: Escalada;
  idioma: "pt" | "en" | "zh" | "es"; classe: Classe; avatar: Avatar;
};

export type Rapida = { rotulo: string; texto: string };

export type Fila = { cards: Card[]; rapidas: Record<string, Rapida[]> };

export type Memoria = { resumo: string; pendencias: string[]; fatos: string[]; fixo: string; atualizado: number | null };

export type Conversa = {
  id: string; nome: string; status: "open" | "resolved" | string; avatar: Avatar; eh_n2: boolean; ignorado: boolean;
  mensagens: Mensagem[]; mais_antiga: string | null; memoria: Memoria; escalada: Escalada; idioma: Card["idioma"];
};

export type Novidades = {
  agora: number;
  eventos: { t: number; conv: string; nome: string; texto: string }[];
  cards: number[];
};

export type Remoto = { ligado: boolean; link: string; codigo: string; qr_svg: string; sessoes: number };

export type ClaudeResposta = { resposta: string; sessao: string; erro?: string };

let TOKEN = "";
export const definirToken = (t: string) => { TOKEN = t; };

function semSessao(r: Response) {
  if (r.status === 401) { location.reload(); throw new Error("Sessão expirada: pareie de novo."); }
}

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  semSessao(r);
  if (!r.ok) throw new Error(await textoErro(r));
  return r.json() as Promise<T>;
}

async function textoErro(r: Response) {
  const t = await r.text().catch(() => "");
  return t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || `HTTP ${r.status}`;
}

export const api = {
  estado: () => getJSON<Estado>("/api/estado"),
  feed: (f: "novas" | "todas") => getJSON<{ itens: FeedItem[] }>(`/api/feed?f=${f}`),
  fila: () => getJSON<Fila>("/api/fila"),
  card: (id: number) => getJSON<{ existe: boolean; card?: Card }>(`/api/card/${id}`),
  conversa: (id: string) => getJSON<Conversa>(`/api/conversa/${id}`),
  anteriores: (id: string, antes: string) => getJSON<{ mensagens: Mensagem[]; mais_antiga: string | null }>(`/api/conversa/${id}?antes=${encodeURIComponent(antes)}`),
  novidades: (desde: number) => getJSON<Novidades>(`/novidades?desde=${desde}`),
  remoto: () => getJSON<Remoto>("/api/remoto"),

  /** Ações do painel: POST form-urlencoded (ou multipart com arquivos) em "/", como os formulários antigos.
   *  Sucesso = 2xx ou redirecionamento; erro = texto do servidor. */
  async acao(campos: Record<string, string>, arquivos?: File[]): Promise<string> {
    let body: BodyInit;
    const dados = { t: TOKEN, f: "novas", ...campos };
    if (arquivos?.length) {
      const fd = new FormData();
      Object.entries(dados).forEach(([k, v]) => fd.append(k, v));
      arquivos.forEach((a) => fd.append("arquivo", a));
      body = fd;
    } else {
      body = new URLSearchParams(dados);
    }
    const r = await fetch("/", { method: "POST", body, redirect: "manual" });
    semSessao(r);
    if (r.type === "opaqueredirect" || r.ok) return r.ok ? r.text() : "";
    throw new Error(await textoErro(r));
  },

  async corrigir(texto: string, lang: string): Promise<string> {
    const r = await fetch("/corrigir", { method: "POST", body: new URLSearchParams({ t: TOKEN, texto, lang }) });
    if (!r.ok) throw new Error("Não consegui corrigir agora.");
    return r.text();
  },
  async traduzir(texto: string): Promise<string> {
    const r = await fetch("/traduzir", { method: "POST", body: new URLSearchParams({ t: TOKEN, texto }) });
    if (!r.ok) throw new Error("Não consegui traduzir agora.");
    return r.text();
  },
  async claude(mensagem: string, sessao: string): Promise<ClaudeResposta> {
    const r = await fetch("/api/claude", { method: "POST", headers: { "content-type": "application/json", "x-token": TOKEN },
      body: JSON.stringify({ mensagem, sessao }) });
    if (!r.ok) throw new Error(await textoErro(r));
    return r.json();
  },
};
