// Panel del operador: registrar apuestas/quinielas, cerrar palenques,
// revisar historial y editar apuestas pendientes (ver v.2/funcionamiento.txt,
// sección 3 "OPERADOR"; y operador.html para el detalle exacto de UI que
// esta pantalla reproduce).
//
// Sistema de 5 "slots" en paralelo, igual que v2: cada slot recuerda su
// propio tipo (Apuesta/Quiniela) y datos, para poder tener varios palenques
// o una quiniela abiertos a la vez y cambiar entre ellos sin perder nada.
// Quiniela solo existe en el slot 1 (nunca en paralelo con otra quiniela).
//
// El buscador de cliente NUNCA permite texto libre: el botón de color solo
// se habilita si se eligió un cliente real de la lista de sugerencias (ver
// funcionamiento.txt, sección 6) — el negocio del cliente lo valida el
// backend, nunca se confía en lo que ya se ve en pantalla.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSesion } from "@/shared/lib/useSesion";
import { api, ErrorApi } from "@/shared/lib/api";
import { PanelHeader } from "@/shared/ui/PanelHeader";
import { BottomNav } from "@/shared/ui/BottomNav";
import { Campo } from "@/shared/ui/Campo";
import { Toast, type DatosToast } from "@/shared/ui/Toast";
import { LIMITES, limpiarDigitos, limpiarTexto, soloDigitos } from "@/shared/lib/inputs";
import { InstalarApp } from "@/shared/ui/InstalarApp";

interface ClienteBusqueda {
  celular: string;
  alias: string;
  saldo: number;
  limite_credito: number;
}

interface DetalleApuesta {
  alias: string;
  color: string;
  monto: number;
}

interface EventoAbierto {
  evento: string;
  apuestas: number;
  vol_rojo: number;
  vol_verde: number;
  equipo_rojo: string | null;
  equipo_verde: string | null;
  detalle: DetalleApuesta[];
}

interface Jugada {
  id: number;
  evento: string;
  cliente_celular: string;
  color: string;
  monto: number;
  resultado: string;
  neto: number | null;
  fecha: string;
}

interface Apostador {
  nombre: string;
  lugar: number;
  ganador: boolean;
  pts: string;
  carta: string;
}

interface Slot {
  tipo: "Apuesta" | "Quiniela";
  nombre: string;
  numJugada: string;
  rojo: string;
  verde: string;
  invertido: boolean;
  montoLugar: string;
  lugares: string;
  subTipoQuiniela: string;
  iniciada: boolean;
  apostadores: Apostador[];
  cerrando: boolean;
  intentoCierreId: string | null;
}

const TIPOS_QUINIELA = ["Ventaja", "Quiniela", "Mano a mano", "Pares y nones"];

function slotVacio(): Slot {
  return {
    tipo: "Apuesta",
    nombre: "",
    numJugada: "",
    rojo: "",
    verde: "",
    invertido: false,
    montoLugar: "",
    lugares: "",
    subTipoQuiniela: "Quiniela",
    iniciada: false,
    apostadores: [],
    cerrando: false,
    intentoCierreId: null,
  };
}

// El "evento" que viaja al backend combina palenque + N# jugada, para que
// dos jugadas del mismo palenque con número distinto se cierren por
// separado (si no llevan número, el palenque completo es un solo evento).
function eventoDeSlot(s: Slot): string {
  return s.numJugada ? `${s.nombre} #${s.numJugada}` : s.nombre;
}

// Inverso de eventoDeSlot -- para reconstruir nombre/numJugada de un evento
// que ya existe en el backend (abierto en otra sesión, otro dispositivo, o
// antes de recargar la página) y así poder representarlo en un slot local.
function partesDeEvento(evento: string): { nombre: string; numJugada: string } {
  const m = evento.match(/^(.*) #(\d+)$/);
  return m ? { nombre: m[1], numJugada: m[2] } : { nombre: evento, numJugada: "" };
}

function generarIntentoId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `intento-${Date.now()}-${Math.random()}`;
}

type Tab = "jugadas" | "historial";
type ResultadoEvento = "rojo" | "verde" | "empate" | "cancelada";

