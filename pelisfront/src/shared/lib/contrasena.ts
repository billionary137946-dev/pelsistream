// Regla ÚNICA de contraseña segura (la usan el servidor y todas las pantallas):
// mínimo 8 caracteres, al menos 1 mayúscula y al menos 1 símbolo. Aplica a admin, operador y cliente.
// Solo para contraseñas NUEVAS: al iniciar sesión se compara lo que escriban, sea como sea.
import { LIMITES } from "./limites";

export interface ReglaContrasena {
  id: "largo" | "mayuscula" | "simbolo";
  texto: string;
  cumple: (v: string) => boolean;
}

export const REGLAS_CONTRASENA: ReglaContrasena[] = [
  { id: "largo", texto: `${LIMITES.contrasenaMin}+ caracteres`, cumple: (v) => v.length >= LIMITES.contrasenaMin },
  { id: "mayuscula", texto: "1 mayúscula", cumple: (v) => /\p{Lu}/u.test(v) },
  // Símbolo = cualquier cosa que no sea letra, número ni espacio (! # $ % & * - _ . @ …).
  { id: "simbolo", texto: "1 símbolo (! # $ - _ …)", cumple: (v) => /[^\p{L}\p{N}\s]/u.test(v) },
];

/** null si cumple todo; si no, el mensaje de lo que falta. */
export function errorContrasena(valor: string): string | null {
  const faltan = REGLAS_CONTRASENA.filter((r) => !r.cumple(valor)).map((r) => r.texto);
  return faltan.length ? `La contraseña necesita: ${faltan.join(", ")}.` : null;
}
