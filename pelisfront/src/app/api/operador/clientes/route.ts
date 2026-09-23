// Clientes activos del negocio del operador (buscador para apostar). El
// negocio se deriva del celular del operador (nunca de un parámetro del
// navegador) así un operador no puede pedir clientes de otro negocio.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "operador");
    if (!usuario.negocio_id) {
      return NextResponse.json({ detail: "No se pudo identificar tu negocio." }, { status: 400 });
    }
    const filas = await sql`
      select celular, alias, saldo::float8, limite_credito::float8 from usuarios
      where rol = 'cliente' and estatus = 'activo' and negocio_id = ${usuario.negocio_id}
      order by alias
    `;
    return NextResponse.json(filas);
  });
}
