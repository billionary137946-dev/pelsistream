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
import { PantallaApp } from "@/shared/ui/PantallaApp";
import { BottomNav } from "@/shared/ui/BottomNav";
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

type Vista = "saldo" | "historial";

export function PanelCliente() {
  const { sesion, cargando } = useSesion("cliente");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [jugadas, setJugadas] = useState<Jugada[]>([]);
  const [vista, setVista] = useState<Vista>("saldo");
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

  const pendientes = jugadas.filter((j) => !j.resultado);
  const enJuego = pendientes.reduce((t, j) => t + j.monto, 0);

  return (
    <div>
      {/* Encabezado y menú fijos; solo el contenido hace scroll (shared/ui/PantallaApp.tsx).
          Celular: Saldo e Historial son pestañas del menú. PC: los dos a la vez (el menú se oculta). */}
      <PantallaApp
        encabezado={<PanelHeader titulo="Mi cuenta" alias={sesion.alias} />}
        pie={
          <BottomNav
            className="lg:hidden"
            activo={vista}
            onCambiar={(id) => setVista(id as Vista)}
            items={[
              { id: "saldo", etiqueta: "Saldo", icono: <span>💰</span> },
              { id: "historial", etiqueta: "Historial", icono: <span>📋</span> },
            ]}
          />
        }
      >
      <main className="p-4 max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6 lg:items-start">
        <div className={`flex flex-col gap-3 lg:sticky lg:top-4 ${vista === "saldo" ? "" : "max-lg:hidden"}`}>
          <div data-guia="cli-saldo" className="bg-card border border-border rounded-2xl p-6 text-center sombra-tarjeta">
            <p className="text-white/50 text-xs uppercase tracking-[.15em] mb-2">Saldo actual</p>
            <p
              className={`font-display text-5xl tracking-wide ${
                saldo !== null && saldo < 0 ? "text-red-400" : "text-gold"
              }`}
            >
              {saldo === null ? "…" : pesos(saldo)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card/60 border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/45">Apuestas pendientes</p>
              <p className="font-black tabular-nums">{pendientes.length}</p>
            </div>
            <div className="bg-card/60 border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/45">En juego</p>
              <p className={`font-black tabular-nums ${enJuego > 0 ? "text-amber-300" : ""}`}>{pesos(enJuego)}</p>
            </div>
          </div>
        </div>

        <div className={`min-w-0 ${vista === "historial" ? "" : "max-lg:hidden"}`}>
        <h2 className="text-white/60 text-xs uppercase tracking-[.15em] mb-3">Historial</h2>
        {/* Lista con su propio scroll: un historial largo no empuja la página. */}
        <div data-guia="cli-historial" className="flex flex-col gap-2 max-h-[calc(100dvh-14rem)] lista-scroll">
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
      </PantallaApp>
      <Recorrido pantalla="cliente" />
      <InstalarApp nombre="PeliStreams" forma="pantalla" />
    </div>
  );
}
