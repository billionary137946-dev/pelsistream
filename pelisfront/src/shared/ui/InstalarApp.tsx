"use client";

// "Instala la app" (PWA). Lógica copiada tal cual de HGC; solo cambia lo visual (navy + dorado). Dos formas:
// - tarjeta: aviso dentro de la pantalla. Con "Ahora no" (lo esconde 14 días) o fija (sin cerrar: se queda
//   hasta que la abra como app).
// - pantalla: OBLIGATORIA en celular. Cubre la app y no tiene "Ahora no". Sale CADA vez que se abre en el
//   navegador; "Ya la agregué" solo la deja pasar esa vez (sessionStorage). Instalada, ya no sale nunca.
//   Límites reales que se respetan para que nadie quede fuera para siempre:
//   · iPhone no deja instalar con botón ni saber si ya se hizo → guía + "Ya la agregué" (se confía en la persona).
//   · Navegador sin el aviso de instalar (Firefox, Samsung…) → guía del menú ⋮ + "Ya la instalé".
//   · No se obliga en computadora, en http://192.168… (ahí no se puede instalar) ni en localhost (?instalar=1 la muestra).
// La detección y el aviso atrapado viven en shared/lib/pwa.ts.
import { useEffect, useState } from "react";
import {
  esCelular,
  esIphone,
  esLocal,
  forzarVista,
  iphoneFueraDeSafari,
  linkChrome,
  navegadorAndroid,
  PASOS_MENU,
  registrarServicio,
  sePuedeInstalar,
  useInstalacion,
  yaInstalada,
  type NavegadorAndroid,
} from "@/shared/lib/pwa";

const LLAVE_OCULTO = "peli-instalar-oculto";
const LLAVE_LISTO = "peli-instalar-listo";
const DIAS_OCULTO = 14;

// Variantes de botón (las mismas tres de HGC, con los colores de Pelis).
const BOTON = {
  dorado:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-2 text-navy font-black transition-transform active:scale-[.98]",
  vidrio:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 text-white font-bold ring-1 ring-white/20 hover:bg-white/15",
  suave: "rounded-full px-4 py-3 text-sm font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline",
} as const;
const TAMANO = { chico: "px-4 py-2 text-sm", grande: "w-full px-5 py-3.5 text-base" } as const;

// "Ahora no" se recuerda en este dispositivo (localStorage); "Ya la agregué", solo mientras esté abierta (sessionStorage).
function leer(llave: string, donde: "local" | "sesion" = "local") {
  try {
    return (donde === "local" ? localStorage : sessionStorage).getItem(llave);
  } catch {
    return null;
  }
}
function guardar(llave: string, valor: string, donde: "local" | "sesion" = "local") {
  try {
    (donde === "local" ? localStorage : sessionStorage).setItem(llave, valor);
  } catch {
    // sin almacenamiento: solo vale por ahora
  }
}

/** Ícono "Compartir" de Safari (cuadro con flecha hacia arriba). */
function IconoCompartir() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="-mt-1 inline size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

type Props = Readonly<{ nombre: string; forma?: "tarjeta" | "pantalla"; /** Tarjeta sin "Ahora no": se queda hasta instalar. */ fija?: boolean; className?: string }>;

/** nombre = cómo se llama la app instalada (ej. "PeliStreams"). */
export function InstalarApp({ forma = "tarjeta", ...props }: Props) {
  return forma === "pantalla" ? <PantallaInstalar {...props} /> : <TarjetaInstalar {...props} />;
}

/* ───────────── Tarjeta (con "Ahora no") ───────────── */

