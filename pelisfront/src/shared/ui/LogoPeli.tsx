// Logo real de PeliStreams (extraído de v.2/login.html, que lo traía
// embebido en base64 dentro de un <img> -- ver pelisfront/public/icons/).
// Mismo uso que en v2: grande y centrado en login/registro, chico dentro de
// un círculo en el header de admin/operador/cliente. Tamaños en clamp()
// -- igual que v2 -- para que escale fluido entre celular y escritorio en
// vez de saltar entre breakpoints fijos.
import Image from "next/image";

const CLASES_TAMANO = {
  // header de admin/operador/cliente — v2: clamp(1.75rem,5vw,2.25rem)
  sm: "h-[clamp(1.75rem,5vw,2.25rem)] w-[clamp(1.75rem,5vw,2.25rem)]",
  // login/registro — v2: clamp(55px,15vw,90px)
  lg: "h-[clamp(55px,15vw,90px)] w-[clamp(55px,15vw,90px)]",
} as const;

export function LogoPeli({ tamano = "lg" }: { tamano?: keyof typeof CLASES_TAMANO }) {
  return (
    <div className={`animate-logo rounded-full overflow-hidden flex-shrink-0 ${CLASES_TAMANO[tamano]}`}>
      <Image
        src="/icons/icon-192.png"
        alt="PeliStreams"
        width={192}
        height={192}
        className="h-full w-full object-cover"
        priority
      />
    </div>
  );
}
