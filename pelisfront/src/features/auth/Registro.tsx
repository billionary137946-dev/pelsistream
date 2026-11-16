// Auto-registro público de clientes (registro.html en v2): llega por un link
// con ?negocio=NOMBRE en la URL, sin sesión. Si el negocio no existe o no
// está activo, se oculta el formulario y se avisa "link inválido".
"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { api, ErrorApi } from "@/shared/lib/api";
import { FondoAuth } from "@/shared/ui/FondoAuth";
import { InstalarApp } from "@/shared/ui/InstalarApp";
import { LogoPeli } from "@/shared/ui/LogoPeli";
import { Campo } from "@/shared/ui/Campo";
import { LIMITES, limpiarCelular, limpiarTexto, soloDigitos } from "@/shared/lib/inputs";

function FormularioRegistro() {
  const negocioId = useSearchParams().get("negocio") ?? "";
  const [nombreNegocio, setNombreNegocio] = useState<string | null>(null);
  // Sin ?negocio= no hay nada que cargar: arranca ya en false.
  const [cargandoNegocio, setCargandoNegocio] = useState(negocioId !== "");

  const [alias, setAlias] = useState("");
  const [celular, setCelular] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!negocioId) return;
    api
      .get<{ ok: boolean; nombre: string | null }>(`/registro-publico/${encodeURIComponent(negocioId)}`)
      .then((r) => setNombreNegocio(r.ok ? r.nombre : null))
      .catch(() => setNombreNegocio(null))
      .finally(() => setCargandoNegocio(false));
  }, [negocioId]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post("/registro-publico", { negocio_id: negocioId, alias, celular, contrasena });
      setExito(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo completar el registro.");
    } finally {
      setEnviando(false);
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
          <p className="text-white/50 text-sm mt-2">Crear cuenta de cliente</p>
        </div>

        <div className="bg-card/90 backdrop-blur-md border border-border rounded-[clamp(18px,5vw,28px)] p-[clamp(1.4rem,5vw,2.5rem)] sombra-tarjeta">
          {cargandoNegocio ? (
            <div className="flex justify-center py-6">
              <span className="spinner-grande" />
            </div>
          ) : !nombreNegocio ? (
            <p className="text-red-300 text-center">
              Link inválido. Pide al administrador un link de registro válido.
            </p>
          ) : exito ? (
            <p className="text-green-300 text-center">
              ¡Listo! Tu cuenta quedó pendiente de activación. Un administrador de{" "}
              <strong>{nombreNegocio}</strong> la activará pronto.
            </p>
          ) : (
            <form onSubmit={enviar} className="flex flex-col gap-4">
              <p className="text-white/60 text-sm text-center -mt-1 mb-1">
                Te registras en <span className="text-gold font-bold">{nombreNegocio}</span>
              </p>

              <Campo etiqueta="Alias" ayuda="Cómo te van a identificar el operador y el administrador.">
                <input
                  required
                  autoComplete="nickname"
                  maxLength={LIMITES.alias}
                  value={alias}
                  onChange={(e) => setAlias(limpiarTexto(e.target.value, LIMITES.alias))}
                  placeholder="Tu nombre o apodo"
                  className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-[clamp(11px,3vw,14px)] font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold focus:bg-gold/5"
                />
              </Campo>
              <Campo etiqueta="Celular" ayuda="Con esto vas a iniciar sesión, como usuario.">
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  autoComplete="tel-national"
                  minLength={LIMITES.celular}
                  pattern="\d{10}"
                  title="10 dígitos, solo números"
                  value={celular}
                  onChange={(e) => setCelular(limpiarCelular(e.target.value))}
                  onKeyDown={soloDigitos}
                  placeholder="10 dígitos"
                  className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-[clamp(11px,3vw,14px)] font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold focus:bg-gold/5"
                />
              </Campo>
              <Campo etiqueta="Contraseña">
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={LIMITES.contrasenaMin}
                  maxLength={LIMITES.contrasenaMax}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder={`Mínimo ${LIMITES.contrasenaMin} caracteres`}
                  className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-[clamp(11px,3vw,14px)] font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold focus:bg-gold/5"
                />
              </Campo>

              {error && <p className="text-sm text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={enviando}
                className="w-full flex items-center justify-center gap-2 mt-2 py-[clamp(.8rem,2.5vw,1.1rem)] bg-gradient-to-br from-gold to-gold-2 text-navy rounded-[clamp(12px,3vw,16px)] font-black tracking-wide sombra-dorada transition-all hover:-translate-y-0.5 active:scale-[.98] disabled:opacity-60"
              >
                {enviando ? <span className="spinner" /> : "Crear cuenta"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function Registro() {
  return (
    <Suspense fallback={null}>
      <FormularioRegistro />
    </Suspense>
  );
}
