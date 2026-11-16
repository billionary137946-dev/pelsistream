// Panel del cliente: 100% de solo lectura (ver v.2/funcionamiento.txt,
// sección 3 "CLIENTE"). Saldo con auto-refresco cada 5s mientras la pantalla
// sigue abierta, con bandera anti-solapamiento igual que cliente.html en v2
// (si una respuesta tarda más de 5s, el siguiente tick se salta en vez de
// encimar peticiones).
"use client";

import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/shared/lib/useSesion";
import { api } from "@/shared/lib/api";
import { PanelHeader } from "@/shared/ui/PanelHeader";
import { Cargando } from "@/shared/ui/Cargando";
import { Recorrido } from "@/shared/guia/Recorrido";
import { InstalarApp } from "@/shared/ui/InstalarApp";
import { claseResultado, fechaHora, pesos } from "@/shared/lib/formato";

interface Jugada {
  evento: string;
  color: string;
  monto: number;
  resultado: string;
  neto: number | null;
  fecha: string;
}

export function PanelCliente() {
  const { sesion, cargando } = useSesion("cliente");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [jugadas, setJugadas] = useState<Jugada[]>([]);
  const pollEnCurso = useRef(false);
  // useSesion primero pone la sesión guardada en localStorage y luego la
  // reemplaza por la revalidada contra el backend -- sin este candado, el
  // efecto de abajo se disparaba dos veces seguidas y llegaba a montar dos
  // intervalos de polling superpuestos.
  const yaCargado = useRef(false);

  useEffect(() => {
    if (!sesion || yaCargado.current) return;
    yaCargado.current = true;

    async function refrescarSaldo() {
      if (pollEnCurso.current) return; // no encimar peticiones si la anterior sigue en vuelo
      pollEnCurso.current = true;
      try {
        const r = await api.get<{ saldo: number }>("/cliente/saldo");
        setSaldo(r.saldo);
      } catch {
        // silencioso: el próximo tick de 5s vuelve a intentar
      } finally {
        pollEnCurso.current = false;
      }
    }

    refrescarSaldo();
    api
      .get<{ jugadas: Jugada[] }>("/cliente/historial")
      .then((r) => setJugadas(r.jugadas))
      .catch(() => {
        /* si falla, el historial simplemente se queda vacío en esta carga */
      });

    const intervalo = setInterval(refrescarSaldo, 5000);
    return () => clearInterval(intervalo);
  }, [sesion]);

  if (cargando || !sesion) return <Cargando variante="pantalla" />;

  return (
    <div className="min-h-[100dvh]">
      <PanelHeader titulo="Mi cuenta" alias={sesion.alias} />

      {/* Celular: saldo arriba e historial abajo. PC: saldo a la izquierda (fijo) e historial a la derecha. */}
      <main className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6 lg:items-start">
        <div data-guia="cli-saldo" className="lg:sticky lg:top-24 bg-card border border-border rounded-2xl p-6 text-center sombra-tarjeta">
          <p className="text-white/50 text-xs uppercase tracking-[.15em] mb-2">Saldo actual</p>
          <p
            className={`font-display text-5xl tracking-wide ${
              saldo !== null && saldo < 0 ? "text-red-400" : "text-gold"
            }`}
          >
            {saldo === null ? "…" : pesos(saldo)}
          </p>
        </div>

        <div className="min-w-0">
        <h2 className="text-white/60 text-xs uppercase tracking-[.15em] mt-8 lg:mt-0 mb-3">Historial</h2>
        {/* Lista con su propio scroll: un historial largo no empuja la página. */}
        <div data-guia="cli-historial" className="flex flex-col gap-2 max-h-[60dvh] lista-scroll">
          {jugadas.length === 0 && <p className="text-white/30 text-sm">Todavía no tienes jugadas.</p>}
          {jugadas.map((j) => (
            <div
              key={`${j.evento}-${j.fecha}-${j.color}-${j.monto}`}
              className="bg-card/60 border border-border rounded-xl p-3 flex items-center justify-between flex-shrink-0"
            >
              <div>
                <p className="font-bold text-sm">{j.evento}</p>
                <p className="text-white/40 text-xs">
                  {j.color} · {fechaHora(j.fecha)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{pesos(j.monto)}</p>
                <p className={`text-xs ${claseResultado(j.resultado)}`}>
                  {j.resultado || "pendiente"}
                </p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </main>
      <Recorrido pantalla="cliente" />
      <InstalarApp nombre="PeliStreams" forma="pantalla" />
    </div>
  );
}
