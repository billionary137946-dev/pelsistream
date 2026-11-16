// App instalable (PWA), copiado tal cual de HGC. Un solo lugar para saber: ¿ya está instalada?, ¿es celular?,
// ¿iPhone?, ¿se puede instalar aquí? Lo usa shared/ui/InstalarApp.tsx.
// El aviso de "instalar" (beforeinstallprompt) Chrome lo manda UNA vez por carga de página: se atrapa aquí,
// en cuanto se carga este archivo, para que el botón funcione aunque la pantalla aparezca después.
import { useEffect, useState } from "react";

export type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const ua = () => globalThis.navigator?.userAgent ?? "";

export const yaInstalada = () =>
  globalThis.matchMedia?.("(display-mode: standalone)").matches || (globalThis.navigator as Navigator & { standalone?: boolean })?.standalone === true;

/** iPhone o iPad (el iPad nuevo dice "Macintosh", pero tiene pantalla táctil). */
export const esIphone = () => /iphone|ipad|ipod/i.test(ua()) || (/macintosh/i.test(ua()) && (globalThis.navigator?.maxTouchPoints ?? 0) > 1);

export const esCelular = () => esIphone() || /android|mobile/i.test(ua());

/** En iPhone solo Safari puede instalar: Chrome, Firefox, Instagram, Facebook… no. */
export const iphoneFueraDeSafari = () => esIphone() && /crios|fxios|edgios|opios|gsa\/|instagram|fban|fbav|line\/|tiktok/i.test(ua());

/** Navegador en Android (2026-11-07): solo Chrome da el botón "Instalar" de un toque; Samsung Internet,
 *  Firefox y los demás se instalan desde SU menú, con pasos distintos. null = no es Android. */
export type NavegadorAndroid = "chrome" | "samsung" | "firefox" | "otro";
export function navegadorAndroid(): NavegadorAndroid | null {
  const u = ua();
  if (!/android/i.test(u)) return null;
  if (/SamsungBrowser/i.test(u)) return "samsung";
  if (/Firefox|FxiOS/i.test(u)) return "firefox";
  if (/OPR\/|Opera|EdgA|MiuiBrowser|UCBrowser|YaBrowser|HuaweiBrowser|Instagram|FBAN|FBAV|; wv\)/i.test(u)) return "otro";
  return /Chrome\//i.test(u) ? "chrome" : "otro";
}

/** Pasos para instalar desde el menú de cada navegador de Android (texto plano: lo arma la pantalla). */
export const PASOS_MENU: Record<NavegadorAndroid, [string, string][]> = {
  samsung: [
    ["Toca el menú ", "☰ (abajo a la derecha)"],
    ["Toca ", "“Agregar página a”"],
    ["Elige ", "“Pantalla de inicio”"],
  ],
  chrome: [
    ["Toca el menú ", "⋮ (arriba a la derecha)"],
    ["Toca ", "“Instalar app” o “Agregar a la pantalla principal”"],
  ],
  firefox: [
    ["Toca el menú ", "⋮"],
    ["Toca ", "“Instalar” o “Agregar a la pantalla de inicio”"],
  ],
  otro: [
    ["Ábrela en ", "Chrome (botón de abajo)"],
    ["Ahí toca ", "“Instalar app”"],
  ],
};

/** Abre esta misma página en Chrome (Android). Si no tiene Chrome, Android abre la página normal. */
export const linkChrome = () =>
  `intent://${globalThis.location.host}${globalThis.location.pathname}${globalThis.location.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(globalThis.location.href)};end`;

/** Registra el servicio de la app al abrirla (algunos navegadores lo piden para ofrecer "Instalar"). */
export function registrarServicio() {
  if (globalThis.isSecureContext && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

/** Solo se puede instalar con https (o localhost). En http://192.168… no hay forma: no se obliga. */
export const sePuedeInstalar = () => globalThis.isSecureContext === true;

/** En localhost no se obliga (para poder seguir probando); ?instalar=1 la muestra a propósito. */
export const forzarVista = () => new URLSearchParams(globalThis.location?.search ?? "").get("instalar") === "1";
export const esLocal = () => /^(localhost|127\.0\.0\.1)$/.test(globalThis.location?.hostname ?? "");

let guardado: EventoInstalar | null = null;
let instaladaAhora = false;
const oyentes = new Set<() => void>();
const avisarCambio = () => oyentes.forEach((f) => f());

if (globalThis.window !== undefined) {
  globalThis.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    guardado = e as EventoInstalar;
    avisarCambio();
  });
  globalThis.addEventListener("appinstalled", () => {
    guardado = null;
    instaladaAhora = true;
    avisarCambio();
  });
}

/** El aviso de instalar ya atrapado (o null) y si se acaba de instalar. */
export function useInstalacion() {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const f = () => refrescar((n) => n + 1);
    oyentes.add(f);
    f();
    return () => {
      oyentes.delete(f);
    };
  }, []);
  return {
    evento: guardado,
    instaladaAhora,
    /** Ya usó el aviso: Chrome no deja usarlo dos veces. */
    gastar: () => {
      guardado = null;
      avisarCambio();
    },
  };
}
