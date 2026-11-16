// Formatos que se repetían en todas las pantallas. Un solo lugar.

/** $12,500 — pesos mexicanos sin decimales forzados. */
export function pesos(n: number): string {
  return `$${n.toLocaleString("es-MX")}`;
}

/** Fecha y hora local de México. */
export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-MX");
}

/** Color del texto según el resultado de una jugada ("" = pendiente). */
export function claseResultado(resultado: string): string {
  if (resultado === "") return "text-amber-300";
  if (resultado === "ganada") return "text-green-300";
  return "text-white/40";
}
