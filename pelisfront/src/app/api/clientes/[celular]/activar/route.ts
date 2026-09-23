// Puerto de completar_y_activar_cliente en pelisback/app/api/rutas/registro_publico.py.
// Para clientes que llegaron por auto-registro (estatus "pendiente"): el
// admin completa saldo/límite y activa la cuenta en un solo paso.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ celular: string }> }) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const { celular } = await params;
    const datos = await request.json();
    const saldo = Number(datos.saldo ?? 0);
    const limiteCredito = Number(datos.limite_credito ?? 0);

    const [fila] = await sql`
      update usuarios set saldo = ${saldo}, limite_credito = ${limiteCredito}, estatus = 'activo'
      where celular = ${celular}
      returning celular
    `;
    if (!fila) {
      return NextResponse.json({ detail: "Cliente no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  });
}
