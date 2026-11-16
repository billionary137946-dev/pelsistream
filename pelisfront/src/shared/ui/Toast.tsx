// Aviso flotante y notorio para confirmaciones (crear/editar/activar) --
// antes solo había un textito arriba de la pantalla que además se podía
// pisar por otro mensaje de fondo (ver el bug real: el mensaje de "creado"
// se sobreescribía con un error de la recarga que pasaba justo después).
// Se ve siempre, sin importar el scroll, y se quita solo.
"use client";

import { useEffect } from "react";

export interface DatosToast {
  tipo: "ok" | "error";
  texto: string;
}

export function Toast({ datos, onCerrar }: { datos: DatosToast | null; onCerrar: () => void }) {
  useEffect(() => {
    if (!datos) return;
    const t = setTimeout(onCerrar, datos.tipo === "ok" ? 3000 : 5000);
    return () => clearTimeout(t);
  }, [datos, onCerrar]);

  if (!datos) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm animate-tarjeta">
      <div
        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md ${
          datos.tipo === "ok"
            ? "bg-green-500/15 border-green-400/40 text-green-200"
            : "bg-red-500/15 border-red-400/40 text-red-200"
        }`}
      >
        <span className="text-lg flex-shrink-0">{datos.tipo === "ok" ? "✅" : "⚠️"}</span>
        <p className="text-sm font-bold flex-1">{datos.texto}</p>
        <button onClick={onCerrar} className="text-lg leading-none opacity-60 hover:opacity-100 flex-shrink-0">
          ×
        </button>
      </div>
    </div>
  );
}
