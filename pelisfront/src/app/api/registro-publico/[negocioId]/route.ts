// Puerto de getNegocioPublico. Devuelve el nombre del negocio si existe y
// está activo, para mostrarlo en /registro antes de llenar el formulario.
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ negocioId: string }> }) {
  return manejarRuta(async () => {
    const { negocioId } = await params;
    const [negocio] = await sql`
      select nombre from negocios where lower(nombre) = lower(${negocioId}) and activo = true
    `;
    if (!negocio) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true, nombre: negocio.nombre });
  });
}
