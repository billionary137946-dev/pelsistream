// Red de seguridad global: si algo truena durante el render (un error que
// ninguna pantalla atrapó con su propio try/catch), Next.js muestra esto en
// vez de su overlay de desarrollo con el stack trace completo -- eso es
// "código" para cualquiera que no programe. Aquí sale algo que una persona
// puede entender y un botón para intentar de nuevo, igual al criterio de
// codigo.gs (sección 6 de funcionamiento.txt): nunca mostrar el error crudo
// del servidor a quien está usando la app.
"use client";

import { useEffect } from "react";

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Se deja en la consola del navegador para quien sí necesite depurarlo
    // (tú, o quien revise soporte) -- nunca en la pantalla que ve el usuario.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 text-center">
      <div className="max-w-sm flex flex-col items-center gap-3">
        <p className="text-5xl">😕</p>
        <h1 className="font-display text-gold text-xl tracking-wide">Algo salió mal</h1>
        <p className="text-white/50 text-sm">
          No se pudo mostrar esta pantalla. Intenta de nuevo — si sigue igual, avísale al
          administrador.
        </p>
        <button
          onClick={reset}
          className="mt-2 px-5 py-2.5 bg-gradient-to-br from-gold to-gold-2 text-navy rounded-xl font-black text-sm"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
