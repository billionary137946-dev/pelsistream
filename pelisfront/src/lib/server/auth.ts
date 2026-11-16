// Puerto directo de pelisback/app/api/rutas/auth.py -- decodifica el token
// del header Authorization y vuelve a leer al usuario en la base de datos
// en CADA request protegido (si fue desactivado o borrado después de
// emitido el token, deja de pasar aunque el token en sí siga siendo
// válido). Equivale a validarSesion() en codigo.gs.
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { leerToken } from "@/lib/server/seguridad";

export interface FilaUsuario {
  celular: string;
  contrasena_hash: string;
  rol: string;
  alias: string;
  saldo: string;
  limite_credito: string;
  negocio_id: string | null;
  estatus: string;
}

export async function filaUsuario(celular: string): Promise<FilaUsuario | null> {
  const filas = await sql<FilaUsuario[]>`
    select celular, contrasena_hash, rol, alias, saldo, limite_credito, negocio_id, estatus
    from usuarios where celular = ${celular}
  `;
  return filas[0] ?? null;
}

export class ErrorHttp extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function obtenerSesionActual(request: NextRequest): Promise<FilaUsuario> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new ErrorHttp(401, "Sesión inválida.");
  }
  const payload = await leerToken(authorization.slice("Bearer ".length).trim());
  if (!payload) {
    throw new ErrorHttp(401, "Sesión inválida o expirada.");
  }
  const usuario = await filaUsuario(payload.sub);
  if (!usuario || usuario.estatus === "inactivo") {
    throw new ErrorHttp(401, "Usuario inactivo o no encontrado.");
  }
  return usuario;
}

export async function exigirRol(request: NextRequest, ...rolesPermitidos: string[]): Promise<FilaUsuario> {
  const usuario = await obtenerSesionActual(request);
  if (!rolesPermitidos.includes(usuario.rol)) {
    throw new ErrorHttp(403, "No tienes permiso para hacer esto.");
  }
  return usuario;
}

// Envuelve el handler de una ruta: si algo lanza ErrorHttp, responde con el
// status/mensaje correcto en vez de un 500 genérico; cualquier otro error
// sí se deja como 500 (bug real, no un rechazo de negocio esperado).
export function manejarRuta(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  return fn().catch((e) => {
    if (e instanceof ErrorHttp) {
      return NextResponse.json({ detail: e.message }, { status: e.status });
    }
    // Cuerpo que no es JSON (petición hecha a mano o rota): es error de quien la manda, no del servidor.
    if (e instanceof SyntaxError) {
      return NextResponse.json({ detail: "Datos inválidos." }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ detail: "Error interno del servidor." }, { status: 500 });
  });
}
