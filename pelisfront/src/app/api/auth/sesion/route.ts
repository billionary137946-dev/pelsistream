// Puerto de pelisback/app/api/rutas/auth.py (obtener_sesion). Revalida la
// sesión contra la base de datos en cada carga de un panel protegido --
// IMPORTANTE: nunca incluye "token" en la respuesta (bug ya corregido en la
// versión Python: esta ruta mandaba token:"" y el frontend lo usaba para
// pisar el token real guardado en localStorage).
import { NextRequest, NextResponse } from "next/server";
import { manejarRuta, obtenerSesionActual } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await obtenerSesionActual(request);
    return NextResponse.json({
      celular: usuario.celular,
      rol: usuario.rol,
      alias: usuario.alias,
      negocio_id: usuario.negocio_id,
      saldo: Number(usuario.saldo),
      limite_credito: Number(usuario.limite_credito),
    });
  });
}
