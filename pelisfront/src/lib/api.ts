// Cliente HTTP hacia las API routes de este mismo proyecto Next.js
// (src/app/api/**/route.ts). Ya no es un backend externo (antes era
// pelisback en FastAPI, un proyecto Python aparte) -- todo vive junto para
// poder desplegar un solo proyecto en Vercel. El login sigue siendo por
// celular+contraseña (JWT propio, no Supabase Auth), solo que ahora el JWT
// se emite/valida desde estas mismas API routes en vez de un servidor
// Python separado.

const URL_API = "/api";

export class ErrorApi extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Mensajes por código de estado cuando el backend no manda un "detail"
// legible (ej. un 404 de una ruta que no existe, o un 500 sin cuerpo) --
// antes esto podía colarse como texto técnico o como "undefined" en
// pantalla. También cubre el 422 de FastAPI, cuyo "detail" en un error de
// validación NO es texto: es una lista de objetos ({loc, msg, type}) -- si
// eso se mostraba tal cual, se veía como código, no como un error humano.
function mensajeHumano(status: number, cuerpo: Record<string, unknown>): string {
  const detalle = cuerpo.detail ?? cuerpo.error;
  if (typeof detalle === "string" && detalle.trim()) return detalle;

  if (status === 401) return "Tu sesión ya no es válida. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permiso para hacer esto.";
  if (status === 404) return "No se encontró lo que buscabas.";
  if (status === 422) return "Revisa los datos del formulario, algo no es válido.";
  if (status >= 500) return "Hubo un problema en el servidor. Intenta de nuevo en un momento.";
  return "Algo salió mal. Intenta de nuevo.";
}

async function unaPeticion(ruta: string, opciones: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  try {
    return await fetch(`${URL_API}${ruta}`, {
      ...opciones,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    // fetch() rechaza con un TypeError genérico ("Failed to fetch") cuando
    // no hay conexión o el backend está caído -- ese texto en inglés no le
    // dice nada a un usuario real.
    throw new ErrorApi("No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }
}

async function peticion<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  let respuesta = await unaPeticion(ruta, opciones);

  // Reintento único ante un 401: un 401 aislado, justo después de que el
  // mismo request de sesión ya había funcionado segundos antes, es más
  // probable que sea un hipo pasajero (conexión, backend reiniciando,
  // pooler de la base de datos) que una sesión de verdad inválida -- así
  // que antes de tirar al usuario a /login y perder lo que estaba
  // escribiendo en un formulario, se intenta la MISMA petición una vez más.
  // Si el segundo intento también da 401, ahí sí se asume que la sesión
  // realmente ya no sirve.
  if (respuesta.status === 401 && ruta !== "/auth/iniciar-sesion") {
    await new Promise((resolver) => setTimeout(resolver, 400));
    respuesta = await unaPeticion(ruta, opciones);
  }

  const cuerpo = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    // Un 401 en CUALQUIER endpoint protegido -- ya después del reintento de
    // arriba -- significa que esta sesión ya no sirve de verdad (token
    // viejo, usuario editado, etc.). Antes cada pantalla tenía que
    // acordarse de manejarlo por su cuenta; ahora se maneja UNA vez, aquí,
    // para toda la app. La excepción es el login mismo: ahí un 401 es
    // "contraseña incorrecta", no "sesión inválida" (nunca manda token
    // porque apenas se está creando la sesión) -- redirigir ahí sería un
    // loop sin sentido.
    if (respuesta.status === 401 && ruta !== "/auth/iniciar-sesion" && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("sesion");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new ErrorApi(mensajeHumano(respuesta.status, cuerpo), respuesta.status);
  }
  return cuerpo as T;
}

export const api = {
  get: <T>(ruta: string) => peticion<T>(ruta, { method: "GET" }),
  post: <T>(ruta: string, datos?: unknown) =>
    peticion<T>(ruta, { method: "POST", body: datos ? JSON.stringify(datos) : undefined }),
  put: <T>(ruta: string, datos?: unknown) =>
    peticion<T>(ruta, { method: "PUT", body: datos ? JSON.stringify(datos) : undefined }),
};
