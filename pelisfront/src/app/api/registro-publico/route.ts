// Puerto de registrarCliente en pelisback/app/api/rutas/registro_publico.py.
// Sin sesión: el negocio ya viene fijo en el link que comparte el admin. La
// cuenta se crea en estatus "pendiente" hasta que el admin la activa.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { manejarRuta } from "@/lib/server/auth";
import { hashearContrasena } from "@/lib/server/seguridad";
import * as V from "@/lib/server/validar";

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    const datos = await request.json();
    if (!datos.negocio_id) {
      return NextResponse.json(
        { detail: "Falta el negocio. Pide al administrador un link válido." },
        { status: 400 },
      );
    }
    // Cada campo solo acepta su tipo de dato (lib/server/validar.ts).
    const negocioId = V.texto(datos.negocio_id, "El negocio", { max: V.LIMITES.nombreNegocio });
    const alias = V.texto(datos.alias, "El alias", { max: V.LIMITES.alias });
    const celular = V.celular(datos.celular);
    const contrasena = V.contrasenaNueva(datos.contrasena);

    const [negocio] = await sql`
      select nombre from negocios where lower(nombre) = lower(${negocioId}) and activo = true
    `;
    if (!negocio) {
      return NextResponse.json(
        { detail: "Este negocio ya no está disponible para registro." },
        { status: 404 },
      );
    }

    const existente = await sql`select 1 from usuarios where celular = ${celular}`;
    if (existente.length > 0) {
      return NextResponse.json({ detail: "Ya existe una cuenta con ese celular." }, { status: 409 });
    }

    await sql`
      insert into usuarios (celular, contrasena_hash, rol, alias, saldo, limite_credito, negocio_id, estatus)
      values (${celular}, ${await hashearContrasena(contrasena)}, 'cliente', ${alias}, 0, 0, ${negocio.nombre}, 'pendiente')
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
