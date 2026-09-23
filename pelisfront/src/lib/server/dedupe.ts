// Recuerda el resultado de un "intento_id" en la base de datos (no en
// memoria del proceso -- en Vercel cada invocación puede correr en una
// instancia serverless distinta) para que si la respuesta de
// registrarApuesta/cerrarQuiniela se pierde por mala conexión y el
// navegador reintenta con el MISMO intento_id, no se repita el cobro/pago.
// Puerto de pelisback/app/core/dedupe.py, ahora respaldado en Postgres en
// vez de un diccionario en memoria.
import "server-only";
import { sql } from "@/lib/server/db";

export async function resultadoDeIntento(intentoId: string | undefined | null): Promise<unknown | null> {
  if (!intentoId) return null;
  // postgres.js NO parsea columnas jsonb a objeto por default -- regresa el
  // texto crudo como string. Si no se hiciera este JSON.parse() aquí, la
  // ruta reenviaría ese string tal cual a NextResponse.json(), que lo
  // volvería a serializar y el navegador recibiría un JSON con doble
  // escapado (un string, no el objeto {ok, saldo} esperado).
  const filas = await sql<{ resultado: string }[]>`
    select resultado from intentos_procesados where intento_id = ${intentoId}
  `;
  if (!filas[0]) return null;
  return JSON.parse(filas[0].resultado);
}

export async function recordarIntento(intentoId: string | undefined | null, resultado: unknown): Promise<void> {
  if (!intentoId) return;
  await sql`
    insert into intentos_procesados (intento_id, resultado)
    values (${intentoId}, ${JSON.stringify(resultado)}::jsonb)
    on conflict (intento_id) do nothing
  `;
}
