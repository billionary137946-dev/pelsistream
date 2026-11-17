// Armazón de los 3 paneles (admin, operador, cliente): encabezado arriba y menú abajo FIJOS;
// solo el contenido de en medio hace scroll. Con `sticky`/`fixed` sobre la página, en la app
// instalada (iPhone sobre todo) el encabezado se despegaba o rebotaba al hacer scroll.
// El scroll vive en [data-scroll-principal] (el recorrido de ayuda lo usa para llevar a cada paso).
export function PantallaApp({
  encabezado,
  pie,
  children,
}: Readonly<{ encabezado: React.ReactNode; pie?: React.ReactNode; children: React.ReactNode }>) {
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {encabezado}
      <div data-scroll-principal className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {children}
      </div>
      {pie}
    </div>
  );
}
