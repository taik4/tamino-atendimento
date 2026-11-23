import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, definirToken, type Estado } from "./api";

// Estado global do painel (token, modo remoto, status, ponto). A casca dá o Provider; as telas usam useEstado().
const Ctx = createContext<{ estado: Estado | null; recarregar: () => void }>({ estado: null, recarregar: () => {} });

export function EstadoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const recarregar = useCallback(() => {
    api.estado().then((e) => { definirToken(e.token); setEstado(e); }).catch(() => {});
  }, []);
  useEffect(() => { recarregar(); const t = setInterval(recarregar, 15000); return () => clearInterval(t); }, [recarregar]);
  return <Ctx.Provider value={{ estado, recarregar }}>{children}</Ctx.Provider>;
}

export const useEstado = () => useContext(Ctx);
