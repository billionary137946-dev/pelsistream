// Panel del admin: resumen del negocio + alta/edición de negocios/
// operadores/clientes + activación de clientes pendientes (ver
// v.2/funcionamiento.txt, sección 3 "ADMINISTRADOR"). Nada se borra de
// verdad -- "Desactivar" es la única acción destructiva, y es reversible
// (estatus/activo, nunca DELETE), igual que en v2 original.
"use client";

import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/lib/useSesion";
import { soloDigitos, soloNumeroDecimal } from "@/lib/inputs";
import { api, ErrorApi } from "@/lib/api";
import { PanelHeader } from "@/components/PanelHeader";
import { Campo } from "@/components/Campo";
import { Toast, type DatosToast } from "@/components/Toast";

interface Resumen {
  jugadas: number;
  volumen: number;
  corretaje: number;
  deudas: number;
}
interface Negocio {
  nombre: string;
  activo: boolean;
  max_operadores: number;
  corretaje_pct: number;
}
interface Usuario {
  celular: string;
  alias: string;
  estatus: string;
  negocio_id: string | null;
  saldo: number;
  limite_credito: number;
}
interface JugadaHistorial {
  id?: number;
  evento: string;
  color: string;
  monto: number;
  corretaje: number | null;
  resultado: string;
  neto: number | null;
  fecha: string;
}
interface ResumenNegocio {
  operadores: number;
  clientes: number;
  jugadas: number;
  volumen: number;
  corretaje: number;
}
type Pestana = "inicio" | "negocios" | "operadores" | "clientes";

