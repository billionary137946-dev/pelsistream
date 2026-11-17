"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cerrarSesion } from "@/shared/lib/sesion";
import { LogoPeli } from "@/shared/ui/LogoPeli";
import { abrirRecorrido } from "@/shared/guia/Recorrido";

export function PanelHeader({ titulo, alias }: Readonly<{ titulo: string; alias: string }>) {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-border bg-card z-10 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <LogoPeli tamano="sm" />
        <div className="min-w-0">
          <h1 className="font-display text-gold text-xl tracking-[2px] leading-none truncate">{titulo}</h1>
          <p className="text-white/40 text-xs mt-1 truncate">{alias}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Ayuda: repite el recorrido guiado de la pantalla actual (shared/guia/recorridos.ts). */}
        <button
          type="button"
          data-guia="ayuda"
          onClick={() => abrirRecorrido()}
          aria-label="Ayuda: ¿qué hay en esta pantalla?"
          title="Ayuda"
          className="w-9 h-9 grid place-items-center rounded-full border border-border font-black text-base animate-parpadeo-ayuda hover:border-gold"
        >
          ?
        </button>
        <Link
          href="/cambiar-contrasena"
          aria-label="Cambiar mi contraseña"
          title="Cambiar mi contraseña"
          className="w-9 h-9 grid place-items-center rounded-full border border-border text-base hover:border-gold"
        >
          🔑
        </Link>
        <button
          onClick={() => {
            cerrarSesion();
            router.replace("/login");
          }}
          className="text-xs font-bold text-white/60 hover:text-gold border border-border px-3 py-2 rounded-lg transition-colors"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
