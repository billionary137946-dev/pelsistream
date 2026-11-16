// Clientes activos del negocio del operador (buscador para apostar y pestaña Clientes).
// en_juego = suma de sus apuestas en peleas que aún no se cierran. El
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
      select u.celular, u.alias, u.saldo::float8, u.limite_credito::float8,
        coalesce((
          select sum(j.monto) from jugadas j
          where j.cliente_celular = u.celular and j.resultado = ''
        ), 0)::float8 as en_juego
      from usuarios u
      where u.rol = 'cliente' and u.estatus = 'activo' and u.negocio_id = ${usuario.negocio_id}
      order by u.alias
    `;
    return NextResponse.json(filas);
  });
}
