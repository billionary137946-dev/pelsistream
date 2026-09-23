import type { Metadata, Viewport } from "next";
import "./globals.css";

// Mismas dos fuentes que usaba el v2 original (Google Fonts vía <link> en
// cada .html): Bebas Neue para títulos ("font-display"), Nunito para todo
// lo demás ("font-sans").
//
// Se cargan por <link> (preconnect + stylesheet), igual que hacía v2, en
// vez de next/font/google: esa API rompe el build de producción en esta
// versión de Next.js + Turbopack con el error "next/font/google queries
// have exactly one entry" -- un bug del compilador, no del código. Cargar
// por <link> es exactamente lo que ya hacía el sistema original y no
// depende de esa integración.

export const metadata: Metadata = {
  title: "Peli Streams",
  description: "Sistema de apuestas — palenques y quinielas",
  manifest: "/manifest.webmanifest",
  // favicon.ico se sirve solo por convención de archivo (src/app/favicon.ico);
  // aquí solo hace falta declarar el ícono de Apple, que Next no detecta solo
  // a menos que se llame "apple-icon.png" en la raíz de app/.
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050d24",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;700;800;900&display=swap"
        />
      </head>
      <body className="min-h-[100dvh] bg-navy text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
