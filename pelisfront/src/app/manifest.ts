import type { MetadataRoute } from "next";

// PWA instalable (ver v.2/funcionamiento.txt, sección 9-a): operador y
// cliente pueden "instalar" la app desde el navegador sin pasar por una
// tienda de apps. Íconos extraídos del logo real de v2 (v.2/login.html
// tenía el logo embebido en base64 dentro de un <img>) -- recortados al
// símbolo cuadrado (carta/corona/dados) que ya usaba login.html dentro de
// su círculo de 90x90, generados en todos los tamaños que pide un manifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Peli Streams",
    short_name: "Peli Streams",
    description: "Sistema de apuestas — palenques y quinielas",
    start_url: "/login",
    display: "standalone",
    background_color: "#050d24",
    theme_color: "#050d24",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-256.png", sizes: "256x256", type: "image/png" },
      { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
