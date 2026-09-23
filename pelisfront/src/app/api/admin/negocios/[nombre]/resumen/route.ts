// Ganancias/actividad de UN negocio: operadores/clientes/jugadas/volumen/
// corretaje. El negocio no se guarda en "jugadas" directamente, se infiere
// por el negocio_id del cliente dueño de cada jugada (igual que el resto
// del backend).
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ nombre: string }> }) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const { nombre } = await params;

    const conteoUsuarios = await sql`
      select rol, count(*)::int as total from usuarios
      where negocio_id = ${nombre} and rol in ('operador', 'cliente')
      group by rol
    `;
    const operadores = conteoUsuarios.find((f) => f.rol === "operador")?.total ?? 0;
    const clientes = conteoUsuarios.find((f) => f.rol === "cliente")?.total ?? 0;

    const [fila] = await sql`
      select count(*)::int as jugadas, coalesce(sum(j.monto), 0)::float as volumen,
        coalesce(sum(j.corretaje), 0)::float as corretaje
      from jugadas j join usuarios u on u.celular = j.cliente_celular
      where u.negocio_id = ${nombre}
    `;

    return NextResponse.json({
      operadores,
      clientes,
      jugadas: fila.jugadas,
      volumen: Number(fila.volumen),
      corretaje: Number(fila.corretaje),
    });
  });
}
