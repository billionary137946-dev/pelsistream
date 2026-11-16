// 404 con el mismo diseño de la app (antes era la página en blanco/genérica
// de Next.js) -- se muestra cuando la ruta no existe (link viejo, typo en la
// URL, etc.).
import Link from "next/link";
import { LogoPeli } from "@/shared/ui/LogoPeli";

export default function NoEncontrado() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 text-center">
      <div className="max-w-sm flex flex-col items-center gap-3">
        <LogoPeli tamano="sm" />
        <p className="font-display text-gold text-5xl">404</p>
        <h1 className="font-bold">No se encontró esta página</h1>
        <p className="text-white/50 text-sm">
          El link que abriste no existe o ya no está disponible.
        </p>
        <Link
          href="/login"
          className="mt-2 px-5 py-2.5 bg-gradient-to-br from-gold to-gold-2 text-navy rounded-xl font-black text-sm"
        >
          Ir al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
