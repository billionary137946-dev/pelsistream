// Puerto de declarar_ganador_evento en pelisback/app/api/rutas/apuestas.py.
// Cierra un evento: calcula corretaje/neto de cada apuesta pendiente (solo
// las del negocio del operador) y acredita a los que acertaron.
// rojo/verde → el que acertó cobra (monto - corretaje).
// empate/cancelada → a TODOS se les regresa el monto íntegro, sin corretaje.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { ErrorHttp, exigirRol, manejarRuta } from "@/lib/server/auth";
import { corretajePctDe } from "@/lib/server/apuestas";

export async function POST(request: NextRequest, { params }: { params: Promise<{ evento: string }> }) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "operador");
    const { evento } = await params;
    const datos = await request.json();
    const resultado = String(datos.color_ganador ?? "").toLowerCase();

    if (!["rojo", "verde", "empate", "cancelada"].includes(resultado)) {
      return NextResponse.json({ detail: "Resultado inválido." }, { status: 400 });
    }
    const negocioId = usuario.negocio_id;
    if (!negocioId) {
      return NextResponse.json({ detail: "No se pudo identificar tu negocio." }, { status: 400 });
    }

    const esRifaDeColor = resultado === "rojo" || resultado === "verde";
    const corretajePct = (await corretajePctDe(sql, negocioId)) / 100;

    const salida = await sql.begin(async (tx) => {
      // Todas las apuestas pendientes de este evento, del negocio del
      // operador, con candado de fila (equivalente al LockService de v2).
      const pendientes = await tx`
        select j.id, j.cliente_celular, j.color, j.monto from jugadas j
        join usuarios u on u.celular = j.cliente_celular
        where j.evento = ${evento} and j.resultado = '' and u.negocio_id = ${negocioId}
        order by j.cliente_celular for update of j
      `;
      if (pendientes.length === 0) {
        throw new ErrorHttp(404, "No hay apuestas pendientes para ese evento.");
      }
      // Un palenque solo se puede cerrar si hay apuestas de los DOS colores
      // -- si solo apostaron a uno, todavía no hay contra quién cerrar.
      const tieneRojo = pendientes.some((p) => String(p.color).toLowerCase() === "rojo");
      const tieneVerde = pendientes.some((p) => String(p.color).toLowerCase() === "verde");
      if (!tieneRojo || !tieneVerde) {
        throw new ErrorHttp(400, "Necesitas al menos una apuesta de cada color (rojo y verde) para poder cerrar.");
      }

      let ganadores = 0;
      let perdedores = 0;
      let totalCorretaje = 0;

      for (const apuesta of pendientes) {
        const color = String(apuesta.color).toLowerCase();
        const monto = Number(apuesta.monto);

        let filaResultado: string;
        let corretaje: number;
        let neto: number;
        let saldoDelta: number;
        let movTipo: string;

        if (!esRifaDeColor) {
          filaResultado = resultado;
          corretaje = 0;
          neto = 0;
          saldoDelta = monto;
          movTipo = resultado === "empate" ? "devolución (empate)" : "devolución (cancelada)";
          ganadores++;
        } else {
          const gano = color === resultado;
          filaResultado = gano ? "ganada" : "perdida";
          corretaje = gano ? monto * corretajePct : 0;
          neto = gano ? monto - corretaje : -monto;
          saldoDelta = gano ? neto : 0;
          movTipo = gano ? "ganancia" : "perdida";
          if (gano) {
            totalCorretaje += corretaje;
            ganadores++;
          } else {
            perdedores++;
          }
        }

        await tx`
          update jugadas set resultado = ${filaResultado}, corretaje = ${corretaje}, neto = ${neto}
          where id = ${apuesta.id}
        `;

        if (saldoDelta !== 0) {
          const [cliente] = await tx`select saldo from usuarios where celular = ${apuesta.cliente_celular} for update`;
          const saldoAntes = Number(cliente.saldo);
          const saldoDespues = saldoAntes + saldoDelta;
          await tx`update usuarios set saldo = ${saldoDespues} where celular = ${apuesta.cliente_celular}`;
          await tx`
            insert into movimientos (cliente_celular, tipo, evento, monto, saldo_antes, saldo_despues, operador_celular)
            values (${apuesta.cliente_celular}, ${movTipo}, ${evento}, ${saldoDelta}, ${saldoAntes}, ${saldoDespues}, ${usuario.celular})
          `;
        }
      }

      return { ok: true, ganadores, perdedores, corretaje: totalCorretaje };
    });

    return NextResponse.json(salida);
  });
}
