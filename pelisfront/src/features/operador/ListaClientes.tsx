// Pestaña "Clientes" del operador: todos los clientes activos de su negocio con su dinero.
// Saldo = lo que tiene · Disponible = saldo + crédito (lo máximo que puede apostar) ·
// En juego = lo apostado en peleas que aún no se cierran.
"use client";

import { useMemo, useState } from "react";
import { pesos } from "@/shared/lib/formato";
import { limpiarTexto, LIMITES } from "@/shared/lib/inputs";

export interface ClienteConMontos {
  celular: string;
  alias: string;
  saldo: number;
  limite_credito: number;
  en_juego?: number;
}

type Orden = "nombre" | "saldo" | "juego";
const ORDENES: { id: Orden; etiqueta: string }[] = [
  { id: "nombre", etiqueta: "A–Z" },
  { id: "saldo", etiqueta: "Más saldo" },
  { id: "juego", etiqueta: "En juego" },
];

export function ListaClientes({
  clientes,
  onActualizar,
}: Readonly<{ clientes: ClienteConMontos[]; onActualizar: () => void }>) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("nombre");

  const totales = useMemo(
    () => ({
      saldo: clientes.reduce((s, c) => s + c.saldo, 0),
      juego: clientes.reduce((s, c) => s + (c.en_juego ?? 0), 0),
      negativos: clientes.filter((c) => c.saldo < 0).length,
    }),
    [clientes],
  );

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = q
      ? clientes.filter((c) => c.alias.toLowerCase().includes(q) || c.celular.includes(q))
      : clientes;
    return [...filtrados].sort((a, b) => {
      if (orden === "saldo") return b.saldo - a.saldo;
      if (orden === "juego") return (b.en_juego ?? 0) - (a.en_juego ?? 0);
      return a.alias.localeCompare(b.alias, "es");
    });
  }, [clientes, busqueda, orden]);

  return (
    <section className="flex flex-col gap-3">
      {/* Totales del negocio */}
      <div data-guia="op-c-resumen" className="grid grid-cols-3 gap-2">
        <Total etiqueta="Clientes" valor={String(clientes.length)} />
        <Total etiqueta="Saldo total" valor={pesos(totales.saldo)} />
        <Total etiqueta="En juego" valor={pesos(totales.juego)} resaltar={totales.juego > 0} />
      </div>
      {totales.negativos > 0 && (
        <p className="text-xs text-red-300">
          ⚠️ {totales.negativos} {totales.negativos === 1 ? "cliente tiene" : "clientes tienen"} saldo negativo.
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          data-guia="op-c-buscar"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(limpiarTexto(e.target.value, LIMITES.alias))}
          placeholder="Buscar por nombre o celular…"
          className="flex-1 min-w-0 py-2.5 px-4 bg-white/[.06] border-2 border-border/80 rounded-xl font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold"
        />
        <button
          onClick={onActualizar}
          className="flex-shrink-0 min-h-11 px-3 text-xs font-bold text-white/60 hover:text-gold border border-border rounded-xl"
          aria-label="Actualizar clientes"
        >
          ↻
        </button>
      </div>

      <div data-guia="op-c-orden" className="flex gap-2" role="group" aria-label="Ordenar">
        {ORDENES.map((o) => (
          <button
            key={o.id}
            onClick={() => setOrden(o.id)}
            aria-pressed={orden === o.id}
            className={`min-h-9 px-3 rounded-full text-xs font-bold border transition-colors ${
              orden === o.id ? "bg-gold text-navy border-gold" : "border-border text-white/60 hover:text-white"
            }`}
          >
            {o.etiqueta}
          </button>
        ))}
      </div>

      {/* Lista con su propio scroll: muchos clientes no empujan la página. */}
      <ul data-guia="op-c-lista" className="grid content-start gap-2 lg:grid-cols-2 max-h-[max(16rem,calc(100dvh-21rem))] lista-scroll">
        {lista.length === 0 && (
          <li className="text-white/30 text-sm py-4 text-center lg:col-span-2">
            {clientes.length === 0 ? "Tu negocio todavía no tiene clientes activos." : "Ningún cliente coincide."}
          </li>
        )}
        {lista.map((c) => {
          const disponible = c.saldo + c.limite_credito;
          const juego = c.en_juego ?? 0;
          return (
            <li key={c.celular} className="bg-card/60 border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="size-10 flex-shrink-0 grid place-items-center rounded-full bg-gold/15 text-gold font-black">
                {c.alias.trim().charAt(0).toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{c.alias}</p>
                <p className="text-white/40 text-xs tabular-nums">{c.celular}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-black tabular-nums ${c.saldo < 0 ? "text-red-400" : "text-gold"}`}>{pesos(c.saldo)}</p>
                <p className="text-[11px] text-white/45 tabular-nums">Disponible {pesos(disponible)}</p>
                {juego > 0 && <p className="text-[11px] text-amber-300 tabular-nums">En juego {pesos(juego)}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Total({ etiqueta, valor, resaltar }: Readonly<{ etiqueta: string; valor: string; resaltar?: boolean }>) {
  return (
    <div className="bg-card border border-border rounded-xl p-2.5 text-center min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-white/45 truncate">{etiqueta}</p>
      <p className={`font-black text-sm tabular-nums truncate ${resaltar ? "text-amber-300" : "text-white"}`}>{valor}</p>
    </div>
  );
}
