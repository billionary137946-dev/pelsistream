// Validación de TODO lo que llega del navegador. Un solo lugar: cada campo acepta solo su tipo de dato.
// La pantalla también filtra (shared/lib/inputs.ts), pero eso es comodidad: la seguridad real es esto,
// porque cualquiera puede mandar una petición sin pasar por la pantalla.
// Si algo no cumple, se lanza ErrorHttp(400) con un mensaje claro (manejarRuta lo convierte en respuesta).
import "server-only";
import { LIMITES } from "@/shared/lib/limites";
import { ErrorHttp } from "./auth";

export { LIMITES };

// Caracteres invisibles o de control (incluye saltos de línea y los que invierten el texto).
const CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Texto limpio: sin caracteres de control, espacios repetidos colapsados, con largo mínimo y máximo. */
export function texto(valor: unknown, campo: string, { min = 1, max }: { min?: number; max: number }): string {
  if (valor !== undefined && valor !== null && typeof valor !== "string" && typeof valor !== "number") {
    throw new ErrorHttp(400, `${campo}: dato inválido.`);
  }
  const limpio = String(valor ?? "").replace(CONTROL, "").replace(/\s+/g, " ").trim();
  if (limpio.length < min) throw new ErrorHttp(400, min <= 1 ? `${campo} es obligatorio.` : `${campo}: mínimo ${min} caracteres.`);
  if (limpio.length > max) throw new ErrorHttp(400, `${campo}: máximo ${max} caracteres.`);
  return limpio;
}

/** Texto opcional: vacío → null. */
export function textoOpcional(valor: unknown, campo: string, max: number): string | null {
  const limpio = texto(valor, campo, { min: 0, max });
  return limpio === "" ? null : limpio;
}

/** Celular de México: exactamente 10 dígitos (se quitan espacios y guiones). */
export function celular(valor: unknown): string {
  const digitos = String(valor ?? "").replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(digitos)) throw new ErrorHttp(400, "El celular debe tener exactamente 10 dígitos.");
  return digitos;
}

/** Contraseña nueva: 8 a 72 caracteres. (Para iniciar sesión NO se usa: ahí cualquier texto se compara.) */
export function contrasenaNueva(valor: unknown): string {
  if (typeof valor !== "string") throw new ErrorHttp(400, "La contraseña es obligatoria.");
  if (valor.length < LIMITES.contrasenaMin) throw new ErrorHttp(400, `La contraseña debe tener al menos ${LIMITES.contrasenaMin} caracteres.`);
  if (new TextEncoder().encode(valor).length > LIMITES.contrasenaMax) throw new ErrorHttp(400, "La contraseña es demasiado larga.");
  return valor;
}

/** Número que sí es número (no texto, no NaN, no infinito), dentro del rango. */
function numero(valor: unknown, campo: string, min: number, max: number): number {
  const n = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() !== "" ? Number(valor) : Number.NaN;
  if (!Number.isFinite(n)) throw new ErrorHttp(400, `${campo} debe ser un número.`);
  if (n < min || n > max) throw new ErrorHttp(400, `${campo} debe estar entre ${min.toLocaleString("es-MX")} y ${max.toLocaleString("es-MX")}.`);
  return n;
}

/** Entero (sin decimales) dentro del rango. */
export function entero(valor: unknown, campo: string, min: number, max: number): number {
  const n = numero(valor, campo, min, max);
  if (!Number.isInteger(n)) throw new ErrorHttp(400, `${campo} debe ser un número entero.`);
  return n;
}

/** Porcentaje 0–100 con hasta 2 decimales. */
export function porcentaje(valor: unknown, campo: string): number {
  const n = numero(valor, campo, 0, 100);
  return Math.round(n * 100) / 100;
}

/** Dinero en pesos con hasta 2 decimales. */
export function dinero(valor: unknown, campo: string, min: number, max: number): number {
  const n = numero(valor, campo, min, max);
  return Math.round(n * 100) / 100;
}

/** Monto de apuesta / quiniela: pesos enteros entre $500 y $1,000,000 (igual que la pantalla y que v2). */
export function montoApuesta(valor: unknown, campo = "El monto"): number {
  return entero(valor, campo, LIMITES.apuestaMin, LIMITES.apuestaMax);
}

/** intento_id (idempotencia): opcional, texto corto sin espacios (UUID del navegador). */
export function intentoId(valor: unknown): string | undefined {
  if (valor === undefined || valor === null || valor === "") return undefined;
  if (typeof valor !== "string" || !/^[\w.-]{8,100}$/.test(valor)) throw new ErrorHttp(400, "intento_id inválido.");
  return valor;
}

/** Uno de una lista fija (color, resultado, tipo…). */
export function unoDe<T extends string>(valor: unknown, opciones: readonly T[], campo: string): T {
  const v = String(valor ?? "").toLowerCase();
  const encontrado = opciones.find((o) => o.toLowerCase() === v);
  if (!encontrado) throw new ErrorHttp(400, `${campo} inválido.`);
  return encontrado;
}
