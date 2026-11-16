// Solicitudes de "olvidé mi contraseña" (solo admin).
// GET    → lista de quién pidió (cliente, operador o admin).
// POST   { celular } → genera una contraseña temporal, la devuelve UNA sola vez y obliga a cambiarla al entrar.
// DELETE { celular } → descarta la solicitud (ej. alguien que no conoces).
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { ErrorHttp, exigirRol, manejarRuta } from "@/lib/server/auth";
import { contrasenaTemporal, hashearContrasena } from "@/lib/server/seguridad";
import * as V from "@/lib/server/validar";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const filas = await sql`
      select celular, alias, rol, negocio_id, pais, solicitud_contrasena::text
      from usuarios where solicitud_contrasena is not null
      order by solicitud_contrasena desc
      limit 100
    `;
    return NextResponse.json(filas);
  });
}

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    const admin = await exigirRol(request, "admin");
    const celular = V.celular((await request.json()).celular);
    if (celular === admin.celular) {
      throw new ErrorHttp(400, "Tu propia contraseña la cambias desde “Cambiar mi contraseña”.");
    }

    const temporal = contrasenaTemporal();
    const filas = await sql`
      update usuarios set
        contrasena_hash = ${await hashearContrasena(temporal)},
        debe_cambiar_contrasena = true,
        solicitud_contrasena = null
      where celular = ${celular}
      returning alias, pais
    `;
    if (filas.length === 0) throw new ErrorHttp(404, "No existe un usuario con ese celular.");
    // Solo esta respuesta la conoce: en la base queda únicamente el hash.
    return NextResponse.json({ celular, alias: filas[0].alias, pais: filas[0].pais, contrasena_temporal: temporal });
  });
}

export async function DELETE(request: NextRequest) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const celular = V.celular((await request.json()).celular);
    await sql`update usuarios set solicitud_contrasena = null where celular = ${celular}`;
    return NextResponse.json({ ok: true });
  });
}
