// Telas ainda não migradas: a página antiga do app.py, sem a casca dela (modo embed), dentro da casca nova.
export function Legado({ caminho }: { caminho: string }) {
  const src = "/classico" + caminho + (caminho.includes("?") ? "&" : "?") + "embed=1";
  return <iframe key={src} src={src} title="Tela" style={{ border: 0, width: "100%", height: "100%", display: "block", background: "transparent" }} />;
}
