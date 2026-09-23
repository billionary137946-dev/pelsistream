// Puerto de pelisback/app/api/rutas/negocios.py (listar_negocios,
// crear_negocio). Los 2 bugs de v2 que ya se habían corregido en Python se
// mantienen aquí: corretaje_pct validado 0-100 al crear (antes solo se
// validaba al editar), y límite de 5 negocios activos.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

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
    const nombre = String(datos.nombre ?? "").trim();
    const maxOperadores = Number(datos.max_operadores ?? 3);
    const corretajePct = Number(datos.corretaje_pct ?? 10);

    if (!nombre) {
      return NextResponse.json({ detail: "El nombre del negocio es obligatorio." }, { status: 400 });
    }
    if (!(corretajePct >= 0 && corretajePct <= 100)) {
      return NextResponse.json(
        { detail: "El corretaje debe ser un porcentaje entre 0 y 100." },
        { status: 400 },
      );
    }

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
      values (${nombre}, true, ${maxOperadores}, ${corretajePct}, ${datos.creado_por || usuario.celular})
      returning nombre, activo, max_operadores, corretaje_pct::float8, fecha_creacion::text, creado_por
    `;
    return NextResponse.json(fila, { status: 201 });
  });
}
