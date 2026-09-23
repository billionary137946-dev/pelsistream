// Puerto de pelisback/app/api/rutas/auth.py (iniciar_sesion). Login por
// celular+contraseña (no por email) -- la única ruta que emite un token.
import { NextRequest, NextResponse } from "next/server";
import { filaUsuario, manejarRuta } from "@/lib/server/auth";
import { crearToken, verificarContrasena } from "@/lib/server/seguridad";

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    const datos = await request.json();
    const celular = String(datos.celular ?? "").trim();
    const contrasena = String(datos.contrasena ?? "");

    const usuario = await filaUsuario(celular);
    if (!usuario || !(await verificarContrasena(contrasena, usuario.contrasena_hash))) {
      return NextResponse.json({ detail: "Celular o contraseña incorrectos." }, { status: 401 });
    }
    if (usuario.estatus === "inactivo") {
      return NextResponse.json(
        { detail: "Usuario inactivo. Contacta al administrador." },
        { status: 403 },
      );
    }
    if (usuario.estatus === "pendiente") {
      return NextResponse.json(
        { detail: "Tu cuenta está pendiente de activación. Contacta al administrador." },
        { status: 403 },
      );
    }

    const token = await crearToken(usuario.celular, usuario.rol);
    return NextResponse.json({
      token,
      celular: usuario.celular,
      rol: usuario.rol,
      alias: usuario.alias,
      negocio_id: usuario.negocio_id,
      saldo: Number(usuario.saldo),
      limite_credito: Number(usuario.limite_credito),
    });
  });
}
