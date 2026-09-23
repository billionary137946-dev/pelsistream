import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ celular: string }> }) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const { celular } = await params;
    const filas = await sql`
      select id, tipo, evento, cliente_celular, color, monto::float8,
        corretaje::float8, resultado, neto::float8, operador_celular, fecha::text
      from jugadas where cliente_celular = ${celular} order by fecha desc
    `;
    return NextResponse.json({ jugadas: filas });
  });
}
