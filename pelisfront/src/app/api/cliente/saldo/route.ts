import { NextRequest, NextResponse } from "next/server";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    const usuario = await exigirRol(request, "cliente");
    return NextResponse.json({ saldo: Number(usuario.saldo) });
  });
}
