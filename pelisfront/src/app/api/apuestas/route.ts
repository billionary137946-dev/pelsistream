// Puerto de registrar_apuesta en pelisback/app/api/rutas/apuestas.py.
// Descuenta el monto al cliente de inmediato (se le regresa solo si gana,
// vía cerrar evento) y deja la fila en "jugadas" con resultado vacío
// (pendiente de cierre). El negocio del operador se deriva de su celular
// (no del navegador) y se exige que el cliente sea de ESE MISMO negocio.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { ErrorHttp, exigirRol, manejarRuta } from "@/lib/server/auth";
import { recordarIntento, resultadoDeIntento } from "@/lib/server/dedupe";
import * as V from "@/lib/server/validar";

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "operador");
    const datos = await request.json();
    const intentoId = V.intentoId(datos.intento_id);

    const yaProcesado = await resultadoDeIntento(intentoId);
    if (yaProcesado !== null) return NextResponse.json(yaProcesado);

    // Cada campo solo acepta su tipo de dato (lib/server/validar.ts).
    // Evento = "palenque #N" → nombre + espacio para el número.
    const evento = V.texto(datos.evento, "El nombre del evento", { max: V.LIMITES.nombreEvento + V.LIMITES.numeroJugada + 2 });
    // Sin exigir 10 dígitos: puede haber clientes viejos; el negocio y que exista se valida abajo.
    const clienteCelular = V.texto(datos.cliente_celular, "El cliente", { max: 15 });
    const color = V.unoDe(datos.color, ["rojo", "verde"] as const, "Color (rojo o verde)");
    // Mismo rango que v2 (operador.html: input apMonto min=500 max=1000000), en pesos enteros.
    const monto = V.montoApuesta(datos.monto);
    const tipo = V.unoDe(datos.tipo ?? "Apuesta", ["Apuesta"] as const, "Tipo");
    // Cosméticos (identifican el palenque, no afectan saldo/corretaje) --
    // antes solo vivían en memoria del navegador y se perdían al recargar
    // la página o en otra sesión/dispositivo.
    const equipoRojo = V.textoOpcional(datos.equipo_rojo, "Equipo rojo", V.LIMITES.nombreEquipo);
    const equipoVerde = V.textoOpcional(datos.equipo_verde, "Equipo verde", V.LIMITES.nombreEquipo);

    const negocioOperador = usuario.negocio_id;
    if (!negocioOperador) {
      return NextResponse.json({ detail: "No se pudo identificar tu negocio." }, { status: 400 });
    }

    const resultado = await sql.begin(async (tx) => {
      // "for update" bloquea la fila del cliente: si dos apuestas del MISMO
      // cliente llegan casi juntas, la segunda espera a que la primera
      // termine su transacción en vez de leer un saldo desactualizado.
      const [cliente] = await tx`
        select celular, saldo, limite_credito, negocio_id, estatus from usuarios
        where celular = ${clienteCelular} for update
      `;
      if (!cliente) throw new ErrorHttp(404, "Cliente no encontrado.");
      if (cliente.estatus !== "activo") throw new ErrorHttp(403, "Ese cliente no está activo.");
      if (cliente.negocio_id !== negocioOperador) {
        throw new ErrorHttp(403, "Ese cliente no pertenece a tu negocio.");
      }

      const saldoAntes = Number(cliente.saldo);
      const limiteCredito = Number(cliente.limite_credito);
      const saldoDespues = saldoAntes - monto;
      if (saldoDespues < -limiteCredito) {
        throw new ErrorHttp(400, "El cliente no tiene saldo/crédito suficiente para esta apuesta.");
      }

      await tx`update usuarios set saldo = ${saldoDespues} where celular = ${cliente.celular}`;
      await tx`
        insert into movimientos (cliente_celular, tipo, evento, monto, saldo_antes, saldo_despues, operador_celular)
        values (${cliente.celular}, 'apuesta', ${evento}, ${-monto}, ${saldoAntes}, ${saldoDespues}, ${usuario.celular})
      `;
      await tx`
        insert into jugadas (tipo, evento, cliente_celular, color, monto, operador_celular, equipo_rojo, equipo_verde)
        values (${tipo}, ${evento}, ${cliente.celular}, ${color}, ${monto}, ${usuario.celular}, ${equipoRojo}, ${equipoVerde})
      `;

      return { ok: true, saldo: saldoDespues };
    });

    await recordarIntento(intentoId, resultado);
    return NextResponse.json(resultado);
  });
}
