import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/server/db";
import { exigirRol, manejarRuta } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  return manejarRuta(async () => {
    await exigirRol(request, "admin");
    const desdeStr = request.nextUrl.searchParams.get("desde");
    const hastaStr = request.nextUrl.searchParams.get("hasta");
    const desde = desdeStr ? new Date(desdeStr) : null;
    const hasta = hastaStr ? new Date(hastaStr) : null;

    // Parametrizado (no texto concatenado): postgres.js arma la cláusula
    // WHERE en partes, comparando siempre con placeholders reales.
    const [fila] = await sql`
      select count(*)::int as jugadas, coalesce(sum(monto), 0)::float as volumen,
        coalesce(sum(corretaje), 0)::float as corretaje
      from jugadas
      where (${desde}::timestamptz is null or fecha >= ${desde})
        and (${hasta}::timestamptz is null or fecha < ${hasta})
    `;

    const [{ count: deudas }] = await sql<{ count: number }[]>`
      select count(*)::int from usuarios where rol = 'cliente' and saldo < 0
    `;

    return NextResponse.json({
      jugadas: fila.jugadas,
      volumen: Number(fila.volumen),
      corretaje: Number(fila.corretaje),
      deudas,
    });
  });
}
