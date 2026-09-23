// Eventos con apuestas pendientes (resultado vacío) del negocio del
// operador, con su volumen por color -- para elegir cuál cerrar.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

interface FilaJugada {
  evento: string;
  color: string;
  monto: string;
  alias: string;
  equipo_rojo: string | null;
  equipo_verde: string | null;
}
interface EventoAbierto {
  evento: string;
  apuestas: number;
  vol_rojo: number;
  vol_verde: number;
  equipo_rojo: string | null;
  equipo_verde: string | null;
  detalle: { alias: string; color: string; monto: number }[];
}

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "operador");
    const filas = await sql<FilaJugada[]>`
      select j.evento, j.color, j.monto, u.alias, j.equipo_rojo, j.equipo_verde from jugadas j
      join usuarios u on u.celular = j.cliente_celular
      where j.resultado = '' and u.negocio_id = ${usuario.negocio_id}
    `;

    const porEvento: Record<string, EventoAbierto> = {};
    for (const f of filas) {
      const e = (porEvento[f.evento] ??= {
        evento: f.evento,
        apuestas: 0,
        vol_rojo: 0,
        vol_verde: 0,
        equipo_rojo: null,
        equipo_verde: null,
        detalle: [],
      });
      e.apuestas++;
      const monto = Number(f.monto);
      if (f.color.toLowerCase() === "rojo") e.vol_rojo += monto;
      else e.vol_verde += monto;
      e.detalle.push({ alias: f.alias, color: f.color.toLowerCase(), monto });
      // Cualquier fila con nombre de equipo sirve -- todas las jugadas del
      // mismo evento deberían compartir el mismo nombre (se manda desde el
      // mismo slot local), esto solo evita quedarse con un null si la
      // PRIMERA jugada del evento no lo traía por alguna razón.
      if (!e.equipo_rojo && f.equipo_rojo) e.equipo_rojo = f.equipo_rojo;
      if (!e.equipo_verde && f.equipo_verde) e.equipo_verde = f.equipo_verde;
    }

    return NextResponse.json({ eventos: Object.values(porEvento) });
  });
}
