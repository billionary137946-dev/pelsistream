// ¿Qué versión está publicada ahora? (copiado de HGC). La app compara esto con la versión con la que se cargó
// y, si cambió, ofrece "Actualizar" (shared/ui/AvisoActualizar.tsx). Público y sin datos: solo el commit.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ version: process.env.NEXT_PUBLIC_VERSION ?? "dev" }, { headers: { "cache-control": "no-store" } });
}
