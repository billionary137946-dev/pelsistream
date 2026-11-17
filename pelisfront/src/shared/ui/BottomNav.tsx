// Menú inferior fijo de los 3 paneles (admin, operador, cliente): más alcanzable con el pulgar.
"use client";

export interface ItemNav {
  id: string;
  etiqueta: string;
  icono: React.ReactNode;
}

export function BottomNav({
  items,
  activo,
  onCambiar,
  className = "",
}: {
  items: ItemNav[];
  activo: string;
  onCambiar: (id: string) => void;
  className?: string;
}) {
  return (
    <nav
      data-guia="menu"
      aria-label="Menú"
      className={`flex-shrink-0 z-20 bg-card border-t border-border flex pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] ${className}`}
      style={{ boxShadow: "0 -2px 16px rgba(0,0,0,.25)" }}
    >
      {items.map((item) => {
        const esActivo = item.id === activo;
        return (
          <button
            key={item.id}
            onClick={() => onCambiar(item.id)}
            aria-current={esActivo ? "page" : undefined}
            className={`flex-1 min-w-0 min-h-14 flex flex-col items-center justify-center gap-1 py-2 text-xs font-bold transition-colors ${
              esActivo ? "text-gold" : "text-white/40 hover:text-white/70"
            }`}
          >
            <span className={`transition-transform ${esActivo ? "scale-110" : ""}`}>{item.icono}</span>
            {item.etiqueta}
          </button>
        );
      })}
    </nav>
  );
}
