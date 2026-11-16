// "¿Olvidaste tu contraseña?" (pública). Solo deja la solicitud para que el admin la vea;
// la contraseña NO cambia aquí. Responde SIEMPRE lo mismo, exista o no el celular,
// para que nadie pueda averiguar qué números tienen cuenta.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { manejarRuta } from "@/lib/server/auth";
import * as V from "@/lib/server/validar";
import { limpiarCelular } from "@/shared/lib/inputs";

const MENSAJE_OLVIDE = "Listo. Si el número tiene cuenta, el administrador recibirá tu solicitud y te dará una contraseña temporal.";

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    const datos = await request.json();
    const celular = V.celular(limpiarCelular(String(datos.celular ?? ""))); // formato inválido sí se avisa (no revela nada)

    // Cuentas inactivas no generan solicitud. Si ya pidió hace menos de 10 min, no se vuelve a marcar.
    await sql`
      update usuarios set solicitud_contrasena = now()
      where celular = ${celular} and estatus <> 'inactivo'
        and (solicitud_contrasena is null or solicitud_contrasena < now() - interval '10 minutes')
    `;
    return NextResponse.json({ mensaje: MENSAJE_OLVIDE });
  });
}
