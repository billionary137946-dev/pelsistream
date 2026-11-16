// Pantalla de inicio de sesión: celular + contraseña. Mismo lenguaje visual
// que el v2 original (login.html): tarjeta navy/gold centrada sobre fondo
// con orbes, tipografía Bebas Neue en el título. Botón de un solo pulgar
// (grande, ancho completo) — ver funcionamiento.txt, sección 9-c.
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ErrorApi } from "@/shared/lib/api";
import { guardarSesion, leerSesion, rutaDeInicio, type DatosSesion } from "@/shared/lib/sesion";
import { FondoAuth } from "@/shared/ui/FondoAuth";
import { InstalarApp } from "@/shared/ui/InstalarApp";
import { LogoPeli } from "@/shared/ui/LogoPeli";
import { LIMITES, limpiarCelular, soloDigitos } from "@/shared/lib/inputs";

export function LoginForm() {
  const router = useRouter();
  const [celular, setCelular] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [conexionLenta, setConexionLenta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // App instalada: abre en /login. Si ya hay sesión guardada, va directo a su panel
  // (el panel la revalida contra el servidor con useSesion; si ya no sirve, regresa aquí).
  useEffect(() => {
    const guardada = leerSesion();
    if (guardada?.token) router.replace(rutaDeInicio(guardada.rol));
  }, [router]);

  async function iniciarSesion(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    // Igual que _avisarSiTarda() en v2: si el servidor no responde rápido,
    // se avisa sin cancelar la petición (ver funcionamiento.txt, sección 6).
    const avisoLento = setTimeout(() => setConexionLenta(true), 9000);

    try {
      const datos = await api.post<DatosSesion>("/auth/iniciar-sesion", {
        celular,
        contrasena,
      });
      guardarSesion(datos);
      router.push(rutaDeInicio(datos.rol));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo iniciar sesión.");
    } finally {
      clearTimeout(avisoLento);
      setConexionLenta(false);
      setCargando(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-5 relative overflow-x-hidden isolate">
      <FondoAuth />
      {/* Antes de entrar: en celular primero se instala la app (igual que HGC; ver shared/ui/InstalarApp.tsx). */}
      <InstalarApp nombre="PeliStreams" forma="pantalla" />

      <div className="w-full max-w-sm animate-tarjeta">
        <div className="text-center mb-8 flex flex-col items-center">
          <LogoPeli tamano="lg" />
          <h1 className="font-display text-gold text-[clamp(1.5rem,5vw,2rem)] tracking-[3px] leading-none mt-2">
            PeliStreams
          </h1>
        </div>

        <form
          onSubmit={iniciarSesion}
          className="bg-card/90 backdrop-blur-md border border-border rounded-[clamp(18px,5vw,28px)] p-[clamp(1.4rem,5vw,2.5rem)] sombra-tarjeta flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-bold">Celular</label>
            <input
              type="tel"
              inputMode="numeric"
              required
              autoFocus
              autoComplete="username"
              value={celular}
              onChange={(e) => setCelular(limpiarCelular(e.target.value))}
              onKeyDown={soloDigitos}
              placeholder="10 dígitos"
              className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-[clamp(11px,3vw,14px)] font-bold outline-none transition-colors placeholder:text-white/25 placeholder:font-normal focus:border-gold focus:bg-gold/5 focus:ring-4 focus:ring-gold/10"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-bold">Contraseña</label>
            <div className="relative">
              <input
                type={mostrarContrasena ? "text" : "password"}
                required
                autoComplete="current-password"
                maxLength={LIMITES.contrasenaMax}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full py-3 pr-12 pl-4 bg-white/[.06] border-2 border-border/80 rounded-[clamp(11px,3vw,14px)] font-bold outline-none transition-colors placeholder:text-white/25 placeholder:font-normal focus:border-gold focus:bg-gold/5 focus:ring-4 focus:ring-gold/10"
              />
              <button
                type="button"
                onClick={() => setMostrarContrasena((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center size-10 rounded-full text-lg text-white/30 hover:text-gold transition-colors leading-none"
                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                👁️
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {conexionLenta && (
            <p className="text-sm text-amber-300">Tu conexión está lenta, espera un momento…</p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 mt-2 py-[clamp(.8rem,2.5vw,1.1rem)] bg-gradient-to-br from-gold to-gold-2 text-navy rounded-[clamp(12px,3vw,16px)] font-black text-[clamp(.95rem,3vw,1.15rem)] tracking-wide sombra-dorada transition-all hover:-translate-y-0.5 active:scale-[.98] disabled:opacity-60"
          >
            {cargando ? <span className="spinner" /> : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
