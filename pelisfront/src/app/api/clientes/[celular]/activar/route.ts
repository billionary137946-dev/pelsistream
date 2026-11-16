// Puerto de completar_y_activar_cliente en pelisback/app/api/rutas/registro_publico.py.
// Para clientes que llegaron por auto-registro (estatus "pendiente"): el
// admin completa saldo/límite y activa la cuenta en un solo paso.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";
import * as V from "@/lib/server/validar";

export async function POST(request: NextRequest, { params }: { params: Promise<{ celular: string }> }) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const { celular } = await params;
    const datos = await request.json();
    // Cada campo solo acepta su tipo de dato (lib/server/validar.ts).
    const saldo = V.dinero(datos.saldo ?? 0, "El saldo", -V.LIMITES.dineroMax, V.LIMITES.dineroMax);
    const limiteCredito = V.dinero(datos.limite_credito ?? 0, "El límite de crédito", 0, V.LIMITES.dineroMax);

    const [fila] = await sql`
      update usuarios set saldo = ${saldo}, limite_credito = ${limiteCredito}, estatus = 'activo'
      where celular = ${celular} and rol = 'cliente'
      returning celular
    `;
    if (!fila) {
      return NextResponse.json({ detail: "Cliente no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  });
}
