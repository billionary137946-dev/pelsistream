// ── Filtros por VALOR (los que de verdad protegen en la pantalla) ──
// Las teclas solas no bastan: en Android (Gboard) el teclado no dice qué tecla se tocó y al PEGAR texto
// no hay teclas. Por eso cada campo limpia su valor en onChange (controlados) o onInput (formularios).
// La seguridad real está en el servidor (lib/server/validar.ts); esto es para que el usuario no pueda
// ni escribir algo que no corresponde.
import type { FormEvent, KeyboardEvent } from "react";
import { LIMITES } from "./limites";
export { LIMITES };

// Caracteres invisibles o de control (saltos de línea, los que invierten el texto, etc.).
const CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Solo dígitos 0-9, hasta `max` dígitos. Para celular, montos enteros, N# de jugada, lugares, puntos. */
export function limpiarDigitos(valor: string, max: number): string {
  return valor.replace(/\D/g, "").slice(0, max);
}

/** Celular de México: solo dígitos; si lo pegan con lada de país (+52 o +521) se la quita. Máx. 10. */
export function limpiarCelular(valor: string): string {
  let d = valor.replace(/\D/g, "");
  if (d.length > LIMITES.celular) d = d.replace(/^521?(?=\d{10}$)/, "");
  return d.slice(0, LIMITES.celular);
}

/** Número con hasta `decimales` decimales (un solo punto). `negativo` permite un "-" al inicio (saldo). */
export function limpiarDecimal(valor: string, { decimales = 2, enteros = 9, negativo = false } = {}): string {
  const signo = negativo && valor.trim().startsWith("-") ? "-" : "";
  const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
  const [ent = "", ...resto] = limpio.split(".");
  const dec = resto.join("").slice(0, decimales);
  const tienePunto = limpio.includes(".") && decimales > 0;
  return signo + ent.slice(0, enteros) + (tienePunto ? "." + dec : "");
}

/** Texto: sin caracteres de control, sin espacios al inicio ni dobles, hasta `max` caracteres. */
export function limpiarTexto(valor: string, max: number): string {
  return valor.replace(CONTROL, "").replace(/^\s+/, "").replace(/\s{2,}/g, " ").slice(0, max);
}

/** Para formularios sin estado (FormData): limpia el campo mientras se escribe o se pega. */
export function filtrarAlEscribir(limpiar: (v: string) => string) {
  return (e: FormEvent<HTMLInputElement>) => {
    const campo = e.currentTarget;
    const limpio = limpiar(campo.value);
    if (limpio !== campo.value) campo.value = limpio;
  };
}

// Bloquea teclas en inputs numéricos. type="number" del navegador ya deja
// pasar "e"/"E" (notación científica) y "+"/"-" aunque el campo sea un
// monto o un celular que nunca debe ser negativo ni tener exponente -- esto
// los bloquea a nivel de tecla, no solo con validación al enviar.

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
