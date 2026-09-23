import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "cliente");
    const filas = await sql`
      select id, tipo, evento, cliente_celular, color, monto::float8,
        corretaje::float8, resultado, neto::float8, operador_celular, fecha::text
      from jugadas where cliente_celular = ${usuario.celular} order by fecha desc
    `;
    return NextResponse.json({ jugadas: filas });
  });
}
