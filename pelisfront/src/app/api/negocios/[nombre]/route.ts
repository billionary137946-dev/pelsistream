// Puerto de pelisback/app/api/rutas/negocios.py (editar_negocio). Bug de v2
// ya corregido: reactivar un negocio (estaba inactivo, ahora activo:true)
// respeta el mismo límite de 5 activos que crear_negocio.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { ErrorHttp, exigirRol, manejarRuta } from "@/lib/server/auth";
import * as V from "@/lib/server/validar";

const LIMITE_NEGOCIOS_ACTIVOS = 5;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ nombre: string }> }) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const { nombre } = await params;
    const datos = await request.json();
    if (typeof datos.activo !== "boolean") {
      return NextResponse.json({ detail: "Activo: dato inválido." }, { status: 400 });
    }
    const activo = datos.activo;
    // Tipo de dato siempre; los límites del negocio (máx. 10 operadores, corretaje 10–100 %) solo si el valor
    // CAMBIA, para que un negocio viejo fuera de rango se pueda seguir activando/desactivando sin tocarlo.
    const maxOperadores = V.entero(datos.max_operadores, "Máx. operadores", 1, 1000);
    const corretajePct = V.porcentaje(datos.corretaje_pct, "El corretaje");

    const fila = await sql.begin(async (tx) => {
      const [actual] = await tx`
        select activo, max_operadores, corretaje_pct::float8 from negocios where nombre = ${nombre} for update
      `;
      if (!actual) {
        throw new ErrorHttp(404, "Negocio no encontrado.");
      }
      if (maxOperadores !== Number(actual.max_operadores)) {
        V.entero(maxOperadores, "Máx. operadores", 1, V.LIMITES.maxOperadores);
      }
      if (corretajePct !== Number(actual.corretaje_pct)) {
        V.porcentaje(corretajePct, "El corretaje", V.LIMITES.corretajeMin);
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
