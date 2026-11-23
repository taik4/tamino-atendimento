import { useEffect, useState } from "react";

// Roteador mínimo (history API): o app.py devolve o index.html em todas as rotas do painel.
export function irPara(caminho: string) {
  if (caminho === location.pathname + location.search) return;
  history.pushState(null, "", caminho);
  dispatchEvent(new PopStateEvent("popstate"));
}

export function useRota() {
  const [r, setR] = useState(() => ({ path: location.pathname, search: location.search }));
  useEffect(() => {
    const f = () => setR({ path: location.pathname, search: location.search });
    addEventListener("popstate", f);
    return () => removeEventListener("popstate", f);
  }, []);
  return r;
}
