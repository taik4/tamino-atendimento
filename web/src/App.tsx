import { useRota } from "./lib/rota";
import { Shell } from "./components/Shell";
import { FilaPagina } from "./pages/Fila";
import { ConversaPagina } from "./pages/Conversa";
import { Legado } from "./pages/Legado";

// Rotas em React: "/" (fila) e "/c/<id>" (conversa). O resto abre a tela antiga dentro da casca (iframe /classico/...).
export function App() {
  const { path, search } = useRota();
  const conv = path.match(/^\/c\/([0-9a-f-]{36})$/);
  const pagina = path === "/" ? <FilaPagina /> : conv ? <ConversaPagina id={conv[1]} /> : <Legado caminho={path + search} />;
  return <Shell rota={path}>{pagina}</Shell>;
}
