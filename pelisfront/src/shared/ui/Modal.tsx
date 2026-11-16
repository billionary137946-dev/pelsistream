// Ventana base de toda la app (antes cada modal repetía el mismo fondo y caja).
// Las diferencias son VARIANTES, no componentes nuevos:
// - ancho: "sm" (formularios) | "md" (resúmenes/historial)
// - contenido: "libre" (crece solo) | "scroll" (máx. 90% de alto, scroll adentro) | "columna" (80% de alto, la lista interna hace scroll)

const ANCHO = { sm: "max-w-sm", md: "max-w-md" } as const;
const CONTENIDO = {
  libre: "",
  scroll: "max-h-[90dvh] overflow-y-auto",
  columna: "max-h-[80dvh] flex flex-col",
} as const;

export function Modal({
  ancho = "sm",
  contenido = "libre",
  children,
}: Readonly<{
  ancho?: keyof typeof ANCHO;
  contenido?: keyof typeof CONTENIDO;
  children: React.ReactNode;
}>) {
  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${ANCHO[ancho]} bg-card border border-border rounded-2xl p-5 animate-tarjeta ${CONTENIDO[contenido]}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Título + botón × de cerrar, igual en todos los modales. */
export function EncabezadoModal({
  titulo,
  onCerrar,
  className = "mb-4",
}: Readonly<{ titulo: React.ReactNode; onCerrar: () => void; className?: string }>) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h3 className="font-display text-gold text-lg tracking-wide">{titulo}</h3>
      <button onClick={onCerrar} aria-label="Cerrar" className="text-white/40 hover:text-white text-xl leading-none">
        ×
      </button>
    </div>
  );
}
