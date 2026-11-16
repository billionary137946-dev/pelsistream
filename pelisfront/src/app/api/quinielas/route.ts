// Puerto de cerrar_quiniela en pelisback/app/api/rutas/quinielas.py. A
// diferencia de una apuesta normal, se registra COMPLETA y ya resuelta al
// cerrarla (los apostadores no tienen cuenta, pagan en efectivo). Se guarda
// el celular del OPERADOR en cliente_celular para poder seguir infiriendo
// el negocio desde la fila.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";
import { corretajePctDe } from "@/lib/server/apuestas";
import { recordarIntento, resultadoDeIntento } from "@/lib/server/dedupe";
import * as V from "@/lib/server/validar";

const TIPOS_QUINIELA = ["Ventaja", "Quiniela", "Mano a mano", "Pares y nones"];

interface Apostador {
  nombre: string;
  lugar: string;
  ganador: boolean;
  pts?: string;
  carta?: string;
}

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "operador");
    const datos = await request.json();
    const intentoId = V.intentoId(datos.intento_id);

    const yaProcesado = await resultadoDeIntento(intentoId);
    if (yaProcesado !== null) return NextResponse.json(yaProcesado);

    // Cada campo solo acepta su tipo de dato (lib/server/validar.ts).
    const nombreQuiniela = V.texto(datos.nombre, "El nombre de la quiniela", { max: V.LIMITES.nombreEvento });
    let subTipo = String(datos.sub_tipo ?? "Quiniela");
    if (!TIPOS_QUINIELA.includes(subTipo)) subTipo = "Quiniela";
    // Mismo rango que la pantalla y que una apuesta: $500 a $1,000,000, pesos enteros.
    const montoLugar = V.montoApuesta(datos.monto_lugar, "El monto por lugar");
    if (!Array.isArray(datos.apostadores) || datos.apostadores.length === 0) {
      return NextResponse.json({ detail: "Agrega al menos un apostador." }, { status: 400 });
    }
    if (datos.apostadores.length > V.LIMITES.apostadoresMax) {
      return NextResponse.json({ detail: `Máximo ${V.LIMITES.apostadoresMax} apostadores por quiniela.` }, { status: 400 });
    }
    const apostadores: Apostador[] = (datos.apostadores as Record<string, unknown>[]).map((a, i) => ({
      nombre: V.texto(a?.nombre, `Apostador ${i + 1}: nombre`, { max: V.LIMITES.nombreApostador }),
      lugar: String(V.entero(a?.lugar, `Apostador ${i + 1}: lugar`, 1, V.LIMITES.apostadoresMax)),
      ganador: a?.ganador === true,
      pts: a?.pts === undefined || a?.pts === "" ? "" : String(V.entero(a.pts, `Apostador ${i + 1}: puntos`, 0, 999)),
      carta: V.textoOpcional(a?.carta, `Apostador ${i + 1}: carta`, V.LIMITES.carta) ?? "",
    }));
    const negocioId = usuario.negocio_id;
    if (!negocioId) {
      return NextResponse.json({ detail: "No se pudo identificar tu negocio." }, { status: 400 });
    }

    const corretajePct = (await corretajePctDe(sql, negocioId)) / 100;
    let totalGanadores = 0;
    let totalCorretaje = 0;

    await sql.begin(async (tx) => {
      for (const a of apostadores) {
        const gano = Boolean(a.ganador);
        const corretaje = gano ? montoLugar * corretajePct : 0;
        const neto = gano ? montoLugar - corretaje : -montoLugar;
        if (gano) {
          totalGanadores++;
          totalCorretaje += corretaje;
        }

        let extra = "";
        if (subTipo === "Pares y nones") {
          if (a.pts) extra += `, ${a.pts} pts`;
          if (a.carta) extra += `, carta ${a.carta}`;
        }
        const evento = `${nombreQuiniela} — ${a.nombre} (Lugar ${a.lugar}${extra})`;

        await tx`
          insert into jugadas (tipo, evento, cliente_celular, color, monto, corretaje, resultado, neto, operador_celular)
          values (${subTipo}, ${evento}, ${usuario.celular}, ${"Lugar " + a.lugar}, ${montoLugar}, ${corretaje}, ${gano ? "ganada" : "perdida"}, ${neto}, ${usuario.celular})
        `;
      }
    });

    const resultado = { ok: true, ganadores: totalGanadores, corretaje: totalCorretaje };
    await recordarIntento(intentoId, resultado);
    return NextResponse.json(resultado);
  });
}
