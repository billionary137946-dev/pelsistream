// Cambiar mi contraseña (cualquier rol). Pide la actual — o la temporal que dio el admin —
// y la nueva. Es la ÚNICA ruta que funciona mientras la cuenta tiene una temporal pendiente.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { ErrorHttp, manejarRuta, obtenerSesionActual } from "@/lib/server/auth";
import { hashearContrasena, verificarContrasena } from "@/lib/server/seguridad";
import * as V from "@/lib/server/validar";

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await obtenerSesionActual(request, { permitirTemporal: true });
    const datos = await request.json();
    const actual = typeof datos.actual === "string" ? datos.actual : "";
    const nueva = V.contrasenaNueva(datos.nueva);

    if (!(await verificarContrasena(actual, usuario.contrasena_hash))) {
      throw new ErrorHttp(400, "La contraseña actual no es correcta.");
    }
    if (nueva === actual) throw new ErrorHttp(400, "La nueva contraseña debe ser distinta a la actual.");

    await sql`
      update usuarios set
        contrasena_hash = ${await hashearContrasena(nueva)},
        debe_cambiar_contrasena = false,
        solicitud_contrasena = null
      where celular = ${usuario.celular}
    `;
    return NextResponse.json({ ok: true });
  });
}
