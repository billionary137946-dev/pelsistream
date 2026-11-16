// Spinner dorado. Variantes: "pantalla" (mientras se valida la sesión) | "bloque" (dentro de una sección o modal).
export function Cargando({ variante = "bloque", texto }: Readonly<{ variante?: "pantalla" | "bloque"; texto?: string }>) {
  if (variante === "pantalla") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <span className="spinner-grande" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <span className="spinner-grande" />
      {texto && <p className="text-white/40 text-sm">{texto}</p>}
    </div>
  );
}