export default function PanelAdmin() {
  const { sesion, cargando } = useSesion("admin");
  const [pestana, setPestana] = useState<Pestana>("inicio");

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [toast, setToast] = useState<DatosToast | null>(null);

  const [historialAbierto, setHistorialAbierto] = useState<{ alias: string } | null>(null);
  const [jugadasHistorial, setJugadasHistorial] = useState<JugadaHistorial[] | null>(null);

  const [negocioAEditar, setNegocioAEditar] = useState<Negocio | null>(null);
  const [usuarioAEditar, setUsuarioAEditar] = useState<{ rol: "operador" | "cliente"; usuario: Usuario } | null>(
    null,
  );
  const [modalNegocioAbierto, setModalNegocioAbierto] = useState(false);
  const [modalUsuarioAbierto, setModalUsuarioAbierto] = useState<"operador" | "cliente" | null>(null);
  const [negocioAVer, setNegocioAVer] = useState<Negocio | null>(null);
  const [resumenNegocio, setResumenNegocio] = useState<ResumenNegocio | null>(null);

  async function verHistorial(rol: "operador" | "cliente", celular: string, alias: string) {
    setHistorialAbierto({ alias });
    setJugadasHistorial(null);
    try {
      const r = await api.get<{ jugadas: JugadaHistorial[] }>(
        `/admin/${rol === "operador" ? "operadores" : "clientes"}/${celular}/historial`,
      );
      setJugadasHistorial(r.jugadas);
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo cargar el historial." });
      setHistorialAbierto(null);
    }
  }

  async function verGananciasNegocio(negocio: Negocio) {
    setNegocioAVer(negocio);
    setResumenNegocio(null);
    try {
      const r = await api.get<ResumenNegocio>(`/admin/negocios/${encodeURIComponent(negocio.nombre)}/resumen`);
      setResumenNegocio(r);
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo cargar el resumen." });
      setNegocioAVer(null);
    }
  }

  // silencioso=true cuando se llama justo después de una acción que YA
  // mostró su propio toast de éxito (crear/editar/desactivar) -- antes, si
  // esta recarga en segundo plano tenía el más mínimo hipo, su propio
  // mensaje de error PISABA el "creado con éxito" que el usuario acababa de
  // ver, aunque la acción sí hubiera funcionado (confirmado: el backend
  // devolvía 201, pero la pantalla igual decía "No se pudo crear.").
  async function cargarTodo(silencioso = false) {
    // allSettled en vez de Promise.all: si UNA sola de las 4 llamadas falla
    // (ej. un hipo de red pasajero), antes se cancelaban las otras 3 y el
    // error se colaba como una excepción sin capturar en vez de un mensaje
    // claro -- ahora cada una se resuelve por separado y solo se avisa de
    // la que de verdad falló, sin tirar el resto de la pantalla.
    const [r, n, o, c] = await Promise.allSettled([
      api.get<Resumen>("/admin/resumen"),
      api.get<Negocio[]>("/negocios"),
      api.get<Usuario[]>("/operadores"),
      api.get<Usuario[]>("/clientes"),
    ]);
    if (r.status === "fulfilled") setResumen(r.value);
    if (n.status === "fulfilled") setNegocios(n.value);
    if (o.status === "fulfilled") setOperadores(o.value);
    if (c.status === "fulfilled") setClientes(c.value);

    const fallo = [r, n, o, c].find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
    if (fallo && !silencioso) {
      setToast({
        tipo: "error",
        texto: fallo.reason instanceof ErrorApi ? fallo.reason.message : "No se pudo cargar todo el panel.",
      });
    }
  }

  // Se dispara solo la primera vez que hay sesión, no en cada actualización
  // (useSesion primero pone la sesión guardada en localStorage y luego la
  // reemplaza por la revalidada contra el backend -- sin este candado,
  // cargarTodo se disparaba dos veces seguidas en cada carga del panel).
  const yaCargado = useRef(false);
  useEffect(() => {
    if (sesion && !yaCargado.current) {
      yaCargado.current = true;
      cargarTodo();
    }
  }, [sesion]);

  async function crearNegocio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // OJO: evento.currentTarget se vuelve null en cuanto termina la parte
    // síncrona del handler (así funciona React, no es pooling) -- si se
    // usa DESPUÉS de un await, .reset() truena con "Cannot read properties
    // of null", cae al catch, y muestra "No se pudo crear" aunque el
    // backend ya haya guardado todo bien. Por eso se guarda la referencia
    // ANTES del await.
    const formulario = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(formulario));
    try {
      await api.post("/negocios", {
        nombre: datos.nombre,
        max_operadores: Number(datos.max_operadores),
        corretaje_pct: Number(datos.corretaje_pct),
      });
      formulario.reset();
      setModalNegocioAbierto(false);
      await cargarTodo(true); // silencioso: no dejar que un hipo aquí tape el toast de éxito de abajo
      setToast({ tipo: "ok", texto: `Negocio "${datos.nombre}" creado.` });
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo crear el negocio." });
    }
  }

  async function guardarEdicionNegocio(datos: { activo: boolean; max_operadores: number; corretaje_pct: number }) {
    if (!negocioAEditar) return;
    try {
      await api.put(`/negocios/${encodeURIComponent(negocioAEditar.nombre)}`, datos);
      setNegocioAEditar(null);
      await cargarTodo(true);
      setToast({ tipo: "ok", texto: `Negocio "${negocioAEditar.nombre}" actualizado.` });
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo guardar el negocio." });
    }
  }

  async function crearUsuario(rol: "operador" | "cliente", evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Misma razón que en crearNegocio: guardar el formulario ANTES del
    // await, porque evento.currentTarget ya es null después.
    const formulario = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(formulario));
    // Bug ya corregido: "/${rol}s" pluralizaba mal "operador" -> "/operadors"
    // (la ruta real es "/operadores") -- con "cliente" funcionaba de pura
    // casualidad porque cliente+s sí da "clientes". Por eso crear operador
    // siempre daba 404 y nunca se había guardado ninguno.
    const ruta = rol === "operador" ? "/operadores" : "/clientes";
    try {
      await api.post(ruta, {
        celular: datos.celular,
        contrasena: datos.contrasena,
        alias: datos.alias,
        negocio_id: datos.negocio_id,
      });
      formulario.reset();
      setModalUsuarioAbierto(null);
      await cargarTodo(true);
      setToast({ tipo: "ok", texto: `${rol === "operador" ? "Operador" : "Cliente"} "${datos.alias}" creado.` });
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo crear." });
    }
  }

  async function guardarEdicionUsuario(datos: {
    alias: string;
    negocio_id: string;
    estatus: string;
    contrasena?: string;
    saldo?: number;
    limite_credito?: number;
  }) {
    if (!usuarioAEditar) return;
    const { rol, usuario } = usuarioAEditar;
    try {
      const ruta = rol === "operador" ? "/operadores" : "/clientes";
      await api.put(`${ruta}/${usuario.celular}`, datos);
      setUsuarioAEditar(null);
      await cargarTodo(true);
      setToast({ tipo: "ok", texto: `"${datos.alias}" actualizado.` });
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo guardar." });
    }
  }

  // Desactivar/activar de un solo toque, sin abrir el modal de edición --
  // manda los mismos datos que ya tenía el usuario, solo cambia estatus.
  // Nunca borra la fila (ver v.2/funcionamiento.txt, sección 2: "no hay
  // borrado físico de nada").
  async function alternarEstatusUsuario(rol: "operador" | "cliente", usuario: Usuario) {
    const nuevoEstatus = usuario.estatus === "activo" ? "inactivo" : "activo";
    try {
      const ruta = rol === "operador" ? "/operadores" : "/clientes";
      await api.put(`${ruta}/${usuario.celular}`, {
        alias: usuario.alias,
        negocio_id: usuario.negocio_id,
        estatus: nuevoEstatus,
        saldo: usuario.saldo,
        limite_credito: usuario.limite_credito,
      });
      await cargarTodo(true);
      setToast({
        tipo: "ok",
        texto: `"${usuario.alias}" ${nuevoEstatus === "activo" ? "activado" : "desactivado"}.`,
      });
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo cambiar el estatus." });
    }
  }

  async function alternarActivoNegocio(negocio: Negocio) {
    try {
      await api.put(`/negocios/${encodeURIComponent(negocio.nombre)}`, {
        activo: !negocio.activo,
        max_operadores: negocio.max_operadores,
        corretaje_pct: negocio.corretaje_pct,
      });
      await cargarTodo(true);
      setToast({
        tipo: "ok",
        texto: `"${negocio.nombre}" ${!negocio.activo ? "activado" : "desactivado"}.`,
      });
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo cambiar el estatus." });
    }
  }

  async function activarCliente(celular: string) {
    try {
      await api.post(`/clientes/${celular}/activar`, { saldo: 0, limite_credito: 0 });
      await cargarTodo(true);
      setToast({ tipo: "ok", texto: "Cliente activado." });
    } catch (e) {
      setToast({ tipo: "error", texto: e instanceof ErrorApi ? e.message : "No se pudo activar." });
    }
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
      <PanelHeader titulo="Panel de administrador" alias={sesion.alias} />

      <nav className="flex gap-1 p-3 overflow-x-auto border-b border-border">
        {(["inicio", "negocios", "operadores", "clientes"] as Pestana[]).map((p) => (
          <button
            key={p}
            onClick={() => setPestana(p)}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
              pestana === p ? "bg-gold text-navy" : "text-white/50 hover:text-white"
            }`}
          >
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </nav>

      <Toast datos={toast} onCerrar={() => setToast(null)} />

      <main className="p-4 max-w-3xl mx-auto">
        {pestana === "inicio" && (
          <>
            {resumen ? (
              <div className="grid grid-cols-2 gap-3">
                <TarjetaResumen etiqueta="Jugadas registradas" valor={resumen.jugadas.toString()} />
                <TarjetaResumen etiqueta="Volumen apostado" valor={`$${resumen.volumen.toLocaleString("es-MX")}`} />
                <TarjetaResumen etiqueta="Corretaje ganado" valor={`$${resumen.corretaje.toLocaleString("es-MX")}`} />
                <TarjetaResumen
                  etiqueta="Clientes con saldo negativo"
                  valor={resumen.deudas.toString()}
                  alerta={resumen.deudas > 0}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10">
                <span className="spinner-grande" />
                <p className="text-white/40 text-sm">Cargando el resumen…</p>
              </div>
            )}
          </>
        )}

        {pestana === "negocios" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm">Tus negocios</h2>
              <button
                onClick={() => setModalNegocioAbierto(true)}
                className="bg-gold text-navy text-xs font-extrabold rounded-full px-3 py-1.5 transition-all active:scale-95 hover:shadow-gold"
              >
                + Nuevo
              </button>
            </div>
            <TablaNegocios
              negocios={negocios}
              onVerGanancias={verGananciasNegocio}
              onEditar={setNegocioAEditar}
              onAlternarActivo={alternarActivoNegocio}
            />
          </div>
        )}

        {pestana === "operadores" && (
          negocios.length === 0 ? (
            <AvisoFaltaNegocio onIrANegocios={() => setPestana("negocios")} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm">Tus operadores</h2>
                <button
                  onClick={() => setModalUsuarioAbierto("operador")}
                  className="bg-gold text-navy text-xs font-extrabold rounded-full px-3 py-1.5 transition-all active:scale-95 hover:shadow-gold"
                >
                  + Nuevo
                </button>
              </div>
              <TablaUsuarios
                rol="operador"
                usuarios={operadores}
                onVerHistorial={verHistorial}
                onEditar={(u) => setUsuarioAEditar({ rol: "operador", usuario: u })}
                onAlternarEstatus={(u) => alternarEstatusUsuario("operador", u)}
              />
            </div>
          )
        )}

        {pestana === "clientes" && (
          negocios.length === 0 ? (
            <AvisoFaltaNegocio onIrANegocios={() => setPestana("negocios")} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm">Tus clientes</h2>
                <button
                  onClick={() => setModalUsuarioAbierto("cliente")}
                  className="bg-gold text-navy text-xs font-extrabold rounded-full px-3 py-1.5 transition-all active:scale-95 hover:shadow-gold"
                >
                  + Nuevo
                </button>
              </div>
              <TablaUsuarios
                rol="cliente"
                usuarios={clientes}
                onActivarPendiente={activarCliente}
                onVerHistorial={verHistorial}
                onEditar={(u) => setUsuarioAEditar({ rol: "cliente", usuario: u })}
                onAlternarEstatus={(u) => alternarEstatusUsuario("cliente", u)}
              />
            </div>
          )
        )}
      </main>

      {historialAbierto && (
        <ModalHistorial
          alias={historialAbierto.alias}
          jugadas={jugadasHistorial}
          onCerrar={() => setHistorialAbierto(null)}
        />
      )}

      {negocioAVer && (
        <ModalResumenNegocio
          negocio={negocioAVer}
          resumen={resumenNegocio}
          onCerrar={() => setNegocioAVer(null)}
        />
      )}

      {negocioAEditar && (
        <ModalEditarNegocio
          negocio={negocioAEditar}
          onCancelar={() => setNegocioAEditar(null)}
          onGuardar={guardarEdicionNegocio}
        />
      )}

      {usuarioAEditar && (
        <ModalEditarUsuario
          rol={usuarioAEditar.rol}
          usuario={usuarioAEditar.usuario}
          negocios={negocios}
          onCancelar={() => setUsuarioAEditar(null)}
          onGuardar={guardarEdicionUsuario}
        />
      )}

      {modalNegocioAbierto && (
        <ModalCrearNegocio onCancelar={() => setModalNegocioAbierto(false)} onCrear={crearNegocio} />
      )}

      {modalUsuarioAbierto && (
        <ModalCrearUsuario
          rol={modalUsuarioAbierto}
          negocios={negocios}
          onCancelar={() => setModalUsuarioAbierto(null)}
          onCrear={crearUsuario}
        />
      )}
    </div>
  );
}

function ModalHistorial({
  alias,
  jugadas,
  onCerrar,
}: {
  alias: string;
  jugadas: JugadaHistorial[] | null;
  onCerrar: () => void;
}) {
  // Ganancias del propio historial (suma de corretaje generado y neto
  // acumulado) -- "quiero ver ganancias como operadores y clientes":
  // calculado del lado del cliente sobre lo que ya se cargó, sin pedirle
  // nada extra al backend.
  const corretajeTotal = jugadas?.reduce((acc, j) => acc + (j.corretaje ?? 0), 0) ?? 0;
  const netoTotal = jugadas?.reduce((acc, j) => acc + (j.neto ?? 0), 0) ?? 0;

  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-md max-h-[80dvh] bg-card border border-border rounded-2xl p-5 animate-tarjeta flex flex-col">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <h3 className="font-display text-gold text-lg tracking-wide">Historial de {alias}</h3>
          <button onClick={onCerrar} className="text-white/40 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        {jugadas && jugadas.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4 flex-shrink-0">
            <div className="bg-card/60 border border-border rounded-lg p-2 text-center">
              <p className="text-white/40 text-[11px] uppercase">Corretaje generado</p>
              <p className="font-display text-gold text-lg">${corretajeTotal.toLocaleString("es-MX")}</p>
            </div>
            <div className="bg-card/60 border border-border rounded-lg p-2 text-center">
              <p className="text-white/40 text-[11px] uppercase">Neto acumulado</p>
              <p className={`font-display text-lg ${netoTotal < 0 ? "text-red-400" : "text-green-300"}`}>
                ${netoTotal.toLocaleString("es-MX")}
              </p>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex flex-col gap-2">
          {jugadas === null && (
            <div className="flex justify-center py-8">
              <span className="spinner-grande" />
            </div>
          )}
          {jugadas?.length === 0 && (
            <p className="text-white/30 text-sm text-center py-4">Todavía no tiene jugadas.</p>
          )}
          {jugadas?.map((j, i) => (
            <div key={j.id ?? i} className="bg-card/60 border border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{j.evento}</p>
                <p className="text-white/40 text-xs">
                  {j.color} · ${j.monto.toLocaleString("es-MX")} · {new Date(j.fecha).toLocaleString("es-MX")}
                </p>
              </div>
              <span
                className={`text-xs font-bold flex-shrink-0 ${
                  j.resultado === "" ? "text-amber-300" : j.resultado === "ganada" ? "text-green-300" : "text-white/40"
                }`}
              >
                {j.resultado || "pendiente"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModalResumenNegocio({
  negocio,
  resumen,
  onCerrar,
}: {
  negocio: Negocio;
  resumen: ResumenNegocio | null;
  onCerrar: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 animate-tarjeta">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-gold text-lg tracking-wide">{negocio.nombre}</h3>
          <button onClick={onCerrar} className="text-white/40 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        {resumen === null ? (
          <div className="flex justify-center py-8">
            <span className="spinner-grande" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card/60 border border-border rounded-lg p-3 text-center">
              <p className="text-white/40 text-[11px] uppercase">Operadores</p>
              <p className="font-display text-gold text-xl">{resumen.operadores}</p>
            </div>
            <div className="bg-card/60 border border-border rounded-lg p-3 text-center">
              <p className="text-white/40 text-[11px] uppercase">Clientes</p>
              <p className="font-display text-gold text-xl">{resumen.clientes}</p>
            </div>
            <div className="bg-card/60 border border-border rounded-lg p-3 text-center">
              <p className="text-white/40 text-[11px] uppercase">Jugadas</p>
              <p className="font-display text-gold text-xl">{resumen.jugadas}</p>
            </div>
            <div className="bg-card/60 border border-border rounded-lg p-3 text-center">
              <p className="text-white/40 text-[11px] uppercase">Volumen</p>
              <p className="font-display text-gold text-xl">${resumen.volumen.toLocaleString("es-MX")}</p>
            </div>
            <div className="col-span-2 bg-gold/10 border border-gold/30 rounded-lg p-3 text-center">
              <p className="text-white/50 text-[11px] uppercase">Ganancias (corretaje)</p>
              <p className="font-display text-gold text-2xl">${resumen.corretaje.toLocaleString("es-MX")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalEditarNegocio({
  negocio,
  onCancelar,
  onGuardar,
}: {
  negocio: Negocio;
  onCancelar: () => void;
  onGuardar: (datos: { activo: boolean; max_operadores: number; corretaje_pct: number }) => void;
}) {
  const [maxOperadores, setMaxOperadores] = useState(String(negocio.max_operadores));
  const [corretajePct, setCorretajePct] = useState(String(negocio.corretaje_pct));
  const [activo, setActivo] = useState(negocio.activo);

  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 animate-tarjeta">
        <h3 className="font-display text-gold text-lg tracking-wide mb-4">Editar {negocio.nombre}</h3>

        <div className="flex flex-col gap-3">
          <Campo etiqueta="Máx. operadores">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={maxOperadores}
              onChange={(e) => setMaxOperadores(e.target.value)}
              onKeyDown={soloDigitos}
              className="campo"
            />
          </Campo>
          <Campo etiqueta="Corretaje %">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.1}
              value={corretajePct}
              onChange={(e) => setCorretajePct(e.target.value)}
              onKeyDown={soloNumeroDecimal}
              className="campo"
            />
          </Campo>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Negocio activo
          </label>
        </div>

        <button
          onClick={() => onGuardar({ activo, max_operadores: Number(maxOperadores), corretaje_pct: Number(corretajePct) })}
          className="w-full mt-4 btn-gold"
        >
          Guardar cambios
        </button>
        <button onClick={onCancelar} className="w-full mt-2 py-2 text-white/40 text-sm hover:text-white">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ModalEditarUsuario({
  rol,
  usuario,
  negocios,
  onCancelar,
  onGuardar,
}: {
  rol: "operador" | "cliente";
  usuario: Usuario;
  negocios: Negocio[];
  onCancelar: () => void;
  onGuardar: (datos: {
    alias: string;
    negocio_id: string;
    estatus: string;
    contrasena?: string;
    saldo?: number;
    limite_credito?: number;
  }) => void;
}) {
  const [alias, setAlias] = useState(usuario.alias);
  const [negocioId, setNegocioId] = useState(usuario.negocio_id ?? "");
  const [activo, setActivo] = useState(usuario.estatus === "activo");
  const [contrasena, setContrasena] = useState("");
  const [saldo, setSaldo] = useState(String(usuario.saldo));
  const [limiteCredito, setLimiteCredito] = useState(String(usuario.limite_credito));

  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 animate-tarjeta max-h-[90dvh] overflow-y-auto">
        <h3 className="font-display text-gold text-lg tracking-wide mb-1">Editar {rol === "operador" ? "operador" : "cliente"}</h3>
        <p className="text-white/40 text-xs mb-4">Celular {usuario.celular} (no se puede cambiar)</p>

        <div className="flex flex-col gap-3">
          <Campo etiqueta="Alias">
            <input value={alias} onChange={(e) => setAlias(e.target.value)} className="campo" />
          </Campo>
          <Campo etiqueta="Negocio">
            <select value={negocioId} onChange={(e) => setNegocioId(e.target.value)} className="campo">
              {negocios.map((n) => (
                <option key={n.nombre} value={n.nombre}>
                  {n.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Nueva contraseña" ayuda="Déjalo vacío para no cambiarla.">
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="Sin cambios"
              className="campo"
            />
          </Campo>
          {rol === "cliente" && (
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Saldo">
                <input
                  type="number"
                  inputMode="numeric"
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                  className="campo"
                />
              </Campo>
              <Campo etiqueta="Límite crédito">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={limiteCredito}
                  onChange={(e) => setLimiteCredito(e.target.value)}
                  onKeyDown={soloDigitos}
                  className="campo"
                />
              </Campo>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Cuenta activa
          </label>
        </div>

        <button
          onClick={() =>
            onGuardar({
              alias,
              negocio_id: negocioId,
              estatus: activo ? "activo" : "inactivo",
              contrasena: contrasena || undefined,
              saldo: rol === "cliente" ? Number(saldo) : undefined,
              limite_credito: rol === "cliente" ? Number(limiteCredito) : undefined,
            })
          }
          className="w-full mt-4 btn-gold"
        >
          Guardar cambios
        </button>
        <button onClick={onCancelar} className="w-full mt-2 py-2 text-white/40 text-sm hover:text-white">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// Antes se podía entrar a "Operadores" o "Clientes" sin haber creado ningún
// negocio todavía y el formulario igual salía, con un <select> vacío que no
// dejaba avanzar sin explicar por qué -- el orden real es negocio primero,
// siempre (ver v.2/funcionamiento.txt, sección 4: "1. Negocio... 2.
// Operador/Cliente asignados a ese negocio").
function AvisoFaltaNegocio({ onIrANegocios }: { onIrANegocios: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 text-center flex flex-col items-center gap-3">
      <p className="text-4xl">🏢</p>
      <p className="font-bold">Todavía no tienes ningún negocio creado.</p>
      <p className="text-white/40 text-sm max-w-xs">
        Antes de dar de alta operadores o clientes, necesitas crear al menos un negocio: todo
        usuario se asigna a uno.
      </p>
      <button
        onClick={onIrANegocios}
        className="mt-2 px-5 py-2.5 bg-gradient-to-br from-gold to-gold-2 text-navy rounded-xl font-black text-sm"
      >
        Crear mi primer negocio
      </button>
    </div>
  );
}

function TarjetaResumen({ etiqueta, valor, alerta }: { etiqueta: string; valor: string; alerta?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{etiqueta}</p>
      <p className={`font-display text-2xl mt-1 ${alerta ? "text-red-400" : "text-gold"}`}>{valor}</p>
    </div>
  );
}

function ModalCrearNegocio({
  onCancelar,
  onCrear,
}: {
  onCancelar: () => void;
  onCrear: (evento: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 animate-tarjeta max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-gold text-lg tracking-wide">Nuevo negocio</h3>
          <button onClick={onCancelar} className="text-white/40 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <form onSubmit={onCrear} className="flex flex-col gap-3">
          <Campo etiqueta="Nombre del negocio" ayuda="No se podrá cambiar después de creado.">
            <input name="nombre" required placeholder="Ej. Palenque Central" className="campo" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Máx. operadores" ayuda="Cuántos operadores puede tener a la vez.">
              <input
                name="max_operadores"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                defaultValue={3}
                onKeyDown={soloDigitos}
                className="campo"
              />
            </Campo>
            <Campo etiqueta="Corretaje" ayuda="% que se queda la casa por apuesta ganada.">
              <input
                name="corretaje_pct"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.1}
                defaultValue={10}
                onKeyDown={soloNumeroDecimal}
                className="campo"
              />
            </Campo>
          </div>
          <button className="btn-gold mt-1">Crear negocio</button>
        </form>
      </div>
    </div>
  );
}

function ModalCrearUsuario({
  rol,
  negocios,
  onCancelar,
  onCrear,
}: {
  rol: "operador" | "cliente";
  negocios: Negocio[];
  onCancelar: () => void;
  onCrear: (rol: "operador" | "cliente", evento: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 animate-tarjeta max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-gold text-lg tracking-wide">
            Nuevo {rol === "operador" ? "operador" : "cliente"}
          </h3>
          <button onClick={onCancelar} className="text-white/40 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <form onSubmit={(e) => onCrear(rol, e)} className="flex flex-col gap-3">
          <Campo etiqueta="Alias" ayuda="Nombre con el que se le va a identificar en el sistema.">
            <input name="alias" required placeholder="Ej. Juan Pérez" className="campo" />
          </Campo>
          <Campo etiqueta="Celular" ayuda="Es lo que usa para iniciar sesión, como usuario.">
            <input
              name="celular"
              type="tel"
              inputMode="numeric"
              required
              onKeyDown={soloDigitos}
              placeholder="10 dígitos"
              className="campo"
            />
          </Campo>
          <Campo etiqueta="Contraseña">
            <input name="contrasena" required type="password" placeholder="Mínimo recomendado: 8 caracteres" className="campo" />
          </Campo>
          <Campo etiqueta="Negocio al que pertenece">
            <select name="negocio_id" required className="campo">
              <option value="">Selecciona un negocio</option>
              {negocios.map((n) => (
                <option key={n.nombre} value={n.nombre}>
                  {n.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <button className="btn-gold mt-1">Crear {rol === "operador" ? "operador" : "cliente"}</button>
        </form>
      </div>
    </div>
  );
}

// Tabla con alto máximo de 600px (el cuerpo se desplaza dentro, el encabezado
// queda fijo) para que una lista larga de negocios/usuarios no empuje el
// resto del panel hacia abajo sin límite.
// Lista con scroll interno (max-height 600px) en vez de tabla real -- así es
// como funciona el panel de negocios/operadores/clientes en v2 original
// (admin.html: "modal-scroll max-h-[55dvh] overflow-y-auto" + tarjetas, no
// <table>), y el botón "+ Nuevo" abre un modal igual que allá.
function TablaNegocios({
  negocios,
  onVerGanancias,
  onEditar,
  onAlternarActivo,
}: {
  negocios: Negocio[];
  onVerGanancias: (negocio: Negocio) => void;
  onEditar: (negocio: Negocio) => void;
  onAlternarActivo: (negocio: Negocio) => void;
}) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 600 }}>
      {negocios.length === 0 && (
        <p className="text-white/30 text-sm text-center py-4">Todavía no hay negocios registrados.</p>
      )}
      {negocios.map((n) => (
        <div key={n.nombre} className="bg-card/60 border border-border rounded-xl p-3 flex-shrink-0">
          <button
            onClick={() => onVerGanancias(n)}
            className="w-full text-left flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-sm">{n.nombre}</p>
              <p className="text-white/40 text-xs">
                Corretaje {n.corretaje_pct}% · Máx. {n.max_operadores} operadores
              </p>
            </div>
            <span className={`text-xs font-bold flex-shrink-0 ${n.activo ? "text-green-300" : "text-white/30"}`}>
              {n.activo ? "Activo" : "Inactivo"}
            </span>
          </button>
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
            <button
              onClick={() => onEditar(n)}
              className="text-xs font-bold text-gold border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/10"
            >
              Editar
            </button>
            <button
              onClick={() => onAlternarActivo(n)}
              className={`text-xs font-bold border px-3 py-1.5 rounded-lg ${
                n.activo
                  ? "text-red-300 border-red-400/30 hover:bg-red-400/10"
                  : "text-green-300 border-green-400/30 hover:bg-green-400/10"
              }`}
            >
              {n.activo ? "Desactivar" : "Activar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TablaUsuarios({
  rol,
  usuarios,
  onActivarPendiente,
  onVerHistorial,
  onEditar,
  onAlternarEstatus,
}: {
  rol: "operador" | "cliente";
  usuarios: Usuario[];
  onActivarPendiente?: (celular: string) => void;
  onVerHistorial: (rol: "operador" | "cliente", celular: string, alias: string) => void;
  onEditar: (usuario: Usuario) => void;
  onAlternarEstatus: (usuario: Usuario) => void;
}) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 600 }}>
      {usuarios.length === 0 && (
        <p className="text-white/30 text-sm text-center py-4">
          Todavía no hay {rol === "operador" ? "operadores" : "clientes"} registrados.
        </p>
      )}
      {usuarios.map((u) => (
        <div key={u.celular} className="bg-card/60 border border-border rounded-xl p-3 flex-shrink-0">
          <button
            onClick={() => onVerHistorial(rol, u.celular, u.alias)}
            className="w-full text-left flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-sm">{u.alias}</p>
              <p className="text-white/40 text-xs">
                Celular {u.celular} · negocio {u.negocio_id}
                {rol === "cliente" ? ` · saldo actual $${u.saldo.toLocaleString("es-MX")}` : ""}
              </p>
            </div>
            {u.estatus === "pendiente" && onActivarPendiente ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onActivarPendiente(u.celular);
                }}
                className="text-xs font-bold text-gold border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/10 flex-shrink-0"
                title="Activa la cuenta que se registró sola por el link público"
              >
                Activar cuenta
              </span>
            ) : (
              <span
                className={`text-xs font-bold flex-shrink-0 ${u.estatus === "activo" ? "text-green-300" : "text-white/30"}`}
              >
                {u.estatus === "activo" ? "Activo" : "Inactivo"}
              </span>
            )}
          </button>

          {u.estatus !== "pendiente" && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
              <button
                onClick={() => onEditar(u)}
                className="text-xs font-bold text-gold border border-gold/30 px-3 py-1.5 rounded-lg hover:bg-gold/10"
              >
                Editar
              </button>
              <button
                onClick={() => onAlternarEstatus(u)}
                className={`text-xs font-bold border px-3 py-1.5 rounded-lg ${
                  u.estatus === "activo"
                    ? "text-red-300 border-red-400/30 hover:bg-red-400/10"
                    : "text-green-300 border-green-400/30 hover:bg-green-400/10"
                }`}
              >
                {u.estatus === "activo" ? "Desactivar" : "Activar"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
