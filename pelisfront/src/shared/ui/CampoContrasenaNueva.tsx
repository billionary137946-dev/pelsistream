// Campo de contraseña NUEVA para todos los formularios (registro, cambiar, admin crear/editar).
// Muestra en vivo qué reglas cumple y no deja enviar el formulario si falta alguna
// (setCustomValidity → el navegador frena el envío y muestra el mensaje). El servidor vuelve a revisar.
"use client";

import { useEffect, useRef, useState } from "react";
import { errorContrasena, REGLAS_CONTRASENA } from "@/shared/lib/contrasena";
import { LIMITES } from "@/shared/lib/limites";

export function CampoContrasenaNueva({
  name,
  valor,
  onCambiar,
  requerida = true,
  placeholder = "Ej. Gallo-2026",
  mostrar = false,
  className = "campo",
}: Readonly<{
  name?: string;
  /** Si se pasa, el campo es controlado; si no, guarda su propio valor (formularios con FormData). */
  valor?: string;
  onCambiar?: (v: string) => void;
  /** false = puede quedar vacío (ej. "déjalo vacío para no cambiarla"). */
  requerida?: boolean;
  placeholder?: string;
  mostrar?: boolean;
  className?: string;
}>) {
  const [propio, setPropio] = useState("");
  const v = valor ?? propio;
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const error = v === "" && !requerida ? null : errorContrasena(v);
    ref.current?.setCustomValidity(error ?? "");
  }, [v, requerida]);

  return (
    <>
      <input
        ref={ref}
        name={name}
        type={mostrar ? "text" : "password"}
        required={requerida}
        autoComplete="new-password"
        maxLength={LIMITES.contrasenaMax}
        value={v}
        onChange={(e) => (onCambiar ? onCambiar(e.target.value) : setPropio(e.target.value))}
        placeholder={placeholder}
        className={className}
      />
      {(requerida || v !== "") && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5" aria-label="Requisitos de la contraseña">
          {REGLAS_CONTRASENA.map((r) => {
            const ok = r.cumple(v);
            return (
              <li key={r.id} className={`text-[11px] font-bold ${ok ? "text-green-300" : "text-white/40"}`}>
                {ok ? "✓" : "○"} {r.texto}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
