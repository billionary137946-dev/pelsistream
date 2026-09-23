import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "operador");
    const filas = await sql`
      select j.id, j.tipo, j.evento, j.cliente_celular, j.color,
        j.monto::float8, j.corretaje::float8, j.resultado, j.neto::float8,
        j.operador_celular, j.fecha::text
      from jugadas j join usuarios u on u.celular = j.cliente_celular
      where u.negocio_id = ${usuario.negocio_id} order by j.fecha desc
    `;
    return NextResponse.json({ jugadas: filas });
  });
}
