// Números de "Palenque #N" ya usados dentro del negocio del operador, para
// avisar si se repite -- sin importar si esa jugada ya cerró o sigue
// abierta, ni qué operador la haya registrado.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "operador");
    const nombrePalenque = (request.nextUrl.searchParams.get("nombre_palenque") ?? "").trim();
    if (!nombrePalenque) return NextResponse.json({ numeros: [] });

    const filas = await sql`
      select distinct j.evento from jugadas j
      join usuarios u on u.celular = j.cliente_celular
      where u.negocio_id = ${usuario.negocio_id}
    `;
    const patron = new RegExp(
      `^${nombrePalenque.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} #(\\d+)$`,
      "i",
    );
    const numeros = new Set<string>();
    for (const fila of filas) {
      const m = patron.exec(fila.evento);
      if (m) numeros.add(m[1]);
    }
    return NextResponse.json({ numeros: Array.from(numeros).sort() });
  });
}
