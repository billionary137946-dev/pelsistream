// Puerto de pelisback/app/api/rutas/negocios.py (listar_negocios,
// crear_negocio). Los 2 bugs de v2 que ya se habían corregido en Python se
// mantienen aquí: corretaje_pct validado 0-100 al crear (antes solo se
// validaba al editar), y límite de 5 negocios activos.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";
import * as V from "@/lib/server/validar";
// creado_por siempre es el admin de la sesión (antes se aceptaba del navegador y se podía falsear).

const LIMITE_NEGOCIOS_ACTIVOS = 5;

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const filas = await sql`
      select nombre, activo, max_operadores, corretaje_pct::float8, fecha_creacion::text, creado_por
      from negocios order by nombre
    `;
    return NextResponse.json(filas);
  });
}

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "admin");
    const datos = await request.json();
    // Cada campo solo acepta su tipo de dato (lib/server/validar.ts).
    const nombre = V.texto(datos.nombre, "El nombre del negocio", { min: 2, max: V.LIMITES.nombreNegocio });
    const maxOperadores = V.entero(datos.max_operadores ?? 3, "Máx. operadores", 1, V.LIMITES.maxOperadores);
    const corretajePct = V.porcentaje(datos.corretaje_pct ?? V.LIMITES.corretajeMin, "El corretaje", V.LIMITES.corretajeMin, V.LIMITES.corretajeMax);

    const yaExiste = await sql`
      select 1 from negocios where lower(nombre) = lower(${nombre})
    `;
    if (yaExiste.length > 0) {
      return NextResponse.json({ detail: "Ya existe un negocio con ese nombre." }, { status: 409 });
    }

    const [{ count: activos }] = await sql<{ count: number }[]>`
      select count(*)::int from negocios where activo = true
    `;
    if (activos >= LIMITE_NEGOCIOS_ACTIVOS) {
      return NextResponse.json(
        { detail: `Límite alcanzado: máximo ${LIMITE_NEGOCIOS_ACTIVOS} negocios activos.` },
        { status: 409 },
      );
    }

    const [fila] = await sql`
      insert into negocios (nombre, activo, max_operadores, corretaje_pct, creado_por)
      values (${nombre}, true, ${maxOperadores}, ${corretajePct}, ${usuario.celular})
      returning nombre, activo, max_operadores, corretaje_pct::float8, fecha_creacion::text, creado_por
    `;
    return NextResponse.json(fila, { status: 201 });
  });
}
