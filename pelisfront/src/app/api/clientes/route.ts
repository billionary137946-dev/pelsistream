import { NextRequest, NextResponse } from "next/server";
import { exigirRol, manejarRuta } from "@/lib/server/auth";
import { crearUsuario, listarPorRol } from "@/lib/server/usuarios";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    return NextResponse.json(await listarPorRol("cliente"));
  });
}

export async function POST(request: NextRequest) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const datos = await request.json();
    const fila = await crearUsuario(datos, "cliente");
    return NextResponse.json(fila, { status: 201 });
  });
}
