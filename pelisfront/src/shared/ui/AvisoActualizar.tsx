"use client";

// "Hay una versión nueva · Actualizar" (copiado de HGC). Al abrir, cada 5 minutos y cada vez que la app vuelve a la
// pantalla, pregunta a /api/version qué versión está publicada. Si es distinta a la que se cargó, aparece
// la barra; al tocar se recarga con lo nuevo. En local (versión "dev") no hace nada.
// Importa en la app instalada: sin esto, el celular se queda con la versión vieja hasta cerrarla por completo.
import { useEffect, useState } from "react";

const CARGADA = process.env.NEXT_PUBLIC_VERSION ?? "dev";
const CADA = 5 * 60_000;

export function AvisoActualizar() {
  const [hayNueva, setHayNueva] = useState(false);

  useEffect(() => {
    if (CARGADA === "dev") return;
    let vivo = true;
    const revisar = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { version } = (await r.json()) as { version?: string };
        if (vivo && typeof version === "string" && version !== "dev" && version !== CARGADA) setHayNueva(true);
      } catch {
        // sin internet: se vuelve a intentar en la siguiente vuelta
      }
    };
    const alVolver = () => document.visibilityState === "visible" && void revisar();
    // También al abrir la app (unos segundos después, para no competir con la carga del panel).
    const inicial = setTimeout(revisar, 3000);
    const t = setInterval(revisar, CADA);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vivo = false;
      clearTimeout(inicial);
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  if (!hayNueva) return null;

  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] animate-aparecer">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-card border border-gold/40 p-2.5 pl-4 text-white sombra-tarjeta">
        <span aria-hidden="true" className="shrink-0">⚡</span>
        <p className="min-w-0 flex-1 text-sm font-bold leading-tight">Hay una versión nueva de PeliStreams</p>
        <button
          type="button"
          onClick={() => globalThis.location.reload()}
          className="rounded-xl bg-gradient-to-br from-gold to-gold-2 px-4 py-2 text-sm font-black text-navy"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
