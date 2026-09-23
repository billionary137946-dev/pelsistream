// Panel del cliente: 100% de solo lectura (ver v.2/funcionamiento.txt,
// sección 3 "CLIENTE"). Saldo con auto-refresco cada 5s mientras la pantalla
// sigue abierta, con bandera anti-solapamiento igual que cliente.html en v2
// (si una respuesta tarda más de 5s, el siguiente tick se salta en vez de
// encimar peticiones).
"use client";

import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/lib/useSesion";
import { api } from "@/lib/api";
import { PanelHeader } from "@/components/PanelHeader";

interface Jugada {
  evento: string;
  color: string;
  monto: number;
  resultado: string;
  neto: number | null;
  fecha: string;
}

export default function PanelCliente() {
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

  if (cargando || !sesion) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <span className="spinner-grande" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <PanelHeader titulo="Mi cuenta" alias={sesion.alias} />

      <main className="p-4 max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-6 text-center sombra-tarjeta">
          <p className="text-white/50 text-xs uppercase tracking-[.15em] mb-2">Saldo actual</p>
          <p
            className={`font-display text-5xl tracking-wide ${
              saldo !== null && saldo < 0 ? "text-red-400" : "text-gold"
            }`}
          >
            {saldo === null ? "…" : `$${saldo.toLocaleString("es-MX")}`}
          </p>
        </div>

        <h2 className="text-white/60 text-xs uppercase tracking-[.15em] mt-8 mb-3">Historial</h2>
        <div className="flex flex-col gap-2">
          {jugadas.length === 0 && <p className="text-white/30 text-sm">Todavía no tienes jugadas.</p>}
          {jugadas.map((j, i) => (
            <div
              key={i}
              className="bg-card/60 border border-border rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-sm">{j.evento}</p>
                <p className="text-white/40 text-xs">
                  {j.color} · {new Date(j.fecha).toLocaleString("es-MX")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">${j.monto.toLocaleString("es-MX")}</p>
                <p
                  className={`text-xs ${
                    j.resultado === "" ? "text-amber-300" : j.resultado === "ganada" ? "text-green-300" : "text-white/40"
                  }`}
                >
                  {j.resultado || "pendiente"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