function TarjetaInstalar({ nombre, fija = false, className = "" }: Omit<Props, "forma">) {
  const { evento, instaladaAhora, gastar } = useInstalacion();
  const [visible, setVisible] = useState(false);
  const [celular, setCelular] = useState(false);
  const [nav, setNav] = useState<NavegadorAndroid>("chrome");

  useEffect(() => {
    registrarServicio();
    const t = setTimeout(() => {
      setCelular(esCelular());
      setNav(navegadorAndroid() ?? "chrome");
      setVisible(!yaInstalada() && (fija || Date.now() >= Number(leer(LLAVE_OCULTO) ?? 0)));
    }, 0);
    return () => clearTimeout(t);
  }, [fija]);

  const iphone = visible && esIphone();
  // Sin botón ni iPhone: solo se muestra (con la guía del menú) si es fija y en celular.
  if (!visible || instaladaAhora || (!evento && !iphone && !(fija && celular))) return null;

  const ahoraNo = () => {
    guardar(LLAVE_OCULTO, String(Date.now() + DIAS_OCULTO * 86_400_000));
    setVisible(false);
  };
  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    gastar();
    if (outcome === "accepted") setVisible(false);
  };

  return (
    <section
      aria-label="Instalar la app"
      className={`relative flex items-start gap-3 overflow-hidden rounded-2xl bg-card border border-gold/30 p-4 text-white sombra-tarjeta ${className}`}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gold/20 blur-2xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="relative size-11 shrink-0 rounded-xl" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p className="font-bold">Instala {nombre} en tu celular</p>
          {evento && <p className="text-sm text-white/70">Ábrela como app, en pantalla completa y con un toque.</p>}
          {!evento && iphone && (
            <p className="text-sm text-white/70">
              {iphoneFueraDeSafari() ? (
                <>
                  Ábrela en <b className="text-white">Safari</b> y toca{" "}
                </>
              ) : (
                <>Toca </>
              )}
              <IconoCompartir /> <b className="text-white">Compartir</b> → <b className="text-white">“Agregar a inicio”</b>.
            </p>
          )}
          {!evento && !iphone && (
            <p className="text-sm text-white/70">
              {PASOS_MENU[nav].map(([a, b], k) => (
                <span key={b}>
                  {k > 0 && " → "}
                  {a}
                  <b className="text-white">{b}</b>
                </span>
              ))}
              .
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 empty:hidden">
          {!evento && !iphone && nav !== "chrome" && (
            <a href={linkChrome()} className={`${BOTON.dorado} ${TAMANO.chico}`}>
              Abrir en Chrome
            </a>
          )}
          {evento && (
            <button type="button" onClick={() => void instalar()} className={`${BOTON.dorado} ${TAMANO.chico}`}>
              Instalar
            </button>
          )}
          {!fija && (
            <button type="button" onClick={ahoraNo} className="rounded-full px-3 py-2 text-sm font-semibold text-white/70 hover:text-white">
              Ahora no
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────── Pantalla obligatoria ───────────── */

const VENTAJAS: { icono: string; texto: string }[] = [
  { icono: "⚡", texto: "Entras con un toque, sin buscar el link" },
  { icono: "📱", texto: "Pantalla completa, como una app de verdad" },
  { icono: "🎯", texto: "Registras y revisas tus jugadas más rápido en el palenque" },
];

function PantallaInstalar({ nombre, className = "" }: Omit<Props, "forma">) {
  const { evento, instaladaAhora, gastar } = useInstalacion();
  const [visible, setVisible] = useState(false);
  const [caso, setCaso] = useState<"safari" | "otro-iphone" | "android">("android");
  const [rechazo, setRechazo] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [nav, setNav] = useState<NavegadorAndroid>("chrome");

  useEffect(() => {
    registrarServicio();
    const t = setTimeout(() => {
      setNav(navegadorAndroid() ?? "chrome");
      const toca = forzarVista() || (esCelular() && sePuedeInstalar() && !esLocal());
      setVisible(toca && !yaInstalada() && (forzarVista() || !leer(LLAVE_LISTO, "sesion")));
      if (iphoneFueraDeSafari()) setCaso("otro-iphone");
      else if (esIphone()) setCaso("safari");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const listo = () => {
    guardar(LLAVE_LISTO, "1", "sesion");
    setVisible(false);
  };
  const instalar = async () => {
    if (!evento) return;
    setRechazo(false);
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    gastar();
    if (outcome !== "accepted") setRechazo(true);
  };
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(globalThis.location.origin + globalThis.location.pathname);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  // Qué se muestra abajo: recién instalada · iPhone fuera de Safari · iPhone en Safari · botón de instalar · guía del menú.
  let vista: "lista" | "otro-iphone" | "safari" | "boton" | "menu" = "menu";
  if (instaladaAhora) vista = "lista";
  else if (caso !== "android") vista = caso;
  else if (evento) vista = "boton";

  const boton = `${BOTON.dorado} ${TAMANO.grande}`;
  const botonVidrio = `${BOTON.vidrio} ${TAMANO.grande}`;

  return (
    <section
      data-bloquea-guia
      aria-labelledby="instalar-titulo"
      className={`fixed inset-0 z-[90] overflow-y-auto overflow-x-hidden overscroll-contain bg-navy text-white ${className}`}
    >
      {/* Luces de fondo */}
      <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-gold/20 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full bg-border/60 blur-3xl" />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-7 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-center">
        {/* Ícono de la app, flotando */}
        <div className="relative animate-aparecer">
          <span aria-hidden="true" className="absolute inset-0 scale-125 rounded-[30px] bg-gold/30 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={96} height={96} className="relative size-24 animate-flotar rounded-[26px] sombra-dorada ring-1 ring-white/15" />
        </div>

        <div className="animate-aparecer [animation-delay:80ms]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80 ring-1 ring-white/15">
            ⚡ Último paso
          </span>
          <h1 id="instalar-titulo" className="mt-3 font-display text-gold text-[34px] leading-none tracking-[2px]">
            Instala {nombre} en tu celular
          </h1>
          <p className="mx-auto mt-3 max-w-[280px] text-sm leading-relaxed text-white/70">Tu cuenta vive en la app. Instálala para entrar.</p>
        </div>

        <ul className="flex w-full flex-col gap-2.5 animate-aparecer [animation-delay:160ms]">
          {VENTAJAS.map((v) => (
            <li key={v.texto} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3.5 py-3 text-left text-sm ring-1 ring-white/10">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-lg">
                {v.icono}
              </span>
              <span className="text-white/90">{v.texto}</span>
            </li>
          ))}
        </ul>

        <div className="flex w-full flex-col items-center gap-3 animate-aparecer [animation-delay:240ms]">
          {vista === "lista" && (
            <>
              <p className="flex items-center gap-2 font-bold">
                <span className="grid size-7 place-items-center rounded-full bg-green-500 text-white">✓</span> ¡Lista! Ábrela desde tu pantalla de inicio.
              </p>
              <button type="button" onClick={listo} className={BOTON.suave}>
                Continuar aquí
              </button>
            </>
          )}
          {vista === "otro-iphone" && (
            <>
              <Pasos pasos={[<>Copia el link de tu app</>, <>Ábrelo en <b>Safari</b>: en iPhone solo Safari puede instalarla</>]} />
              <button type="button" onClick={() => void copiar()} className={boton}>
                {copiado ? "✓ Link copiado" : "🔗 Copiar link"}
              </button>
              <button type="button" onClick={listo} className={BOTON.suave}>
                Ya la agregué
              </button>
            </>
          )}
          {vista === "safari" && (
            <>
              <Pasos
                pasos={[
                  <>
                    Toca <IconoCompartir /> <b>Compartir</b> en la barra de Safari
                  </>,
                  <>
                    Elige <b>“Agregar a inicio”</b> y luego <b>Agregar</b>
                  </>,
                ]}
              />
              <button type="button" onClick={listo} className={botonVidrio}>
                Ya la agregué
              </button>
            </>
          )}
          {vista === "boton" && (
            <button type="button" onClick={() => void instalar()} className={boton}>
              📱 Instalar {nombre}
            </button>
          )}
          {vista === "menu" && (
            <>
              {/* Canceló el aviso: el navegador no deja mostrarlo otra vez en esta carga → recargar o hacerlo desde el menú. */}
              {rechazo && (
                <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-gold/10 px-4 py-3 text-sm ring-1 ring-gold/40">
                  <p className="font-bold">Necesitas aceptar la instalación para entrar.</p>
                  <button type="button" onClick={() => globalThis.location.reload()} className={`${BOTON.dorado} ${TAMANO.chico}`}>
                    Intentar de nuevo
                  </button>
                </div>
              )}
              <Pasos
                pasos={PASOS_MENU[nav].map(([a, b]) => (
                  <>
                    {a}
                    <b>{b}</b>
                  </>
                ))}
              />
              {/* Fuera de Chrome: abrirla en Chrome da el botón "Instalar" de un toque. */}
              {nav !== "chrome" && (
                <a href={linkChrome()} className={boton}>
                  Abrir en Chrome
                </a>
              )}
              <button type="button" onClick={listo} className={botonVidrio}>
                Ya la instalé
              </button>
            </>
          )}
        </div>
      </div>

      {/* iPhone: flecha que apunta al botón Compartir de Safari (abajo al centro) */}
      {vista === "safari" && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 grid size-10 -translate-x-1/2 animate-flotar place-items-center rounded-full bg-gold text-navy text-xl font-black sombra-dorada"
        >
          ↓
        </span>
      )}
    </section>
  );
}

function Pasos({ pasos }: Readonly<{ pasos: React.ReactNode[] }>) {
  return (
    <ol className="flex w-full flex-col gap-2 text-left">
      {pasos.map((p, i) => (
        // La lista es fija (no cambia de orden): el número de paso sirve de llave.
        <li key={`paso-${i + 1}`} className="flex items-start gap-3 rounded-2xl bg-white/[0.06] px-3.5 py-3 text-sm leading-relaxed text-white/90 ring-1 ring-white/10">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold text-xs font-black text-navy">{i + 1}</span>
          <span>{p}</span>
        </li>
      ))}
    </ol>
  );
}
