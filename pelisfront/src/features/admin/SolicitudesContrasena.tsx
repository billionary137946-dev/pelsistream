// Tarjeta del admin: quién pidió "olvidé mi contraseña". Dar temporal → se ve UNA vez,
// con botón para copiarla o mandarla por WhatsApp. Al entrar con ella, la app obliga a cambiarla.
"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ErrorApi } from "@/shared/lib/api";
import { fechaHora } from "@/shared/lib/formato";
import { Modal, EncabezadoModal } from "@/shared/ui/Modal";

interface Solicitud {
  celular: string;
  alias: string;
  rol: string;
  negocio_id: string | null;
  pais: string;
  solicitud_contrasena: string;
}
interface Temporal {
  celular: string;
  alias: string;
  pais: string; // 52 = México · 1 = EE. UU./Canadá
  contrasena_temporal: string;
}

export function SolicitudesContrasena({ onError }: Readonly<{ onError: (texto: string) => void }>) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [temporal, setTemporal] = useState<Temporal | null>(null);
  const [copiada, setCopiada] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setSolicitudes(await api.get<Solicitud[]>("/admin/solicitudes-contrasena"));
    } catch {
      // Silencioso: si falla, la tarjeta simplemente no aparece (el resto del panel sigue).
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde el servidor
    cargar();
  }, [cargar]);

  async function darTemporal(s: Solicitud) {
    if (!confirm(`¿Dar contraseña temporal a ${s.alias} (${s.celular})? Su contraseña actual dejará de servir.`)) return;
    setOcupado(s.celular);
    try {
      setTemporal(await api.post<Temporal>("/admin/solicitudes-contrasena", { celular: s.celular }));
      setCopiada(false);
      await cargar();
    } catch (e) {
      onError(e instanceof ErrorApi ? e.message : "No se pudo generar la contraseña.");
    } finally {
      setOcupado(null);
    }
  }

  async function descartar(s: Solicitud) {
    setOcupado(s.celular);
    try {
      await api.borrar("/admin/solicitudes-contrasena", { celular: s.celular });
      await cargar();
    } catch (e) {
      onError(e instanceof ErrorApi ? e.message : "No se pudo descartar.");
    } finally {
      setOcupado(null);
    }
  }

  const textoWhatsApp = temporal
    ? `Hola ${temporal.alias}, tu contraseña temporal de PeliStreams es: ${temporal.contrasena_temporal}\nAl entrar te pedirá poner una nueva.`
    : "";

  return (
    <>
      {solicitudes.length > 0 && (
        <section className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4">
          <h2 className="font-bold text-sm text-amber-200 mb-3">
            🔑 Piden nueva contraseña ({solicitudes.length})
          </h2>
          <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto sin-scrollbar">
            {solicitudes.map((s) => (
              <li key={s.celular} className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{s.alias}</p>
                  <p className="text-white/40 text-xs">
                    +{s.pais} {s.celular} · {s.rol}
                    {s.negocio_id ? ` · ${s.negocio_id}` : ""} · {fechaHora(s.solicitud_contrasena)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => descartar(s)}
                    disabled={ocupado === s.celular}
                    className="text-xs font-bold text-white/50 border border-border rounded-lg px-3 py-2 hover:text-white disabled:opacity-50"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => darTemporal(s)}
                    disabled={ocupado === s.celular}
                    className="text-xs font-extrabold bg-gold text-navy rounded-lg px-3 py-2 active:scale-95 disabled:opacity-50"
                  >
                    Dar temporal
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {temporal && (
        <Modal>
          <EncabezadoModal titulo="Contraseña temporal" onCerrar={() => setTemporal(null)} />
          <p className="text-sm text-white/70 mb-3">
            Para <b>{temporal.alias}</b> ({temporal.celular}). Solo se muestra ahora: mándasela y cierra.
          </p>
          <p className="font-mono text-2xl text-center text-gold tracking-wider bg-white/5 border border-border rounded-xl py-3 mb-4 select-all break-all">
            {temporal.contrasena_temporal}
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={`https://wa.me/${temporal.pais}${temporal.celular}?text=${encodeURIComponent(textoWhatsApp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center bg-green-600 text-white font-extrabold rounded-xl py-3 active:scale-[.98]"
            >
              Mandar por WhatsApp
            </a>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(temporal.contrasena_temporal);
                  setCopiada(true);
                } catch {
                  onError("No se pudo copiar; selecciónala y cópiala a mano.");
                }
              }}
              className="border border-border rounded-xl py-3 font-bold text-sm hover:border-gold"
            >
              {copiada ? "✓ Copiada" : "Copiar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
