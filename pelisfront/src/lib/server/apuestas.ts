// Helpers compartidos por las rutas de apuestas/quinielas. Puerto de las
// funciones homónimas en pelisback/app/api/rutas/apuestas.py.
import "server-only";
import type { TransactionSql } from "postgres";
import { sql } from "@/lib/server/db";

type Conexion = typeof sql | TransactionSql;

export async function negocioDe(conexion: Conexion, celular: string): Promise<string | null> {
  const [fila] = await conexion`select negocio_id from usuarios where celular = ${celular}`;
  return fila?.negocio_id ?? null;
}

export async function corretajePctDe(conexion: Conexion, negocioId: string): Promise<number> {
  const [fila] = await conexion`select corretaje_pct from negocios where nombre = ${negocioId}`;
  return fila ? Number(fila.corretaje_pct) : 0;
}
