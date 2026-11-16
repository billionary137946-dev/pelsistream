// Envoltura de label + input: antes varios formularios solo tenían
// placeholder como única pista de qué era cada campo -- desaparece en
// cuanto se empieza a escribir, así que ni queda claro qué unidad usa
// "Corretaje %" o para qué sirve "Máx. operadores" a medio llenar el
// formulario. Esto le pone un label fijo arriba (y opcionalmente una ayuda
// abajo) a cualquier input/select/textarea.
export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-white/50 mb-1.5 font-bold">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-white/30 text-[11px] mt-1">{ayuda}</span>}
    </label>
  );
}
