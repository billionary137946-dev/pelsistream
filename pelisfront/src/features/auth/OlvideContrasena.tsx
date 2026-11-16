// "¿Olvidaste tu contraseña?": deja una solicitud al admin (no cambia nada por sí sola).
// El mensaje de respuesta es el mismo exista o no el celular (no revela quién tiene cuenta).
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ErrorApi } from "@/shared/lib/api";
import { FondoAuth } from "@/shared/ui/FondoAuth";
import { LogoPeli } from "@/shared/ui/LogoPeli";
import { limpiarCelular } from "@/shared/lib/inputs";

const CLASE_CAMPO =
  "w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-[clamp(11px,3vw,14px)] font-bold outline-none transition-colors placeholder:text-white/25 placeholder:font-normal focus:border-gold focus:bg-gold/5 focus:ring-4 focus:ring-gold/10";

export function OlvideContrasena() {
  const [celular, setCelular] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await api.post<{ mensaje: string }>("/auth/olvide", { celular });
      setListo(r.mensaje);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : "No se pudo enviar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-5 relative overflow-x-hidden isolate">
      <FondoAuth />
      <div className="w-full max-w-sm animate-tarjeta">
        <div className="text-center mb-6 flex flex-col items-center">
          <LogoPeli tamano="lg" />
          <h1 className="font-display text-gold text-[clamp(1.4rem,5vw,1.8rem)] tracking-[3px] leading-none mt-2">
            ¿Olvidaste tu contraseña?
          </h1>
        </div>

        <div className="bg-card/90 backdrop-blur-md border border-border rounded-[clamp(18px,5vw,28px)] p-[clamp(1.4rem,5vw,2.5rem)] sombra-tarjeta flex flex-col gap-4">
          {listo ? (
            <>
              <p className="text-4xl text-center">📩</p>
              <p className="text-sm text-white/80 text-center">{listo}</p>
              <p className="text-xs text-white/40 text-center">
                Cuando la tengas, entra con ella y la app te pedirá poner una nueva tuya.
              </p>
            </>
          ) : (
            <form onSubmit={enviar} className="flex flex-col gap-4">
              <p className="text-sm text-white/60">
                Escribe tu celular. El administrador verá tu solicitud y te dará una contraseña temporal (por ejemplo,
                por WhatsApp).
              </p>
              <label className="block">
                <span className="block text-xs text-white/50 mb-1.5 font-bold">Celular</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  autoFocus
                  autoComplete="username"
                  pattern="\d{10}"
                  title="10 dígitos"
                  value={celular}
                  onChange={(e) => setCelular(limpiarCelular(e.target.value))}
                  placeholder="10 dígitos"
                  className={CLASE_CAMPO}
                />
              </label>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={cargando || celular.length !== 10}
                className="w-full flex items-center justify-center gap-2 py-[clamp(.8rem,2.5vw,1.1rem)] bg-gradient-to-br from-gold to-gold-2 text-navy rounded-[clamp(12px,3vw,16px)] font-black tracking-wide sombra-dorada transition-all active:scale-[.98] disabled:opacity-60"
              >
                {cargando ? <span className="spinner" /> : "Pedir contraseña temporal"}
              </button>
            </form>
          )}
          <Link href="/login" className="text-center text-sm text-white/50 hover:text-gold py-2 transition-colors">
            ← Volver a entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
