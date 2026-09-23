// Hash de contraseñas y firma de tokens de sesión (JWT). Puerto directo de
// pelisback/app/core/seguridad.py -- misma lógica, en TypeScript.
import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRETO = new TextEncoder().encode(process.env.JWT_SECRETO!);
const JWT_HORAS_EXPIRACION = Number(process.env.JWT_HORAS_EXPIRACION ?? "12");

export async function hashearContrasena(contrasena: string): Promise<string> {
  return bcrypt.hash(contrasena, 10);
}

export async function verificarContrasena(contrasena: string, hash: string): Promise<boolean> {
  return bcrypt.compare(contrasena, hash);
}

export interface PayloadToken {
  sub: string; // celular
  rol: string;
}

// El token de sesión solo identifica QUIÉN es (celular) y con qué rol
// inició sesión. El rol y el estatus se revalidan contra la base de datos
// en cada request protegido (ver obtenerSesionActual en lib/server/auth.ts)
// -- el token nunca es la única fuente de verdad.
export async function crearToken(celular: string, rol: string): Promise<string> {
  return new SignJWT({ rol })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(celular)
    .setExpirationTime(`${JWT_HORAS_EXPIRACION}h`)
    .sign(JWT_SECRETO);
}

export async function leerToken(token: string): Promise<PayloadToken | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRETO);
    if (typeof payload.sub !== "string" || typeof payload.rol !== "string") return null;
    return { sub: payload.sub, rol: payload.rol };
  } catch {
    return null;
  }
}