export default function PanelOperador() {
  const { sesion, cargando } = useSesion("operador");
  const [tab, setTab] = useState<Tab>("jugadas");

  const [clientes, setClientes] = useState<ClienteBusqueda[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [clienteElegido, setClienteElegido] = useState<ClienteBusqueda | null>(null);
  const [monto, setMonto] = useState("");
  const [intentoId, setIntentoId] = useState(generarIntentoId());
  const [enviando, setEnviando] = useState(false);
  const [conexionLenta, setConexionLenta] = useState(false);
  const [mensaje, setMensaje] = useState<DatosToast | null>(null);
  // Números de palenque ya usados, por nombre de palenque (para avisar si se repite).
  const [numerosUsados, setNumerosUsados] = useState<{ nombre: string; numeros: string[] } | null>(null);
  const [jugadaError, setJugadaError] = useState("");

  // ── Slots en paralelo ──
  const [slots, setSlots] = useState<Slot[]>(() => [
    slotVacio(),
    slotVacio(),
    slotVacio(),
    slotVacio(),
    slotVacio(),
  ]);
  const [slotActivo, setSlotActivo] = useState(0);
  const [slotsRevelados, setSlotsRevelados] = useState([true, false, false, false, false]);
  // Nombres de equipo por evento -- JUGADAS no tiene columnas para esto, así
  // que solo vive en memoria del navegador mientras dure la sesión (igual
  // que _nombresEquipos en v2).
  const [nombresEquipos, setNombresEquipos] = useState<
    Record<string, { rojo: string; verde: string; invertido: boolean }>
  >({});

  const [eventosAbiertos, setEventosAbiertos] = useState<EventoAbierto[]>([]);
  // Los palenques abiertos se muestran como pestañas (una tarjeta a la vez)
  // en vez de apilados -- con varios abiertos en paralelo, apilar todo
  // desbordaba la pantalla hacia abajo sin límite.
  const [palenqueTabActivo, setPalenqueTabActivo] = useState<string | null>(null);
  const [modalResultado, setModalResultado] = useState<{
    evento: string;
    datos: EventoAbierto;
    rojoNombre: string;
    verdeNombre: string;
  } | null>(null);
  const [resultadoElegido, setResultadoElegido] = useState<ResultadoEvento | null>(null);

  const [apostadorNombre, setApostadorNombre] = useState("");
  const [apostadorPts, setApostadorPts] = useState("");
  const [apostadorCarta, setApostadorCarta] = useState("");
  const [quinielaError, setQuinielaError] = useState("");

  const [historial, setHistorial] = useState<Jugada[]>([]);
  const [filtroHistorial, setFiltroHistorial] = useState<"todas" | "pendientes">("todas");
  const [apuestaAEditar, setApuestaAEditar] = useState<Jugada | null>(null);

  const slotActivoObj = slots[slotActivo];
  const quinielaEnSlot1 = slots[0].tipo === "Quiniela";
  const paso: "definir" | "apuesta" | "quiniela" = !slotActivoObj.iniciada
    ? "definir"
    : slotActivoObj.tipo === "Quiniela"
      ? "quiniela"
      : "apuesta";

  function actualizarSlot(indice: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((s, i) => (i === indice ? { ...s, ...patch } : s)));
  }
  function actualizarSlotActivo(patch: Partial<Slot>) {
    actualizarSlot(slotActivo, patch);
  }
  function revelarSiguienteSlot(indice: number) {
    setSlotsRevelados((prev) => {
      if (indice + 1 >= prev.length || prev[indice + 1]) return prev;
      const siguiente = [...prev];
      siguiente[indice + 1] = true;
      return siguiente;
    });
  }

  // Cada una atrapa su propio error -- así un token vencido o cualquier
  // falla de red queda como un mensaje manejable en pantalla en vez de un
  // "Runtime Error" de Next.js.
  // silencioso=true cuando se llama justo después de una acción que YA
  // mostró su propio toast de éxito -- si no, un hipo aquí podía pisar el
  // "registrada con éxito" que el usuario acababa de ver.
  async function cargarClientes(silencioso = false) {
    try {
      setClientes(await api.get<ClienteBusqueda[]>("/operador/clientes"));
    } catch (e) {
      if (!silencioso) {
        setMensaje({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo cargar la lista de clientes." });
      }
    }
  }
  async function cargarEventos(silencioso = false) {
    try {
      const r = await api.get<{ eventos: EventoAbierto[] }>("/operador/eventos-abiertos");
      setEventosAbiertos(r.eventos);
    } catch (e) {
      if (!silencioso) {
        setMensaje({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudieron cargar los eventos." });
      }
    }
  }
  async function cargarHistorial(silencioso = false) {
    try {
      const r = await api.get<{ jugadas: Jugada[] }>("/operador/historial");
      setHistorial(r.jugadas);
    } catch (e) {
      if (!silencioso) {
        setMensaje({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo cargar el historial." });
      }
    }
  }

  // Solo la primera vez que hay sesión (useSesion primero pone la sesión
  // guardada en localStorage y luego la reemplaza por la revalidada contra
  // el backend -- sin este candado, esto se disparaba dos veces seguidas).
  const yaCargado = useRef(false);
  useEffect(() => {
    if (!sesion || yaCargado.current) return;
    yaCargado.current = true;
    cargarClientes();
    cargarEventos();
    cargarHistorial();
  }, [sesion]);

  // Valida el número de palenque en cuanto el operador termina de escribir
  // nombre + número -- con debounce para no pegarle al backend en cada tecla.
  const nombrePalenque = slotActivoObj.nombre.trim();
  const numeroPalenque = slotActivoObj.numJugada.trim();
  const esApuesta = slotActivoObj.tipo === "Apuesta";
  // Derivado (no estado): solo cuenta si la lista consultada es del palenque que se está escribiendo.
  const numeroRepetido =
    esApuesta &&
    nombrePalenque !== "" &&
    numeroPalenque !== "" &&
    numerosUsados?.nombre === nombrePalenque &&
    numerosUsados.numeros.includes(numeroPalenque);

  useEffect(() => {
    if (!esApuesta || !nombrePalenque || !numeroPalenque) return;
    const temporizador = setTimeout(async () => {
      try {
        const r = await api.get<{ numeros: string[] }>(
          `/operador/numeros-usados?nombre_palenque=${encodeURIComponent(nombrePalenque)}`,
        );
        setNumerosUsados({ nombre: nombrePalenque, numeros: r.numeros });
      } catch {
        // si falla la validación, no bloquea el flujo -- el backend igual
        // no impide registrar, esto es solo un aviso preventivo
      }
    }, 400);
    return () => clearTimeout(temporizador);
  }, [esApuesta, nombrePalenque, numeroPalenque]);

  // Coordina la barra de slots con la realidad del backend: un palenque
  // abierto en otra sesión (u olvidado tras recargar la página, ya que los
  // slots son memoria local del navegador) no aparecía en la barra de
  // arriba aunque sí estuviera en "Palenques abiertos". Acomoda cada evento
  // huérfano en el primer slot realmente vacío (sin iniciar y sin texto sin
  // guardar) para no pisar lo que el operador esté escribiendo.
  useEffect(() => {
    // Sincroniza con datos externos (eventos del backend); el updater funcional evita pisar lo que se escribe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots((prevSlots) => {
      const nuevos = [...prevSlots];
      const revelar: number[] = [];
      let cambio = false;

      for (const ev of eventosAbiertos) {
        const yaRepresentado = nuevos.some(
          (s) => s.tipo === "Apuesta" && s.iniciada && eventoDeSlot(s) === ev.evento,
        );
        if (yaRepresentado) continue;

        const idxLibre = nuevos.findIndex(
          (s, i) =>
            !s.iniciada &&
            s.nombre.trim() === "" &&
            s.numJugada.trim() === "" &&
            !(i === 0 && nuevos[0].tipo === "Quiniela"),
        );
        if (idxLibre === -1) continue; // sin espacio: esa jugada solo se ve en "Palenques abiertos"

        const { nombre, numJugada } = partesDeEvento(ev.evento);
        nuevos[idxLibre] = {
          ...slotVacio(),
          tipo: "Apuesta",
          nombre,
          numJugada,
          rojo: ev.equipo_rojo ?? "",
          verde: ev.equipo_verde ?? "",
          iniciada: true,
        };
        revelar.push(idxLibre);
        cambio = true;
      }

      if (!cambio) return prevSlots;
      setSlotsRevelados((prev) => {
        const siguiente = [...prev];
        revelar.forEach((i) => {
          siguiente[i] = true;
        });
        return siguiente;
      });
      return nuevos;
    });
  }, [eventosAbiertos]);

  const sugerencias =
    busqueda.length > 0
      ? clientes.filter(
          (c) =>
            c.alias.toLowerCase().includes(busqueda.toLowerCase()) || c.celular.includes(busqueda),
        )
      : [];

  // Mismo rango que v2 (operador.html: apMonto/quMontoLugar min=500 max=1000000)
  // y que el backend -- se valida aquí también para deshabilitar los botones
  // ANTES de mandar la petición, no solo después.
  const montoNum = Number(monto);
  const montoValido = monto !== "" && montoNum >= 500 && montoNum <= 1_000_000;
  const montoLugarNum = Number(slotActivoObj.montoLugar);
  const montoLugarValido =
    slotActivoObj.montoLugar !== "" && montoLugarNum >= 500 && montoLugarNum <= 1_000_000;

  // Un palenque solo se puede cerrar si ya hay apuestas de los DOS colores
  // -- si solo apostaron a uno, todavía no hay contra quién cerrar (mismo
  // candado que ya se agregó en el backend, esto solo evita el viaje al
  // servidor para que el error se vea antes de intentar).
  const eventoActivoDatos = eventosAbiertos.find((e) => e.evento === eventoDeSlot(slotActivoObj));
  const puedeCerrarApuesta = !!eventoActivoDatos && eventoActivoDatos.vol_rojo > 0 && eventoActivoDatos.vol_verde > 0;

  function elegirTipo(tipo: "Apuesta" | "Quiniela") {
    // La Quiniela solo existe una a la vez y siempre en el slot 1 -- nunca
    // en paralelo con otra. Cambiar de tipo siempre reinicia el paso de ESE
    // slot a "definir", aunque ya tuviera una jugada del otro tipo iniciada.
    const indice = tipo === "Quiniela" ? 0 : slotActivo;
    setSlotActivo(indice);
    setJugadaError("");
    actualizarSlot(indice, { tipo, iniciada: false });
  }

  function elegirSlot(indice: number) {
    setSlotActivo(indice);
    setJugadaError("");
  }

  function cambiarPosicion() {
    actualizarSlotActivo({ invertido: !slotActivoObj.invertido });
  }

  function iniciarJugada() {
    const s = slotActivoObj;
    if (s.tipo === "Quiniela") {
      if (!s.nombre.trim()) {
        setJugadaError("Ponle un nombre a la quiniela antes de iniciar.");
        return;
      }
      if (!montoLugarValido) {
        setJugadaError("El monto por lugar debe ser entre $500 y $1,000,000.");
        return;
      }
      setJugadaError("");
      actualizarSlotActivo({ iniciada: true, apostadores: [], cerrando: false, intentoCierreId: null });
      revelarSiguienteSlot(slotActivo);
      return;
    }

    const nombre = s.nombre.trim();
    const numero = s.numJugada.trim();
    if (!nombre) {
      setJugadaError("Ponle un nombre a la apuesta antes de iniciar.");
      return;
    }
    if (numeroRepetido) {
      setJugadaError(`Ya existe la jugada número ${numero} para el palenque "${nombre}".`);
      return;
    }
    // El N# de jugada no se puede repetir para el MISMO palenque -- primero
    // se revisa contra los otros slots activos en este navegador.
    if (numero) {
      const yaExisteLocal = slots.some(
        (otro, idx) =>
          idx !== slotActivo &&
          otro.iniciada &&
          otro.tipo === "Apuesta" &&
          otro.nombre === nombre &&
          otro.numJugada === numero,
      );
      if (yaExisteLocal) {
        setJugadaError(`Ya existe la jugada número ${numero} para el palenque "${nombre}".`);
        return;
      }
    }
    setJugadaError("");

    const evento = eventoDeSlot(s);
    setNombresEquipos((prev) => ({ ...prev, [evento]: { rojo: s.rojo, verde: s.verde, invertido: s.invertido } }));
    actualizarSlotActivo({ iniciada: true });
    revelarSiguienteSlot(slotActivo);
    setClienteElegido(null);
    setBusqueda("");
    setMonto("");
  }

  function volverALaJugada() {
    actualizarSlotActivo({ iniciada: false });
  }

  async function apostar(color: "rojo" | "verde") {
    if (!clienteElegido || !montoValido) return;
    const evento = eventoDeSlot(slotActivoObj);
    setEnviando(true);
    setMensaje(null);
    const avisoLento = setTimeout(() => setConexionLenta(true), 9000);

    try {
      await api.post("/apuestas", {
        intento_id: intentoId,
        evento,
        cliente_celular: clienteElegido.celular,
        color,
        monto: Number(monto),
        // Se manda en cada apuesta (no solo la primera) para que si el
        // nombre del equipo no quedó guardado en jugadas anteriores de este
        // mismo evento, se rellene con la siguiente que sí lo traiga.
        equipo_rojo: slotActivoObj.rojo || undefined,
        equipo_verde: slotActivoObj.verde || undefined,
      });
      // Se limpian cliente y monto pero se queda en el mismo palenque -- así
      // el operador sigue registrando apuestas de otros clientes contra la
      // misma jugada sin repetir nada.
      setClienteElegido(null);
      setBusqueda("");
      setMonto("");
      setIntentoId(generarIntentoId()); // libera el intento_id, la siguiente apuesta es nueva
      await Promise.all([cargarClientes(true), cargarEventos(true), cargarHistorial(true)]);
      setMensaje({ tipo: "ok", texto: `Apuesta ${color} registrada a ${clienteElegido.alias}.` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo registrar." });
    } finally {
      clearTimeout(avisoLento);
      setConexionLenta(false);
      setEnviando(false);
    }
  }

  // ── Quiniela activa: agregar apostadores y cerrar ──
  function agregarApostador() {
    const s = slotActivoObj;
    const nombre = apostadorNombre.trim();
    if (!nombre) {
      setQuinielaError("Escribe el nombre del apostador.");
      return;
    }
    const maxLugares = parseInt(s.lugares, 10) || 0;
    if (maxLugares && s.apostadores.length >= maxLugares) {
      setQuinielaError(`Ya se llenaron los ${maxLugares} lugares.`);
      return;
    }
    setQuinielaError("");
    const esPares = s.subTipoQuiniela === "Pares y nones";
    const nuevo: Apostador = {
      nombre,
      lugar: s.apostadores.length + 1,
      ganador: false,
      pts: esPares ? apostadorPts : "",
      carta: esPares ? apostadorCarta.trim() : "",
    };
    actualizarSlotActivo({ apostadores: [...s.apostadores, nuevo] });
    setApostadorNombre("");
    setApostadorPts("");
    setApostadorCarta("");
  }

  function toggleGanadorApostador(indice: number) {
    const s = slotActivoObj;
    if (!s.cerrando) return;
    const apostadores = s.apostadores.map((a, i) => (i === indice ? { ...a, ganador: !a.ganador } : a));
    actualizarSlotActivo({ apostadores });
  }

  function iniciarCierreQuiniela() {
    const s = slotActivoObj;
    if (!s.apostadores.length) {
      setQuinielaError("Agrega al menos un apostador antes de cerrar.");
      return;
    }
    setQuinielaError("");
    if (!s.cerrando) {
      actualizarSlotActivo({ cerrando: true });
      return;
    }
    confirmarCierreQuiniela();
  }

  async function confirmarCierreQuiniela() {
    const s = slotActivoObj;
    // Mismo intento_id mientras se reintente ESTE cierre -- si la conexión
    // se corta a medio camino y el operador vuelve a tocar "Confirmar
    // cierre", el backend reconoce que ya pagó esta quiniela y no la paga
    // dos veces.
    const intentoIdQuiniela = s.intentoCierreId ?? generarIntentoId();
    if (!s.intentoCierreId) actualizarSlotActivo({ intentoCierreId: intentoIdQuiniela });

    setEnviando(true);
    try {
      await api.post("/quinielas", {
        intento_id: intentoIdQuiniela,
        nombre: s.nombre,
        sub_tipo: s.subTipoQuiniela,
        monto_lugar: Number(s.montoLugar),
        apostadores: s.apostadores.map((a) => ({
          nombre: a.nombre,
          lugar: a.lugar,
          ganador: a.ganador,
          pts: a.pts,
          carta: a.carta,
        })),
      });
      setSlots((prev) => prev.map((sl, i) => (i === slotActivo ? slotVacio() : sl)));
      await cargarHistorial(true);
      setMensaje({ tipo: "ok", texto: `Quiniela "${s.nombre}" cerrada.` });
    } catch (e) {
      // Se deja "cerrando" en true a propósito -- así el botón sigue en
      // "Confirmar cierre" y el operador puede reintentar con el MISMO
      // intento_id sin volver a marcar ganadores.
      setMensaje({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo cerrar la quiniela." });
    } finally {
      setEnviando(false);
    }
  }

  // ── Modal "¿Quién ganó?" ──
  function abrirModalResultado() {
    const s = slotActivoObj;
    const evento = eventoDeSlot(s);
    const datos =
      eventosAbiertos.find((e) => e.evento === evento) ?? {
        evento,
        apuestas: 0,
        vol_rojo: 0,
        vol_verde: 0,
        equipo_rojo: null,
        equipo_verde: null,
        detalle: [],
      };
    setModalResultado({ evento, datos, rojoNombre: s.rojo || "Rojo", verdeNombre: s.verde || "Verde" });
    setResultadoElegido(null);
  }

  async function confirmarResultado() {
    if (!modalResultado || !resultadoElegido) return;
    setEnviando(true);
    try {
      await api.post(`/eventos/${encodeURIComponent(modalResultado.evento)}/cerrar`, {
        color_ganador: resultadoElegido,
      });
      setSlots((prev) => prev.map((sl, i) => (i === slotActivo ? slotVacio() : sl)));
      setModalResultado(null);
      setResultadoElegido(null);
      await Promise.all([cargarEventos(true), cargarHistorial(true), cargarClientes(true)]);
      setMensaje({ tipo: "ok", texto: `"${modalResultado.evento}" cerrado (${resultadoElegido}).` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo cerrar." });
    } finally {
      setEnviando(false);
    }
  }

  async function guardarEdicion(montoNuevo: number, colorNuevo: "rojo" | "verde") {
    if (!apuestaAEditar) return;
    setEnviando(true);
    try {
      await api.put(`/apuestas/${apuestaAEditar.id}`, { monto_nuevo: montoNuevo, color_nuevo: colorNuevo });
      setApuestaAEditar(null);
      await cargarHistorial(true);
      setMensaje({ tipo: "ok", texto: "Apuesta actualizada." });
    } catch (e) {
      setMensaje({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo editar." });
    } finally {
      setEnviando(false);
    }
  }

  const historialFiltrado = useMemo(
    () => (filtroHistorial === "pendientes" ? historial.filter((j) => j.resultado === "") : historial),
    [historial, filtroHistorial],
  );

  // Con hasta 5 jugadas abiertas en paralelo, hace falta dejar claro a qué
  // slot corresponde cada tarjeta de "Palenques abiertos".
  function slotDeEvento(evento: string): number | null {
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].tipo === "Apuesta" && slots[i].iniciada && eventoDeSlot(slots[i]) === evento) return i + 1;
    }
    return null;
  }

  if (cargando || !sesion) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <span className="spinner-grande" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24">
      <PanelHeader titulo={tab === "jugadas" ? "Nueva jugada" : "Historial"} alias={sesion.alias} />

      <Toast datos={mensaje} onCerrar={() => setMensaje(null)} />

      <main className="p-4 max-w-lg mx-auto flex flex-col gap-4">
        {conexionLenta && (
          <p className="text-sm text-amber-300">Tu conexión está lenta, espera un momento…</p>
        )}

        {tab === "jugadas" && (
          <>
            {/* Encabezado persistente: Tipo + Slots, siempre visible sin
                importar el paso. */}
            <section className="bg-card border border-border rounded-2xl p-4">
              <p className="font-display text-gold text-xl tracking-wide mb-3">Nueva jugada</p>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => elegirTipo("Apuesta")}
                  className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                    slotActivoObj.tipo === "Apuesta" ? "bg-gold text-navy shadow-gold" : "bg-navy/60 border border-border text-white/50"
                  }`}
                >
                  🎲 Apuesta
                </button>
                <button
                  type="button"
                  onClick={() => elegirTipo("Quiniela")}
                  className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                    slotActivoObj.tipo === "Quiniela" && slotActivo === 0
                      ? "bg-gold text-navy shadow-gold"
                      : "bg-navy/60 border border-border text-white/50"
                  }`}
                >
                  📋 Quiniela
                </button>
              </div>

              <div className="flex items-center justify-around bg-navy/60 border border-border rounded-2xl p-2 gap-1">
                {slots.map((s, i) => {
                  const visible = quinielaEnSlot1 ? i === 0 : slotsRevelados[i];
                  if (!visible) return null;
                  const activo = i === slotActivo;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => elegirSlot(i)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl font-black text-sm transition-all active:scale-95 ${
                        activo ? "bg-gold text-navy shadow-gold" : "text-white/40"
                      }`}
                    >
                      <span>{i + 1}</span>
                      <span className="text-[.6rem] font-bold normal-case leading-none truncate max-w-full opacity-60">
                        {s.iniciada && s.nombre ? s.nombre : "Libre"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {paso === "definir" && (
              <section className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                <Campo etiqueta="Tipo">
                  <div className="py-2.5 px-3 bg-white/[.04] border border-border/60 rounded-xl font-bold">
                    {slotActivoObj.tipo}
                  </div>
                </Campo>

                {slotActivoObj.tipo === "Apuesta" ? (
                  <>
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <Campo etiqueta="Nombre del palenque">
                        <input
                          value={slotActivoObj.nombre}
                          maxLength={LIMITES.nombreEvento}
                          onChange={(e) => actualizarSlotActivo({ nombre: limpiarTexto(e.target.value, LIMITES.nombreEvento) })}
                          placeholder="Ej. Corrida principal"
                          className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-xl font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold"
                        />
                      </Campo>
                      <Campo etiqueta="N# Jugada">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={slotActivoObj.numJugada}
                          onChange={(e) => actualizarSlotActivo({ numJugada: limpiarDigitos(e.target.value, LIMITES.numeroJugada) })}
                          onKeyDown={soloDigitos}
                          placeholder="1"
                          className={`w-16 py-3 px-3 bg-white/[.06] border-2 rounded-xl font-bold text-center outline-none placeholder:text-white/25 focus:border-gold ${
                            numeroRepetido ? "border-red-500/60" : "border-border/80"
                          }`}
                        />
                      </Campo>
                    </div>

                    <button
                      type="button"
                      onClick={cambiarPosicion}
                      className="flex items-center gap-1 text-xs font-bold text-white/40 hover:text-gold transition-colors py-1 px-2 self-center"
                    >
                      <span>⇄</span> Cambiar posición
                    </button>

                    <div className="grid grid-cols-2 gap-2 relative">
                      {(slotActivoObj.invertido
                        ? [
                            { color: "verde" as const, valor: slotActivoObj.verde },
                            { color: "rojo" as const, valor: slotActivoObj.rojo },
                          ]
                        : [
                            { color: "rojo" as const, valor: slotActivoObj.rojo },
                            { color: "verde" as const, valor: slotActivoObj.verde },
                          ]
                      ).map(({ color, valor }) => (
                        <div
                          key={color}
                          className={`border-t-2 rounded-t-lg bg-white/[.03] p-3 ${
                            color === "rojo" ? "border-red-500" : "border-green-500"
                          }`}
                        >
                          <div
                            className={`flex items-center gap-1.5 text-xs font-extrabold mb-1.5 ${
                              color === "rojo" ? "text-red-300" : "text-green-300"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color === "rojo" ? "bg-red-500" : "bg-green-500"}`} />
                            {color.toUpperCase()}
                          </div>
                          <input
                            value={valor}
                            maxLength={LIMITES.nombreEquipo}
                            onChange={(e) => {
                              const v = limpiarTexto(e.target.value, LIMITES.nombreEquipo);
                              actualizarSlotActivo(color === "rojo" ? { rojo: v } : { verde: v });
                            }}
                            placeholder="Nombre equipo"
                            className="w-full bg-transparent outline-none font-bold placeholder:text-white/25 placeholder:font-normal"
                          />
                        </div>
                      ))}
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30 text-[.65rem] font-black bg-card px-1.5 rounded">
                        VS
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <Campo etiqueta="Tipo de quiniela">
                      <select
                        value={slotActivoObj.subTipoQuiniela}
                        onChange={(e) => actualizarSlotActivo({ subTipoQuiniela: e.target.value })}
                        className="campo"
                      >
                        {TIPOS_QUINIELA.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo etiqueta="Nombre de quiniela">
                      <input
                        value={slotActivoObj.nombre}
                        maxLength={LIMITES.nombreEvento}
                        onChange={(e) => actualizarSlotActivo({ nombre: limpiarTexto(e.target.value, LIMITES.nombreEvento) })}
                        placeholder="Ej. 24 de Mayo Huamantla"
                        className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-xl font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold"
                      />
                    </Campo>
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <Campo etiqueta="Monto por lugar" ayuda="$500–$1,000,000">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={slotActivoObj.montoLugar}
                          onChange={(e) => actualizarSlotActivo({ montoLugar: limpiarDigitos(e.target.value, 7) })}
                          onKeyDown={soloDigitos}
                          placeholder="500"
                          className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-xl font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold"
                        />
                      </Campo>
                      <Campo etiqueta="Lugares">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={slotActivoObj.lugares}
                          onChange={(e) => actualizarSlotActivo({ lugares: limpiarDigitos(e.target.value, LIMITES.lugares) })}
                          onKeyDown={soloDigitos}
                          placeholder="20"
                          className="w-16 py-3 px-3 bg-white/[.06] border-2 border-border/80 rounded-xl font-bold text-center outline-none placeholder:text-white/25 focus:border-gold"
                        />
                      </Campo>
                    </div>
                  </>
                )}

                {jugadaError && <p className="text-red-300 text-xs font-bold">{jugadaError}</p>}

                <button
                  type="button"
                  onClick={iniciarJugada}
                  className="w-full py-3 mt-1 bg-gradient-to-br from-gold to-gold-2 text-navy rounded-xl font-black transition-all active:scale-[.98] flex items-center justify-center gap-2"
                >
                  <span>▶</span> {slotActivoObj.tipo === "Quiniela" ? "Iniciar Quiniela" : "Iniciar Apuesta"}
                </button>
              </section>
            )}

            {paso === "apuesta" && (
              <section className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={volverALaJugada}
                  className="self-start flex items-center gap-1.5 text-xs font-bold text-gold border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/10 transition-colors"
                >
                  ← Volver a la jugada
                </button>
                <p className="font-bold text-sm">
                  Registrar apuesta — <span className="text-gold">{eventoDeSlot(slotActivoObj)}</span>
                </p>

                <Campo etiqueta="Cliente">
                  <div className="relative">
                    <input
                      value={clienteElegido ? clienteElegido.alias : busqueda}
                      maxLength={LIMITES.alias}
                      onChange={(e) => {
                        setClienteElegido(null);
                        setBusqueda(limpiarTexto(e.target.value, LIMITES.alias));
                      }}
                      placeholder="Buscar por alias o celular…"
                      className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-xl font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold"
                    />
                    {sugerencias.length > 0 && !clienteElegido && (
                      <div className="sin-scrollbar absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden max-h-56 overflow-y-auto animate-tarjeta">
                        {sugerencias.map((c) => (
                          <button
                            key={c.celular}
                            type="button"
                            onClick={() => {
                              setClienteElegido(c);
                              setBusqueda("");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gold/10 border-b border-border/60 last:border-0"
                          >
                            <p className="font-bold text-sm">{c.alias}</p>
                            <p className="text-white/40 text-xs">
                              {c.celular} · saldo ${c.saldo.toLocaleString("es-MX")}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {!clienteElegido && busqueda.length > 0 && sugerencias.length === 0 && (
                    <p className="text-white/30 text-xs mt-1.5">Ningún cliente activo de tu negocio coincide.</p>
                  )}
                </Campo>

                <Campo etiqueta="Monto" ayuda="mín. $500 · máx. $1,000,000">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={monto}
                    onChange={(e) => setMonto(limpiarDigitos(e.target.value, 7))}
                    onKeyDown={soloDigitos}
                    placeholder="500.00"
                    className="w-full py-3 px-4 bg-white/[.06] border-2 border-border/80 rounded-xl font-bold outline-none placeholder:text-white/25 placeholder:font-normal focus:border-gold"
                  />
                  {monto !== "" && !montoValido && (
                    <p className="text-red-300 text-xs mt-1.5">Debe estar entre $500 y $1,000,000.</p>
                  )}
                </Campo>

                {/* Al tocar un color se registra la apuesta de inmediato, no
                    hace falta otro botón (igual que operador.html en v2). */}
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-white/50 mb-1.5">Color</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!clienteElegido || !montoValido || enviando}
                      onClick={() => apostar("rojo")}
                      className="py-3 rounded-xl font-black text-sm bg-red-500/10 border-2 border-red-500/30 text-red-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      🔴 {slotActivoObj.rojo || "Rojo"}
                    </button>
                    <button
                      type="button"
                      disabled={!clienteElegido || !montoValido || enviando}
                      onClick={() => apostar("verde")}
                      className="py-3 rounded-xl font-black text-sm bg-green-500/10 border-2 border-green-500/30 text-green-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      🟢 {slotActivoObj.verde || "Verde"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!puedeCerrarApuesta}
                  onClick={abrirModalResultado}
                  className="w-full py-3 bg-gradient-to-br from-gold to-gold-2 text-navy rounded-xl font-black transition-all active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none"
                >
                  ✓ Cerrar apuesta
                </button>
                {!puedeCerrarApuesta && (
                  <p className="text-white/30 text-xs text-center -mt-1">
                    Necesitas al menos una apuesta de cada color (rojo y verde) para poder cerrar.
                  </p>
                )}
              </section>
            )}

            {paso === "quiniela" && (
              <section className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={volverALaJugada}
                  className="self-start flex items-center gap-1.5 text-xs font-bold text-gold border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/10 transition-colors"
                >
                  ← Volver a la jugada
                </button>
                <p className="font-bold text-sm">
                  {slotActivoObj.nombre || `Quiniela ${slotActivo + 1}`} · {slotActivoObj.subTipoQuiniela}
                </p>

                {slotActivoObj.subTipoQuiniela === "Pares y nones" && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={apostadorPts}
                      onChange={(e) => setApostadorPts(limpiarDigitos(e.target.value, LIMITES.puntos))}
                      placeholder="Puntos"
                      className="w-full py-2.5 px-3 bg-white/[.06] border-2 border-border rounded-xl font-bold outline-none focus:border-gold"
                    />
                    <input
                      value={apostadorCarta}
                      maxLength={LIMITES.carta}
                      onChange={(e) => setApostadorCarta(limpiarTexto(e.target.value, LIMITES.carta))}
                      placeholder="Carta"
                      className="w-full py-2.5 px-3 bg-white/[.06] border-2 border-border rounded-xl font-bold outline-none focus:border-gold"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={apostadorNombre}
                    maxLength={LIMITES.nombreApostador}
                    onChange={(e) => setApostadorNombre(limpiarTexto(e.target.value, LIMITES.nombreApostador))}
                    onKeyDown={(e) => e.key === "Enter" && agregarApostador()}
                    placeholder="Nombre del apostador"
                    className="flex-1 py-2.5 px-3 bg-white/[.06] border-2 border-border rounded-xl font-bold outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={agregarApostador}
                    className="px-4 rounded-xl font-black text-sm bg-gold text-navy transition-all active:scale-95"
                  >
                    + Agregar
                  </button>
                </div>

                {quinielaError && <p className="text-red-300 text-xs font-bold">{quinielaError}</p>}

                <button
                  type="button"
                  disabled={enviando}
                  onClick={iniciarCierreQuiniela}
                  className="w-full py-3 bg-gradient-to-br from-gold to-gold-2 text-navy rounded-xl font-black transition-all active:scale-[.98] disabled:opacity-50"
                >
                  {slotActivoObj.cerrando ? "✓ Confirmar cierre" : "▶ Cerrar Quiniela"}
                </button>
              </section>
            )}

            {/* Columna/sección de apoyo: Palenques abiertos, salvo cuando hay
                una quiniela activa, donde se muestra su lista de apostadores. */}
            {paso === "quiniela" ? (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm">Apostadores</p>
                  <p className="text-white/40 text-xs">
                    {slotActivoObj.apostadores.length} lugares · Total $
                    {(slotActivoObj.apostadores.length * (Number(slotActivoObj.montoLugar) || 0)).toLocaleString("es-MX")}
                  </p>
                </div>
                <div className="sin-scrollbar max-h-[45dvh] overflow-y-auto flex flex-col gap-1.5">
                  {slotActivoObj.apostadores.length === 0 && (
                    <div className="bg-white/[.03] border border-border/60 rounded-xl p-4 text-center text-white/30 text-sm">
                      Sin apostadores aún.
                    </div>
                  )}
                  {slotActivoObj.apostadores.map((a, i) => {
                    const seleccionable = slotActivoObj.cerrando;
                    const extra =
                      a.pts || a.carta ? ` · ${a.pts ? `${a.pts} pts` : ""}${a.carta ? ` ${a.carta}` : ""}` : "";
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!seleccionable}
                        onClick={() => toggleGanadorApostador(i)}
                        className={`flex items-center justify-between py-2.5 px-3 rounded-xl border transition-all text-left ${
                          seleccionable && a.ganador ? "bg-gold/10 border-gold" : "bg-white/[.03] border-border/60"
                        } ${seleccionable ? "active:scale-[.98]" : ""}`}
                      >
                        <span className="flex items-center gap-2 font-bold text-sm">
                          {seleccionable && <span>{a.ganador ? "🏆" : "⬜"}</span>}#{a.lugar} — {a.nombre}
                          {extra}
                        </span>
                        <span className="text-white/40 text-xs">
                          ${(Number(slotActivoObj.montoLugar) || 0).toLocaleString("es-MX")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm">Palenques abiertos</p>
                  <button
                    onClick={() => cargarEventos()}
                    className="text-xs font-bold text-white/40 hover:text-gold transition-colors"
                  >
                    ↻ Actualizar
                  </button>
                </div>
                {eventosAbiertos.length === 0 && (
                  <div className="bg-card border border-border/80 rounded-2xl p-6 text-center text-white/30 text-sm">
                    No hay palenques con apuestas pendientes.
                  </div>
                )}
                {eventosAbiertos.length > 0 &&
                  (() => {
                    // Si el evento seleccionado ya cerró o no existe, se cae
                    // al primero disponible en vez de quedar en blanco.
                    const tabActivo = eventosAbiertos.some((e) => e.evento === palenqueTabActivo)
                      ? palenqueTabActivo
                      : eventosAbiertos[0].evento;
                    const evActivo = eventosAbiertos.find((e) => e.evento === tabActivo)!;
                    return (
                      <>
                        {eventosAbiertos.length > 1 && (
                          <div className="flex gap-1.5 mb-2 overflow-x-auto sin-scrollbar">
                            {eventosAbiertos.map((ev) => {
                              const slotNum = slotDeEvento(ev.evento);
                              const activo = ev.evento === tabActivo;
                              return (
                                <button
                                  key={ev.evento}
                                  type="button"
                                  onClick={() => setPalenqueTabActivo(ev.evento)}
                                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                                    activo ? "bg-gold text-navy" : "bg-navy/60 border border-border text-white/50"
                                  }`}
                                >
                                  {slotNum ? `Slot ${slotNum} · ` : ""}
                                  {ev.evento}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <TarjetaEvento
                          evento={evActivo}
                          nombres={nombresEquipos[evActivo.evento]}
                          slotNum={slotDeEvento(evActivo.evento)}
                        />
                      </>
                    );
                  })()}
              </section>
            )}
          </>
        )}

        {tab === "historial" && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {(["todas", "pendientes"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroHistorial(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      filtroHistorial === f ? "bg-gold text-navy" : "border border-border text-white/50"
                    }`}
                  >
                    {f === "todas" ? "Todas" : "Pendientes"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => cargarHistorial()}
                className="text-xs font-bold text-white/40 hover:text-gold transition-colors"
              >
                ↻ Actualizar
              </button>
            </div>

            {historialFiltrado.length === 0 && (
              <p className="text-white/30 text-sm">No hay jugadas que mostrar.</p>
            )}
            {historialFiltrado.map((j) => (
              <div key={j.id} className="bg-card/60 border border-border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{j.evento}</p>
                    <p className="text-white/40 text-xs">
                      {j.color} · ${j.monto.toLocaleString("es-MX")} ·{" "}
                      {new Date(j.fecha).toLocaleString("es-MX")}
                    </p>
                  </div>
                  {j.resultado === "" ? (
                    <button
                      onClick={() => setApuestaAEditar(j)}
                      className="text-xs font-bold text-gold border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/10 flex-shrink-0"
                    >
                      Editar
                    </button>
                  ) : (
                    <span
                      className={`text-xs font-bold flex-shrink-0 ${
                        j.resultado === "ganada" ? "text-green-300" : "text-white/40"
                      }`}
                    >
                      {j.resultado}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <BottomNav
        activo={tab}
        onCambiar={(id) => setTab(id as Tab)}
        items={[
          { id: "jugadas", etiqueta: "Jugadas", icono: <span>🎯</span> },
          { id: "historial", etiqueta: "Historial", icono: <span>📋</span> },
        ]}
      />

      {modalResultado && (
        <ModalResultado
          modalResultado={modalResultado}
          resultadoElegido={resultadoElegido}
          enviando={enviando}
          onElegir={setResultadoElegido}
          onCambiar={() => setResultadoElegido(null)}
          onConfirmar={confirmarResultado}
          onCerrar={() => {
            setModalResultado(null);
            setResultadoElegido(null);
          }}
        />
      )}

      {apuestaAEditar && (
        <ModalEditarApuesta
          apuesta={apuestaAEditar}
          enviando={enviando}
          onCancelar={() => setApuestaAEditar(null)}
          onGuardar={guardarEdicion}
        />
      )}

      {/* En el palenque se trabaja desde el celular: igual que HGC, en celular se pide instalarla. */}
      <InstalarApp nombre="PeliStreams" forma="pantalla" />
    </div>
  );
}

function TarjetaEvento({
  evento,
  nombres,
  slotNum,
}: {
  evento: EventoAbierto;
  nombres?: { rojo: string; verde: string; invertido: boolean };
  slotNum: number | null;
}) {
  // El nombre real guardado en la base (evento.equipo_rojo/verde) es la
  // fuente de verdad -- funciona entre sesiones/dispositivos. El mapa local
  // "nombres" solo se usa de respaldo si por lo que sea esa jugada nunca
  // trajo el nombre desde el backend.
  const nombreRojo = evento.equipo_rojo || nombres?.rojo || "Rojo";
  const nombreVerde = evento.equipo_verde || nombres?.verde || "Verde";
  const invertido = nombres?.invertido ?? false;

  function listaColor(color: "rojo" | "verde") {
    const filas = evento.detalle.filter((d) => d.color === color);
    if (!filas.length) {
      return <div className="text-white/20 text-[.7rem] text-center py-2 px-2">Sin apuestas</div>;
    }
    return filas.map((d, i) => (
      <div key={i} className="flex items-center justify-between px-2.5 py-1 text-xs">
        <span className="text-white/70 font-bold truncate">{d.alias}</span>
        <span className="text-white/50 font-bold flex-shrink-0 ml-1">${d.monto.toLocaleString("es-MX")}</span>
      </div>
    ));
  }

  const headerVerde = (
    <div key="header-verde" className="flex-1 py-2 px-2 bg-green-600/25 border-t-2 border-green-500">
      <span className="text-green-300 font-black text-sm truncate block">🟢 {nombreVerde}</span>
    </div>
  );
  const headerRojo = (
    <div key="header-rojo" className="flex-1 py-2 px-2 bg-red-600/25 border-t-2 border-red-500 border-l border-navy">
      <span className="text-red-300 font-black text-sm truncate block">🔴 {nombreRojo}</span>
    </div>
  );
  const columnaVerde = (
    <div key="columna-verde" className="py-1">
      {listaColor("verde")}
      <div className="flex items-center justify-between px-2.5 py-1.5 mt-1 border-t border-border/40 font-black text-xs text-green-300">
        <span>Total</span>
        <span>${evento.vol_verde.toLocaleString("es-MX")}</span>
      </div>
    </div>
  );
  const columnaRojo = (
    <div key="columna-rojo" className="py-1">
      {listaColor("rojo")}
      <div className="flex items-center justify-between px-2.5 py-1.5 mt-1 border-t border-border/40 font-black text-xs text-red-300">
        <span>Total</span>
        <span>${evento.vol_rojo.toLocaleString("es-MX")}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="font-bold">{evento.evento}</div>
          {slotNum && (
            <span className="text-[.65rem] font-extrabold uppercase px-2 py-1 rounded-full bg-gold/15 text-gold whitespace-nowrap">
              Slot {slotNum}
            </span>
          )}
        </div>
        <div className="text-white/40 text-xs">{evento.apuestas} apuestas</div>
      </div>

      <div className="flex">{invertido ? [headerRojo, headerVerde] : [headerVerde, headerRojo]}</div>

      <div className="grid grid-cols-2 divide-x divide-border/60 border-t border-border/60 sin-scrollbar max-h-[160px] overflow-y-auto">
        {invertido ? [columnaRojo, columnaVerde] : [columnaVerde, columnaRojo]}
      </div>
    </div>
  );
}

function ModalResultado({
  modalResultado,
  resultadoElegido,
  enviando,
  onElegir,
  onCambiar,
  onConfirmar,
  onCerrar,
}: {
  modalResultado: { evento: string; datos: EventoAbierto; rojoNombre: string; verdeNombre: string };
  resultadoElegido: ResultadoEvento | null;
  enviando: boolean;
  onElegir: (r: ResultadoEvento) => void;
  onCambiar: () => void;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  const { evento, datos, rojoNombre, verdeNombre } = modalResultado;

  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 animate-tarjeta max-h-[90dvh] overflow-y-auto">
        {resultadoElegido === null ? (
          <>
            <div className="text-center mb-4">
              <p className="text-[.65rem] font-extrabold uppercase tracking-[.15em] text-white/40 mb-1">¿Quién ganó?</p>
              <p className="font-display text-gold text-xl tracking-wide">{evento}</p>
            </div>

            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => onElegir("verde")}
                className="flex-1 py-3 px-2 rounded-xl bg-green-600/15 border-2 border-green-500/40 transition-all active:scale-95"
              >
                <div className="text-green-300 font-black text-sm truncate">🟢 {verdeNombre}</div>
                <div className="text-white/50 text-xs font-bold">${datos.vol_verde.toLocaleString("es-MX")}</div>
              </button>
              <button
                type="button"
                onClick={() => onElegir("rojo")}
                className="flex-1 py-3 px-2 rounded-xl bg-red-600/15 border-2 border-red-500/40 transition-all active:scale-95"
              >
                <div className="text-red-300 font-black text-sm truncate">🔴 {rojoNombre}</div>
                <div className="text-white/50 text-xs font-bold">${datos.vol_rojo.toLocaleString("es-MX")}</div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onElegir("empate")}
              className="w-full py-2.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-300 font-black text-sm mb-2 transition-all active:scale-95"
            >
              ⚖ Empate
            </button>
            <button
              type="button"
              onClick={() => onElegir("cancelada")}
              className="w-full py-2.5 rounded-xl bg-white/[.04] border-2 border-border text-white/50 font-black text-sm mb-4 transition-all active:scale-95"
            >
              ✕ Cancelada
            </button>

            <button type="button" onClick={onCerrar} className="w-full text-center text-xs font-bold text-white/40 hover:text-gold transition-colors">
              ← Volver
            </button>
          </>
        ) : (
          <>
            {(() => {
              const esNeutro = resultadoElegido === "empate" || resultadoElegido === "cancelada";
              const nombreGanador = resultadoElegido === "rojo" ? rojoNombre : verdeNombre;
              const filas = esNeutro
                ? datos.detalle
                : datos.detalle.filter((d) => d.color === resultadoElegido);

              return (
                <>
                  <div className="text-center mb-1">
                    <p
                      className={`font-display text-xl tracking-wide ${
                        resultadoElegido === "empate"
                          ? "text-amber-300"
                          : resultadoElegido === "cancelada"
                            ? "text-white"
                            : resultadoElegido === "rojo"
                              ? "text-red-300"
                              : "text-green-300"
                      }`}
                    >
                      {resultadoElegido === "empate"
                        ? "⚖ Empate"
                        : resultadoElegido === "cancelada"
                          ? "✕ Cancelada"
                          : `${resultadoElegido === "rojo" ? "🔴" : "🟢"} ${nombreGanador}`}
                    </p>
                    <p className="text-white/40 text-xs mb-3">
                      {esNeutro
                        ? "Se le devuelve su apuesta íntegra a todos, sin corretaje."
                        : `${filas.length} apostador${filas.length !== 1 ? "es" : ""} ganó${filas.length !== 1 ? "aron" : ""}`}
                    </p>
                  </div>

                  <div className="max-h-[45vh] overflow-y-auto mb-4">
                    {filas.length === 0 && (
                      <p className="text-white/30 text-sm text-center py-3">
                        {esNeutro ? "Sin apuestas registradas." : "Nadie apostó a este color."}
                      </p>
                    )}
                    {filas.map((d, i) => (
                      <div key={i} className="flex items-center justify-between px-2.5 py-1.5 text-sm border-b border-border/40">
                        <span className="font-bold">
                          {esNeutro ? "" : "🏆 "}
                          {d.alias}
                        </span>
                        <span className="text-white/50">${d.monto.toLocaleString("es-MX")}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onCambiar}
                      className="flex-1 py-3 rounded-xl bg-white/[.04] border-2 border-border text-white/60 font-black text-sm transition-all active:scale-95"
                    >
                      ← Cambiar
                    </button>
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={onConfirmar}
                      className="flex-[2] py-3 rounded-xl bg-gradient-to-br from-gold to-gold-2 text-navy font-black text-sm transition-all active:scale-[.98] disabled:opacity-50"
                    >
                      {enviando ? "Cerrando…" : "✓ Confirmar"}
                    </button>
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

function ModalEditarApuesta({
  apuesta,
  enviando,
  onCancelar,
  onGuardar,
}: {
  apuesta: Jugada;
  enviando: boolean;
  onCancelar: () => void;
  onGuardar: (montoNuevo: number, colorNuevo: "rojo" | "verde") => void;
}) {
  const [monto, setMonto] = useState(String(apuesta.monto));
  const [color, setColor] = useState<"rojo" | "verde">(apuesta.color === "verde" ? "verde" : "rojo");
  const montoNum = Number(monto);
  // Mismo límite que codigo.gs/apuestas.py: $500–$1,000,000.
  const montoValido = montoNum >= 500 && montoNum <= 1_000_000;

  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 animate-tarjeta">
        <h3 className="font-display text-gold text-lg tracking-wide mb-1">Editar apuesta</h3>
        <p className="text-white/40 text-sm mb-4">{apuesta.evento}</p>

        <label className="block text-xs text-white/50 mb-1.5 font-bold">Monto ($500–$1,000,000)</label>
        <input
          type="text"
          inputMode="numeric"
          value={monto}
          onChange={(e) => setMonto(limpiarDigitos(e.target.value, 7))}
          onKeyDown={soloDigitos}
          className="w-full py-3 px-4 mb-3 bg-white/[.06] border-2 border-border/80 rounded-xl font-bold outline-none focus:border-gold"
        />
        {!montoValido && <p className="text-red-300 text-xs -mt-2 mb-3">Debe estar entre $500 y $1,000,000.</p>}

        <span className="block text-xs text-white/50 mb-1.5 font-bold">Color de la apuesta</span>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setColor("rojo")}
            className={`py-3 rounded-xl font-black ${color === "rojo" ? "bg-red-500" : "border border-border text-white/50"}`}
          >
            ROJO
          </button>
          <button
            type="button"
            onClick={() => setColor("verde")}
            className={`py-3 rounded-xl font-black ${color === "verde" ? "bg-green-500" : "border border-border text-white/50"}`}
          >
            VERDE
          </button>
        </div>

        <button
          disabled={!montoValido || enviando}
          onClick={() => onGuardar(montoNum, color)}
          className="w-full py-3 bg-gradient-to-br from-gold to-gold-2 text-navy rounded-xl font-black disabled:opacity-50"
        >
          {enviando ? "Guardando…" : "Guardar cambios"}
        </button>
        <button onClick={onCancelar} className="w-full mt-2 py-2 text-white/40 text-sm hover:text-white">
          Cancelar
        </button>
      </div>
    </div>
  );
}
