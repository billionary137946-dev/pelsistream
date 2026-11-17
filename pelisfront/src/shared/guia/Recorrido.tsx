"use client";

// Recorrido guiado (2026-11-07, estilo Dasus, copiado de HGC): oscurece la pantalla, marca el botón con borde punteado y muestra
// una tarjeta con título, explicación, consejo, "1 / 5", Saltar y Siguiente. Los pasos viven en recorridos.ts.
// - Arranca solo la PRIMERA vez que se abre esa pantalla (se recuerda en este dispositivo).
// - El botón "?" de la barra lo vuelve a abrir (evento "peli-recorrido").
// - Teclado: → o Enter = siguiente · ← = anterior · Esc = saltar. Respeta "reducir movimiento".
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RECORRIDOS, type Pantalla } from "./recorridos";

const LLAVE = (p: Pantalla) => `peli-recorrido-${p}-v1`;
const MARGEN = 8;
/** Solo un recorrido a la vez (el del perfil y el de su pestaña viven juntos). */
let ocupado: Pantalla | null = null;

/** El primer elemento que coincide y SÍ se ve (el menú existe dos veces: lateral y barra de abajo). */
function buscar(selector: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

/** Pide abrir el recorrido de la pantalla actual. Regresa false si esta pantalla no tiene. */
export function abrirRecorrido() {
  return !globalThis.dispatchEvent(new CustomEvent("peli-recorrido", { cancelable: true }));
}

export function Recorrido({ pantalla }: Readonly<{ pantalla: Pantalla }>) {
  const pasos = RECORRIDOS[pantalla];
  const [activo, setActivo] = useState(false);
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState<DOMRect | null>(null);
  const [ancho, setAncho] = useState(1024);
  const [alto, setAlto] = useState(768);
  // Tamaño REAL de la tarjeta (se mide después de pintarla): con él se decide dónde cabe sin tapar nada.
  // Se mide el contenido completo (cuerpo + pie), aunque la tarjeta esté limitada en alto y su cuerpo tenga scroll.
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);
  const [altoTarjeta, setAltoTarjeta] = useState(290);

  // Índices de los pasos que sí se pueden mostrar ahora.
  const visibles = useCallback(() => pasos.map((p, n) => (buscar(p.objetivo) ? n : -1)).filter((n) => n >= 0), [pasos]);

  const iniciar = useCallback(() => {
    if (ocupado && ocupado !== pantalla) return false;
    // La pantalla "Instala la app" tapa todo: el recorrido espera (si no alcanza, sale la próxima vez).
    if (document.querySelector("[data-bloquea-guia]")) return false;
    const v = visibles();
    if (!v.length) return false;
    ocupado = pantalla;
    setI(v[0]);
    setActivo(true);
    return true;
  }, [visibles, pantalla]);

  const terminar = useCallback(() => {
    if (ocupado === pantalla) ocupado = null;
    setActivo(false);
    try {
      localStorage.setItem(LLAVE(pantalla), "1");
    } catch {
      // sin almacenamiento: volverá a salir la próxima vez
    }
  }, [pantalla]);

  // Primera vez: espera a que la pantalla cargue sus datos (hasta ~5 s) y arranca.
  useEffect(() => {
    let visto = false;
    try {
      visto = !!localStorage.getItem(LLAVE(pantalla));
    } catch {
      visto = false;
    }
    if (visto) return;
    // Si otro recorrido está en curso, espera a que termine (no cuenta como intento).
    let intentos = 0;
    const t = setInterval(() => {
      if (ocupado && ocupado !== pantalla) return;
      intentos++;
      if (iniciar() || intentos > 20) clearInterval(t);
    }, 250);
    return () => {
      clearInterval(t);
      if (ocupado === pantalla) ocupado = null;
    };
  }, [pantalla, iniciar]);

  // El "?" de la barra lo reabre.
  useEffect(() => {
    // La pestaña se monta dentro del perfil: su efecto corre primero y gana; el perfil ve que ya se atendió.
    const alPedir = (e: Event) => {
      if (!e.defaultPrevented && iniciar()) e.preventDefault();
    };
    globalThis.addEventListener("peli-recorrido", alPedir);
    return () => globalThis.removeEventListener("peli-recorrido", alPedir);
  }, [iniciar]);

  // Mide el objetivo del paso actual (y lo trae a la vista).
  useLayoutEffect(() => {
    if (!activo) return;
    const el = buscar(pasos[i].objetivo);
    if (!el) return;
    const suave = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    // Pantalla chica o bajita (celular, celular acostado) o lo marcado es alto: se sube hasta arriba, bajo la
    // barra, y la tarjeta queda abajo o a un lado. En pantallas normales lo chico se centra.
    const z0 = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const r0 = el.getBoundingClientRect();
    const compacta = globalThis.innerWidth / z0 < 640 || globalThis.innerHeight / z0 < 560;
    // Los paneles tienen encabezado y menú fijos y el contenido hace scroll en [data-scroll-principal]
    // (shared/ui/PantallaApp.tsx); si no hay ese contenedor, se usa la ventana.
    const caja = el.closest<HTMLElement>("[data-scroll-principal]");
    if (compacta || r0.height > globalThis.innerHeight * 0.5) {
      if (caja) caja.scrollTo({ top: r0.top - caja.getBoundingClientRect().top + caja.scrollTop - 12, behavior: suave });
      else globalThis.scrollTo({ top: r0.top + globalThis.scrollY - 76, behavior: suave });
    } else el.scrollIntoView({ block: "center", behavior: suave });
    const medir = () => {
      // En pantallas grandes la app usa zoom (globals.css): las medidas del navegador vienen con zoom y el
      // recorrido se dibuja dentro de la página (también con zoom) → se dividen para que el borde caiga exacto.
      const z = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      const r = el.getBoundingClientRect();
      setCaja(new DOMRect(r.x / z, r.y / z, r.width / z, r.height / z));
      setAncho(globalThis.innerWidth / z);
      setAlto(globalThis.innerHeight / z);
    };
    medir();
    // El desplazamiento suave tarda: se vuelve a medir mientras se acomoda y al terminar.
    const tiempos = [150, 400, 800, 1300].map((ms) => setTimeout(medir, ms));
    globalThis.addEventListener("resize", medir);
    globalThis.addEventListener("scroll", medir, true);
    return () => {
      tiempos.forEach(clearTimeout);
      globalThis.removeEventListener("resize", medir);
      globalThis.removeEventListener("scroll", medir, true);
    };
  }, [activo, i, pasos]);

  useLayoutEffect(() => {
    // Alto natural: el cuerpo completo (scrollHeight, aunque esté recortado) + el pie fijo de botones.
    const h = (cuerpoRef.current?.scrollHeight ?? 0) + (pieRef.current?.offsetHeight ?? 0);
    if (h && Math.abs(h - altoTarjeta) > 2) setAltoTarjeta(h);
  }, [activo, i, ancho, alto, caja, altoTarjeta]);

  const v = activo ? visibles() : [];
  const pos = v.indexOf(i);
  const siguiente = useCallback(() => {
    const lista = visibles();
    const k = lista.indexOf(i);
    if (k < 0 || k >= lista.length - 1) terminar();
    else setI(lista[k + 1]);
  }, [i, visibles, terminar]);
  const anterior = useCallback(() => {
    const lista = visibles();
    const k = lista.indexOf(i);
    if (k > 0) setI(lista[k - 1]);
  }, [i, visibles]);

  useEffect(() => {
    if (!activo) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") terminar();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        siguiente();
      } else if (e.key === "ArrowLeft") anterior();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [activo, siguiente, anterior, terminar]);

  if (!activo || !caja || pos < 0) return null;
  const paso = pasos[i];
  const ultimo = pos === v.length - 1;
  const celular = ancho < 640;
  // Lo marcado, recortado a la pantalla: si quedó fuera de vista (página muy larga, cambio de tamaño…)
  // el hueco se reduce a la orilla y la tarjeta se coloca igual DENTRO de la pantalla, nunca fuera.
  const rl = Math.max(3, Math.min(caja.left, ancho - 3));
  const rt = Math.max(3, Math.min(caja.top, alto - 3));
  const rr = Math.max(rl, Math.min(caja.right, ancho - 3));
  const rb = Math.max(rt, Math.min(caja.bottom, alto - 3));
  const visible = rr - rl > 2 && rb - rt > 2;
  const base = visible
    ? {
        left: Math.max(3, rl - MARGEN),
        top: Math.max(3, rt - MARGEN),
        right: Math.min(ancho - 3, rr + MARGEN),
        bottom: Math.min(alto - 3, rb + MARGEN),
      }
    : { left: 3, top: 3, right: 3, bottom: 3 };

  // Dónde va la tarjeta (nunca encima de lo marcado), con su alto real:
  // 1) debajo o arriba de lo marcado (celular: pegada abajo o arriba de la pantalla);
  // 2) a un lado si cabe (el menú lateral);
  // 3) si no cabe completa, se coloca en el lado con más espacio y su cuerpo hace scroll (título y botones
  //    siempre visibles). Nunca se tapa lo marcado.
  // 4) solo si ni así hay espacio (pantalla diminuta) se recorta el borde de lo marcado.
  // Ancho fluido: en celular ocupa el ancho con margen; en tableta y monitor crece con la pantalla (300–380 px).
  const tarjeta = Math.max(0, Math.min(celular ? ancho - 24 : Math.min(380, Math.max(300, ancho * 0.27)), ancho - 24));
  const altoMax = Math.max(40, alto - 24);
  const H = Math.min(altoTarjeta, altoMax);
  const cabeAbajo = base.bottom + 14 + H <= alto - 12;
  const cabeArriba = base.top - 14 - H >= 12;
  const grande = base.bottom - base.top > alto * 0.55;
  const alineado = Math.max(12, Math.min(base.left + (base.right - base.left) / 2 > ancho / 2 ? base.right - tarjeta : base.left, ancho - tarjeta - 12));
  const arribaLado = Math.max(12, Math.min(base.top + 40, alto - H - 12));
  // Espacio libre real a cada lado de lo marcado (sin taparlo) y mínimo para que la tarjeta se pueda leer.
  const libreAbajo = Math.max(0, alto - 12 - (base.bottom + 14));
  const libreArriba = Math.max(0, base.top - 14 - 12);
  const MINIMO_TARJETA = 120;
  // Posición tentativa (esquina superior izquierda) y alto máximo de la tarjeta en cada caso.
  let x = 12;
  let y = 12;
  let maxAlto = altoMax;
  let recorteAbajo = base.bottom;
  let recorteDerecha = base.right;
  if (celular) {
    if (cabeAbajo) {
      y = alto - 12 - H;
      maxAlto = libreAbajo;
    } else if (cabeArriba) {
      y = 12;
      maxAlto = libreArriba;
    } else if (libreAbajo >= libreArriba && libreAbajo >= MINIMO_TARJETA) {
      y = base.bottom + 14;
      maxAlto = libreAbajo;
    } else if (libreArriba >= MINIMO_TARJETA) {
      y = 12;
      maxAlto = libreArriba;
    } else {
      y = alto - 12 - H;
      recorteAbajo = alto - 12 - H - 12;
    }
  } else if (!grande && cabeAbajo) {
    x = alineado;
    y = base.bottom + 14;
    maxAlto = libreAbajo;
  } else if (!grande && cabeArriba) {
    x = alineado;
    y = base.top - 14 - H;
    maxAlto = libreArriba;
  } else if (base.right + tarjeta + 24 < ancho) {
    x = base.right + 20;
    y = arribaLado;
    maxAlto = alto - arribaLado - 12;
  } else if (base.left - tarjeta - 24 > 0) {
    x = base.left - tarjeta - 20;
    y = arribaLado;
    maxAlto = alto - arribaLado - 12;
  } else if (libreAbajo >= libreArriba && libreAbajo >= MINIMO_TARJETA) {
    // No cabe completa, pero el hueco de abajo es el mayor: la tarjeta baja y su cuerpo hace scroll.
    x = alineado;
    y = base.bottom + 14;
    maxAlto = libreAbajo;
  } else if (libreArriba >= MINIMO_TARJETA) {
    x = alineado;
    y = 12;
    maxAlto = libreArriba;
  } else if (ancho - tarjeta - 36 > base.left + 80) {
    // Ancha y bajita (celular acostado, tablet): tarjeta a la derecha; se ilumina la parte izquierda.
    x = ancho - 12 - tarjeta;
    y = Math.max(12, (alto - H) / 2);
    recorteDerecha = ancho - 12 - tarjeta - 12;
  } else {
    x = alineado;
    y = alto - 12 - H;
    recorteAbajo = alto - 12 - H - 12;
  }
  // Último seguro: el alto real de la tarjeta y su caja siempre dentro de la pantalla (nada de "desbordes").
  maxAlto = Math.max(40, Math.min(maxAlto, altoMax));
  const hFin = Math.min(altoTarjeta, maxAlto);
  const xFin = Math.max(12, Math.min(x, ancho - 12 - tarjeta));
  const yFin = Math.max(12, Math.min(y, alto - 12 - hFin));
  const estilo: React.CSSProperties = { left: xFin, top: yFin, width: tarjeta };
  const hb2 = Math.max(base.top + 24, Math.min(base.bottom, recorteAbajo));
  const hr2 = Math.max(base.left + 24, Math.min(base.right, recorteDerecha));
  const hueco = visible
    ? { ...base, bottom: hb2, right: hr2, width: Math.max(0, hr2 - base.left), height: Math.max(0, hb2 - base.top) }
    : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  // En pantallas bajitas la tarjeta se aprieta (menos relleno y letra un poco más chica) para que quepa completa.
  const apretada = alto < 460;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="recorrido-titulo">
      {/* Todo oscuro menos el hueco del botón (4 bloques alrededor). Clic fuera no cierra: solo Saltar o Esc. */}
      {[
        { left: 0, top: 0, right: 0, height: Math.max(0, hueco.top) },
        { left: 0, top: hueco.bottom, right: 0, bottom: 0 },
        { left: 0, top: hueco.top, width: Math.max(0, hueco.left), height: hueco.height },
        { left: hueco.right, top: hueco.top, right: 0, height: hueco.height },
      ].map((st, k) => (
        <div key={k} aria-hidden="true" className="absolute transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ ...st, background: "color-mix(in srgb, var(--color-navy) 78%, transparent)" }} />
      ))}
      {/* Borde punteado alrededor del botón */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-[14px] outline-2 outline-dashed outline-offset-2 outline-white/90 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ left: hueco.left, top: hueco.top, width: hueco.width, height: hueco.height }}
      />
      <div key={i} ref={tarjetaRef} className="absolute flex animate-aparecer flex-col overflow-hidden rounded-[18px] bg-card text-white sombra-tarjeta ring-1 ring-gold/30" style={{ ...estilo, maxHeight: maxAlto }}>
        {/* El cuerpo hace scroll si el alto es corto; el título y los botones quedan siempre a la vista. */}
        <div ref={cuerpoRef} className={`flex flex-1 flex-col ${apretada ? "gap-2 p-3" : "gap-3 p-4"} overflow-y-auto`}>
          <div className="flex items-start justify-between gap-3">
            <h2 id="recorrido-titulo" className={`font-display ${apretada ? "text-lg" : "text-xl"} tracking-[1.5px] leading-tight text-gold`}>
              {paso.titulo}
            </h2>
            <span className="shrink-0 pt-1 text-xs font-semibold tabular-nums text-white/60">
              {pos + 1} / {v.length}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-white/90">{paso.texto}</p>
          {paso.consejo && (
            <p className={`rounded-[12px] bg-white/[0.07] px-3 ${apretada ? "py-2" : "py-2.5"} text-sm leading-relaxed text-white/80 ring-1 ring-white/10`}>
              <b className="text-gold">Consejo:</b> {paso.consejo}
            </p>
          )}
        </div>
        <div ref={pieRef} className={`flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-4 ${apretada ? "py-2" : "py-2.5"}`}>
          <button type="button" onClick={terminar} className="rounded-full px-2 py-2 text-sm font-semibold text-white/70 hover:text-white">
            Saltar
          </button>
          <div className="flex items-center gap-2">
            {pos > 0 && (
              <button type="button" onClick={anterior} className="rounded-full px-3 py-2 text-sm font-semibold text-white/80 ring-1 ring-white/20 hover:bg-white/10">
                Atrás
              </button>
            )}
            <button type="button" autoFocus onClick={siguiente} className="rounded-full bg-gold px-4 py-2 text-sm font-black text-navy transition-transform active:scale-95">
              {ultimo ? "Listo" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
