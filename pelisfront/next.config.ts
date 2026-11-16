import type { NextConfig } from "next";

// Configuración tomada de HGC: encabezados de seguridad + PWA.
// - El navegador SOLO ejecuta scripts de este sitio y SOLO se conecta a este mismo sitio (la base de datos
//   se usa desde el servidor, nunca desde el navegador), nadie puede meter la app en un marco de otro sitio,
//   y nunca se baja a http.
// - Diferencia con HGC: aquí se permiten las fuentes de Google (Bebas Neue + Nunito, ver layout.tsx).
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next.js necesita scripts en línea para arrancar la página; en desarrollo además eval (recarga en caliente).
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self'${dev ? " ws: http://localhost:*" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const encabezados = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Sin cámara, micrófono, ubicación ni pagos: la app no los usa.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Versión publicada (el commit de Vercel): la app la compara con /api/version para ofrecer "Actualizar".
  env: { NEXT_PUBLIC_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
  // Nunca publicar los mapas del código fuente.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  // En producción se quitan los console.log (los errores sí se quedan para diagnóstico).
  compiler: dev ? undefined : { removeConsole: { exclude: ["error"] } },
  async headers() {
    return [
      { source: "/:path*", headers: encabezados },
      // El service worker nunca se guarda en caché: así cada versión nueva se instala sola.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
