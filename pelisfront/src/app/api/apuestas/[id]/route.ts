// Puerto de editar_apuesta_pendiente. Edita el Monto/Color de una apuesta
// que AÚN está pendiente (resultado vacío) -- una vez cerrada ya no se
// puede editar. Límites de monto: $500-$1,000,000.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { ErrorHttp, exigirRol, manejarRuta } from "@/lib/server/auth";
import * as V from "@/lib/server/validar";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "operador");
    const { id } = await params;
    const datos = await request.json();
    // Cada campo solo acepta su tipo de dato (lib/server/validar.ts).
    const colorNuevo = V.unoDe(datos.color_nuevo, ["rojo", "verde"] as const, "Color");
    const montoNuevo = V.montoApuesta(datos.monto_nuevo);
    if (!/^\d{1,12}$/.test(id)) {
      return NextResponse.json({ detail: "Apuesta no encontrada." }, { status: 404 });
    }

    await sql.begin(async (tx) => {
      const [apuesta] = await tx`
        select j.id, j.monto, j.evento, j.cliente_celular, u.negocio_id from jugadas j
        join usuarios u on u.celular = j.cliente_celular
        where j.id = ${id} and j.resultado = '' for update of j
      `;
      if (!apuesta) throw new ErrorHttp(404, "Esa apuesta ya no está pendiente o no se encontró.");
      if (apuesta.negocio_id !== usuario.negocio_id) {
        throw new ErrorHttp(403, "Esa apuesta no pertenece a tu negocio.");
      }

      const [cliente] = await tx`
        select saldo, limite_credito, estatus from usuarios where celular = ${apuesta.cliente_celular} for update
      `;
      if (!cliente) throw new ErrorHttp(404, "No se encontró al cliente de esta apuesta.");
      if (cliente.estatus !== "activo") throw new ErrorHttp(403, "Ese cliente no está activo.");

      const diferencia = montoNuevo - Number(apuesta.monto);
      const saldoAntes = Number(cliente.saldo);
      const saldoDespues = saldoAntes - diferencia;
      if (saldoDespues < -Number(cliente.limite_credito)) {
        throw new ErrorHttp(400, "El cliente no tiene saldo/crédito suficiente para este nuevo monto.");
      }

      await tx`update usuarios set saldo = ${saldoDespues} where celular = ${apuesta.cliente_celular}`;
      await tx`
        insert into movimientos (cliente_celular, tipo, evento, monto, saldo_antes, saldo_despues, operador_celular)
        values (${apuesta.cliente_celular}, 'ajuste', ${apuesta.evento}, ${-diferencia}, ${saldoAntes}, ${saldoDespues}, ${usuario.celular})
      `;
      await tx`update jugadas set monto = ${montoNuevo}, color = ${colorNuevo} where id = ${id}`;
    });

    return NextResponse.json({ ok: true });
  });
}
