"use client";

import { useRouter } from "next/navigation";
import { cerrarSesion } from "@/lib/sesion";
import { LogoPeli } from "@/components/LogoPeli";

export function PanelHeader({ titulo, alias }: { titulo: string; alias: string }) {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between gap-2 px-4 py-4 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        <LogoPeli tamano="sm" />
        <div className="min-w-0">
          <h1 className="font-display text-gold text-xl tracking-[2px] leading-none truncate">{titulo}</h1>
          <p className="text-white/40 text-xs mt-1 truncate">{alias}</p>
        </div>
      </div>
      <button
        onClick={() => {
          cerrarSesion();
          router.replace("/login");
        }}
        className="text-xs font-bold text-white/60 hover:text-gold border border-border px-3 py-2 rounded-lg transition-colors flex-shrink-0"
      >
        Salir
      </button>
    </header>
  );
}
