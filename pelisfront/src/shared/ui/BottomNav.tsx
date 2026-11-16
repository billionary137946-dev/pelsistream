// Navegación inferior tipo app nativa (ver v.2/funcionamiento.txt, sección
// 9-d): más alcanzable con el pulgar que tabs arriba, que es lo que usaba
// v2 (goTab). Se usa en /operador, que es el panel de más uso constante en
// campo; admin sigue con tabs arriba porque ese rol sí vive más en
// escritorio (ver funcionamiento.txt, sección 9).
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
}: {
  items: ItemNav[];
  activo: string;
  onCambiar: (id: string) => void;
}) {
  return (
    <nav
      data-guia="menu"
      aria-label="Menú"
      className="fixed bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md border-t border-border flex pb-[env(safe-area-inset-bottom)]"
      style={{ boxShadow: "0 -2px 16px rgba(0,0,0,.25)" }}
    >
      {items.map((item) => {
        const esActivo = item.id === activo;
        return (
          <button
            key={item.id}
            onClick={() => onCambiar(item.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-bold transition-colors ${
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
