// Puerto de pelisback/app/api/rutas/negocios.py (editar_negocio). Bug de v2
// ya corregido: reactivar un negocio (estaba inactivo, ahora activo:true)
// respeta el mismo límite de 5 activos que crear_negocio.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { ErrorHttp, exigirRol, manejarRuta } from "@/lib/server/auth";

const LIMITE_NEGOCIOS_ACTIVOS = 5;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ nombre: string }> }) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const { nombre } = await params;
    const datos = await request.json();
    const activo = Boolean(datos.activo);
    const maxOperadores = Number(datos.max_operadores);
    const corretajePct = Number(datos.corretaje_pct);

    if (!(corretajePct >= 0 && corretajePct <= 100)) {
      return NextResponse.json(
        { detail: "El corretaje debe ser un porcentaje entre 0 y 100." },
        { status: 400 },
      );
    }

    const fila = await sql.begin(async (tx) => {
      const [actual] = await tx`
        select activo from negocios where nombre = ${nombre} for update
      `;
      if (!actual) {
        throw new ErrorHttp(404, "Negocio no encontrado.");
      }

      if (activo && !actual.activo) {
        const [{ count: activos }] = await tx<{ count: number }[]>`
          select count(*)::int from negocios where activo = true and nombre != ${nombre}
        `;
        if (activos >= LIMITE_NEGOCIOS_ACTIVOS) {
          throw new ErrorHttp(
            409,
            `Límite alcanzado: máximo ${LIMITE_NEGOCIOS_ACTIVOS} negocios activos.`,
          );
        }
      }

      const [actualizado] = await tx`
        update negocios set activo = ${activo}, max_operadores = ${maxOperadores},
          corretaje_pct = ${corretajePct}
        where nombre = ${nombre}
        returning nombre, activo, max_operadores, corretaje_pct::float8, fecha_creacion::text, creado_por
      `;
      return actualizado;
    });

    return NextResponse.json(fila);
  });
}
