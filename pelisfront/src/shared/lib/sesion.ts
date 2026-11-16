// Guarda/lee la sesión del navegador (token + datos básicos del usuario) y
// resuelve a qué pantalla redirigir según el rol — equivalente a lo que
// hacía _servir()/doGet() en codigo.gs, pero en el cliente.

export type Rol = "admin" | "operador" | "cliente";

export interface DatosSesion {
  token: string;
  celular: string;
  rol: Rol;
  alias: string;
  negocio_id: string;
  saldo: number;
  limite_credito: number;
  /** Entró con la contraseña temporal del admin: primero debe poner una nueva (/cambiar-contrasena). */
  debe_cambiar_contrasena?: boolean;
}

const CLAVE = "token";
const CLAVE_DATOS = "sesion";

export function guardarSesion(datos: DatosSesion) {
  // Segunda capa de protección: nunca pisar un token real con uno vacío
  // (ver el fix en useSesion.ts -- GET /auth/sesion manda token:"" porque
  // esa ruta no lo llena a propósito, y eso ya causó que se borrara el
  // token real de localStorage sin que ninguna escritura volviera a
  // mandar el header Authorization). Si algún día otro llamador comete el
  // mismo error, esto evita que se repita el mismo bug.
  if (!datos.token) {
    const actual = leerSesion();
    if (actual?.token) datos = { ...datos, token: actual.token };
  }
  localStorage.setItem(CLAVE, datos.token);
  localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos));
}

export function leerSesion(): DatosSesion | null {
  if (typeof window === "undefined") return null;
  const crudo = localStorage.getItem(CLAVE_DATOS);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as DatosSesion;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE);
  localStorage.removeItem(CLAVE_DATOS);
}

export function rutaDeInicio(rol: Rol): string {
  if (rol === "admin") return "/admin";
  if (rol === "operador") return "/operador";
  return "/cliente";
}
