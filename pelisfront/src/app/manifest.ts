import type { MetadataRoute } from "next";

// PWA instalable (misma configuración que HGC): operador, cliente y admin la instalan desde el navegador
// sin pasar por una tienda de apps. La pantalla "Instala la app" vive en shared/ui/InstalarApp.tsx.
// Íconos extraídos del logo real de v2 (v.2/login.html). icon-maskable-512 = el logo al 80% sobre navy,
// para que Android lo recorte en círculo/gota sin cortar la corona ni los dados.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PeliStreams",
    short_name: "PeliStreams",
    description: "Sistema de apuestas — palenques y quinielas",
    id: "/",
    // Abre en /login: si ya hay sesión, el login manda directo al panel de cada rol.
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#050d24",
    theme_color: "#050d24",
    lang: "es-MX",
    categories: ["entertainment", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
