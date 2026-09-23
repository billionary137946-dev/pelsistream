// Bloquea teclas en inputs numéricos. type="number" del navegador ya deja
// pasar "e"/"E" (notación científica) y "+"/"-" aunque el campo sea un
// monto o un celular que nunca debe ser negativo ni tener exponente -- esto
// los bloquea a nivel de tecla, no solo con validación al enviar.
import type { KeyboardEvent } from "react";

const TECLAS_DE_CONTROL = [
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
];

function permitirAtajos(e: KeyboardEvent<HTMLInputElement>) {
  // Ctrl/Cmd + A/C/V/X (seleccionar todo, copiar, pegar, cortar)
  return (e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase());
}

/** Solo dígitos 0-9 — para celular (nunca letras, signos, ni "e"). */
export function soloDigitos(e: KeyboardEvent<HTMLInputElement>) {
  if (TECLAS_DE_CONTROL.includes(e.key) || permitirAtajos(e)) return;
  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
}

/** Dígitos + un solo punto decimal — para montos/porcentajes (bloquea
 * "e"/"E"/"+"/"-", que sí acepta un <input type="number"> normal). */
export function soloNumeroDecimal(e: KeyboardEvent<HTMLInputElement>) {
  if (TECLAS_DE_CONTROL.includes(e.key) || permitirAtajos(e)) return;
  const yaTienePunto = e.currentTarget.value.includes(".");
  if (e.key === "." && !yaTienePunto) return;
  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
}
