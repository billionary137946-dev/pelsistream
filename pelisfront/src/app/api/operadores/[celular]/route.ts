import { NextRequest, NextResponse } from "next/server";
import { exigirRol, manejarRuta } from "@/lib/server/auth";
import { editarUsuario } from "@/lib/server/usuarios";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ celular: string }> }) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const { celular } = await params;
    const datos = await request.json();
    const fila = await editarUsuario(celular, datos, "operador");
    return NextResponse.json(fila);
  });
}
