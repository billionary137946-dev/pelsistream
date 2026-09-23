// Guard de sesión para las pantallas protegidas (/admin, /operador,
// /cliente). El token vive en localStorage (no en cookies, porque el login
// es por celular, no por email/Supabase Auth), así que la validación se
// hace en el cliente, no en middleware de servidor: en cada carga de una
// pantalla protegida se vuelve a pedir GET /auth/sesion, que revalida
// contra la base de datos (rol/estatus siguen vigentes) -- equivalente
// exacto a validarSesion() en codigo.gs, nunca confía solo en lo que ya
// había guardado localStorage.
//
// Importante: un 401 (sesión inválida de verdad) ya lo maneja lib/api.ts
// centralizado -- limpia localStorage y hace window.location.href="/login"
// él solo. Aquí NO se repite ese redirect: hacerlo dos veces a la vez (un
// window.location.href real compitiendo con un router.replace() de
// Next.js) es lo que causaba el "Runtime Error" -- Next intentaba una
// navegación de cliente mientras el navegador ya estaba a la mitad de una
// navegación real, y esa carrera es la que tronaba.
//
// Un error de red pasajero (backend reiniciando, wifi cortado un instante,
// o cualquier código que no sea 401) tampoco saca al usuario -- se ignora y
// se sigue trabajando con la sesión que ya estaba guardada.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cerrarSesion, guardarSesion, leerSesion, type DatosSesion, type Rol } from "@/lib/sesion";

export function useSesion(rolRequerido: Rol) {
  const router = useRouter();
  const [sesion, setSesion] = useState<DatosSesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const guardada = leerSesion();
    if (!guardada || guardada.rol !== rolRequerido) {
      router.replace("/login");
      return;
    }

    // Muestra de inmediato lo que ya había en localStorage (optimista) para
    // no dejar la pantalla en blanco mientras se revalida contra el backend.
    setSesion(guardada);
    setCargando(false);

    api
      .get<Omit<DatosSesion, "token">>("/auth/sesion")
      .then((fresca) => {
        if (fresca.rol !== rolRequerido) {
          // Rol distinto no es un 401 (el token sigue siendo válido, solo
          // no sirve para ESTE panel) -- este caso sí hay que manejarlo
          // aquí, lib/api.ts no tiene forma de saberlo.
          cerrarSesion();
          router.replace("/login");
        } else {
          // BUG YA CORREGIDO (causa raíz real del "Sesión inválida" al
          // escribir): GET /auth/sesion responde con DatosSesion completo,
          // y el campo "token" de ese modelo tiene default token:"" porque
          // esa ruta nunca lo llena a propósito -- pero Pydantic lo manda
          // igual en el JSON. Al hacer {...guardada, ...fresca}, el
          // token:"" de fresca (spread AL FINAL) pisaba el token real de
          // guardada. Con "" guardado en localStorage, api.ts nunca volvía
          // a mandar el header Authorization (`token ? ... : {}` con ""
          // es falsy) -- por eso las lecturas de antes de esta revalidación
          // funcionaban, y cualquier escritura después de ella fallaba
          // siempre con 401 "Sesión inválida.", sin importar cuántas veces
          // se reintentara. El token real NUNCA debe venir de "fresca".
          const actualizada = { ...guardada, ...fresca, token: guardada.token };
          guardarSesion(actualizada);
          setSesion(actualizada);
        }
      })
      .catch(() => {
        // Un 401 real ya fue manejado (limpiar sesión + redirigir) dentro
        // de lib/api.ts antes de que este .catch() se ejecute -- aquí no
        // hay que hacer nada más que dejar que esa navegación complete.
        // Cualquier otro código (red caída, backend reiniciando) se ignora
        // y se sigue trabajando con la sesión que ya estaba guardada.
      });
  }, [rolRequerido, router]);

  return { sesion, cargando };
}
