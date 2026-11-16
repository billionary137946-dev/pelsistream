// Cambiar mi contraseña — igual para admin, operador y cliente.
// Dos modos:
// - Obligatorio: entró con la contraseña temporal del admin (el servidor bloquea todo lo demás con 428).
// - Normal: lo abrió con la 🔑 del encabezado; pide la actual.
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ErrorApi } from "@/shared/lib/api";
import { cerrarSesion, guardarSesion, leerSesion, rutaDeInicio, type DatosSesion } from "@/shared/lib/sesion";
import { FondoAuth } from "@/shared/ui/FondoAuth";
import { LogoPeli } from "@/shared/ui/LogoPeli";
import { LIMITES } from "@/shared/lib/inputs";
import { errorContrasena } from "@/shared/lib/contrasena";
import { CampoContrasenaNueva } from "@/shared/ui/CampoContrasenaNueva";

const CLASE_CAMPO =
  "w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-[clamp(11px,3vw,14px)] font-bold outline-none transition-colors placeholder:text-white/25 placeholder:font-normal focus:border-gold focus:bg-gold/5 focus:ring-4 focus:ring-gold/10";

export function CambiarContrasena() {
  const router = useRouter();
  const [sesion, setSesion] = useState<DatosSesion | null>(null);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const guardada = leerSesion();
    if (!guardada?.token) {
      router.replace("/login");
      return;
    }
    // localStorage solo existe en el navegador: se lee aquí para no romper la hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(guardada);
  }, [router]);

  if (!sesion) return null;
  const obligatorio = !!sesion.debe_cambiar_contrasena;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const falta = errorContrasena(nueva);
    if (falta) return setError(falta);
    if (nueva !== repetir) return setError("Las dos contraseñas nuevas no coinciden.");
    if (nueva === actual) return setError("La nueva debe ser distinta a la actual.");
    setCargando(true);
    try {
      await api.post("/auth/cambiar-contrasena", { actual, nueva });
      guardarSesion({ ...sesion!, debe_cambiar_contrasena: false });
      setListo(true);
      setTimeout(() => router.replace(rutaDeInicio(sesion!.rol)), 1400);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo cambiar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function campoContrasena(
    etiqueta: string,
    valor: string,
    cambiar: (v: string) => void,
    autoComplete: "current-password" | "new-password",
    placeholder: string,
  ) {
    return (
      <label className="block">
        <span className="block text-xs text-white/50 mb-1.5 font-bold">{etiqueta}</span>
        <input
          type={ver ? "text" : "password"}
          required
          autoComplete={autoComplete}
          maxLength={LIMITES.contrasenaMax}
          minLength={autoComplete === "new-password" ? LIMITES.contrasenaMin : undefined}
          value={valor}
          onChange={(e) => cambiar(e.target.value)}
          placeholder={placeholder}
          className={CLASE_CAMPO}
        />
      </label>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-5 relative overflow-x-hidden isolate">
      <FondoAuth />
      <div className="w-full max-w-sm animate-tarjeta">
        <div className="text-center mb-6 flex flex-col items-center">
          <LogoPeli tamano="lg" />
          <h1 className="font-display text-gold text-[clamp(1.4rem,5vw,1.8rem)] tracking-[3px] leading-none mt-2">
            {obligatorio ? "Pon tu nueva contraseña" : "Cambiar mi contraseña"}
          </h1>
          <p className="text-white/40 text-xs mt-2">{sesion.alias}</p>
        </div>

        <div className="bg-card/90 backdrop-blur-md border border-border rounded-[clamp(18px,5vw,28px)] p-[clamp(1.4rem,5vw,2.5rem)] sombra-tarjeta">
          {listo ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-4xl">✅</p>
              <p className="text-sm text-white/80 text-center">Listo, desde ahora entras con tu nueva contraseña.</p>
            </div>
          ) : (
            <form onSubmit={guardar} className="flex flex-col gap-4">
              {obligatorio && (
                <p className="text-sm text-amber-200 bg-amber-400/10 border border-amber-400/30 rounded-xl p-3">
                  Entraste con la contraseña temporal que te dio el administrador. Pon una nueva tuya para continuar;
                  nadie más la conocerá.
                </p>
              )}
              {campoContrasena(
                obligatorio ? "Contraseña temporal" : "Contraseña actual",
                actual,
                setActual,
                "current-password",
                obligatorio ? "La que te dio el admin" : "La que usas hoy",
              )}
              <label className="block">
                <span className="block text-xs text-white/50 mb-1.5 font-bold">Nueva contraseña</span>
                <CampoContrasenaNueva valor={nueva} onCambiar={setNueva} mostrar={ver} className={CLASE_CAMPO} />
              </label>
              {campoContrasena("Repite la nueva", repetir, setRepetir, "new-password", "Igual a la de arriba")}
              <label className="flex items-center gap-2 text-sm text-white/60">
                <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} className="size-4 accent-gold" />
                Mostrar contraseñas
              </label>

              {error && <p className="text-sm text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={cargando}
                className="w-full flex items-center justify-center gap-2 py-[clamp(.8rem,2.5vw,1.1rem)] bg-gradient-to-br from-gold to-gold-2 text-navy rounded-[clamp(12px,3vw,16px)] font-black tracking-wide sombra-dorada transition-all active:scale-[.98] disabled:opacity-60"
              >
                {cargando ? <span className="spinner" /> : "Guardar nueva contraseña"}
              </button>

              {obligatorio ? (
                <button
                  type="button"
                  onClick={() => {
                    cerrarSesion();
                    router.replace("/login");
                  }}
                  className="text-center text-sm text-white/50 hover:text-gold py-2 transition-colors"
                >
                  Salir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.replace(rutaDeInicio(sesion.rol))}
                  className="text-center text-sm text-white/50 hover:text-gold py-2 transition-colors"
                >
                  ← Volver a mi panel
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
