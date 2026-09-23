// ============================================================
//  CÓDIGO.GS  —  PELI STREAMS  v2.0  —  Sistema de Apuestas
//  Reescritura desde cero. Construcción incremental, hoja por hoja.
//
//  Hoja de cálculo: https://docs.google.com/spreadsheets/d/1gRHiPnwCoqDPt5R4QEX_qBeNcdOGPH9phik9-i0VUF8/edit
//
//  Hojas integradas hasta ahora:
//  LOGIN    → celular | password | rol | alias | saldo | limite_credito | negocio_id | estatus | fecha_registro
//  NEGOCIOS → N_NEGOCIOS | activo | max_operadores | corretaje_pct | fecha | creado_por
//  JUGADAS  → Tipo | EVENTO | Cliente | Color | Monto | CORRETAJE | Resultado | Neto | Operador | Fecha
//  MOVIMIENTOS → Cliente | Tipo | palenque | Monto | Saldo_antes | Saldo_después | Fecha | Operador
// ============================================================

// ─── ID de la hoja de cálculo ──────────────────────────────────
var SS_ID = '1gRHiPnwCoqDPt5R4QEX_qBeNcdOGPH9phik9-i0VUF8';

// ─── HOJA: LOGIN ────────────────────────────────────────────────
// Contiene una fila por CADA usuario del sistema (admin, operador y cliente).
// El "rol" es lo que distingue el tipo de usuario y qué panel le corresponde.
var LOGIN = {
  NOMBRE: 'LOGIN',
  COL: {
    CELULAR:        'celular',        // Número de celular del usuario. Es su identificador único de acceso (equivale a "usuario").
    PASSWORD:       'password',       // Contraseña de acceso.
    ROL:            'rol',            // Tipo de usuario: 'admin' | 'operador' | 'cliente'. Define qué panel/vista carga tras el login.
    ALIAS:          'alias',          // Nombre o apodo visible del usuario dentro del sistema.
    SALDO:          'saldo',          // Saldo actual del usuario (aplica principalmente a clientes).
    LIMITE_CREDITO: 'limite_credito', // Límite de crédito permitido antes de bloquear nuevas apuestas.
     N_NEGOCIOS:     'negocio_id',     // ID del negocio al que pertenece el usuario (relaciona con la hoja NEGOCIOS).
    ESTATUS:        'estatus',        // Estado de la cuenta: activo / inactivo. Un usuario inactivo no puede iniciar sesión.
    FECHA_REGISTRO: 'fecha_registro'  // Fecha en que el usuario fue dado de alta en el sistema.
  }
};

// ─── HOJA: NEGOCIOS ─────────────────────────────────────────────
// Contiene una fila por CADA negocio (casa de apuestas) dado de alta en el sistema.
var NEGOCIOS = {
  NOMBRE: 'NEGOCIOS',
  COL: {
    N_NEGOCIOS:     'N_NEGOCIOS',     // Identificador/nombre del negocio (relaciona con negocio_id de LOGIN).
    ACTIVO:         'activo',         // Estado del negocio: activo / inactivo.
    MAX_OPERADORES: 'max_operadores', // Límite de operadores permitidos para este negocio.
    CORRETAJE_PCT:  'corretaje_pct',  // Porcentaje de corretaje (ganancia de la casa) sobre las apuestas.
    FECHA:          'fecha',          // Fecha de alta del negocio.
    CREADO_POR:     'creado_por'      // Usuario (celular) que dio de alta el negocio.
  }
};

// ─── HOJA: JUGADAS ──────────────────────────────────────────────
// Contiene una fila por CADA apuesta individual registrada por un operador.
var JUGADAS = {
  NOMBRE: 'JUGADAS',
  COL: {
    TIPO:      'Tipo',      // Tipo de jugada/apuesta.
    EVENTO:    'EVENTO',    // Evento sobre el que se apuesta.
    CLIENTE:   'Cliente',   // Cliente que realizó la apuesta (relaciona con LOGIN).
    COLOR:     'Color',     // Color elegido por el cliente en la apuesta.
    MONTO:     'Monto',     // Monto apostado.
    CORRETAJE: 'CORRETAJE', // Corretaje (comisión de la casa) generado por esta apuesta.
    RESULTADO: 'Resultado', // Resultado de la apuesta: ganada / perdida.
    NETO:      'Neto',      // Ganancia o pérdida neta del cliente tras el corretaje.
    OPERADOR:  'Operador',  // Operador (celular) que registró la apuesta.
    FECHA:     'Fecha'      // Fecha en que se registró la apuesta.
  }
};

// ─── HOJA: MOVIMIENTOS ──────────────────────────────────────────
// Contiene una fila por CADA movimiento de saldo de un cliente (histórico de saldo).
var MOVIMIENTOS = {
  NOMBRE: 'MOVIMIENTOS',
  COL: {
    CLIENTE:        'Cliente',        // Cliente al que pertenece el movimiento (relaciona con LOGIN).
    TIPO:           'Tipo',           // Tipo de movimiento (ej. apuesta, depósito, retiro, ajuste).
    PALENQUE:       'palenque',       // Palenque/evento al que está ligado el movimiento.
    MONTO:          'Monto',          // Monto del movimiento.
    SALDO_ANTES:    'Saldo_antes',    // Saldo del cliente antes del movimiento.
    SALDO_DESPUES:  'Saldo_después',  // Saldo del cliente después del movimiento.
    FECHA:          'Fecha',          // Fecha en que ocurrió el movimiento.
    OPERADOR:       'Operador'        // Operador (celular) que generó el movimiento.
  }
};

// ─── HELPERS DE HOJA ────────────────────────────────────────────
var _SS = null;
function ss() { if (!_SS) _SS = SpreadsheetApp.openById(SS_ID); return _SS; }

// Devuelve la hoja o lanza un error claro si no existe (evita fallos silenciosos).
function hoja(nombre) {
  var h = ss().getSheetByName(nombre);
  if (!h) throw new Error('Hoja "' + nombre + '" no encontrada en el spreadsheet.');
  return h;
}

// Limpia valores vacíos/erróneos que llegan de la hoja o del cliente.
function L(v) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  return (s === '' || s.toLowerCase() === 'nan' || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') ? '' : s;
}

function ahora() { return new Date().toLocaleString('es-MX'); }

// Extrae una columna completa (desde la primera fila de datos hasta el
// final de "vals") como arreglo 2D de una sola columna, listo para pasar
// directo a Range.setValues() — para escribir muchas filas de una columna
// en UNA sola llamada a la API de Sheets en vez de una llamada por fila
// (ver declararGanadorEvento: cerrar un evento con 50 apuestas pendientes
// pasó de ~150 llamadas setValue() a 3 llamadas setValues()).
function _columnaComoRango(vals, hr, colIdx) {
  var out = [];
  for (var i = hr + 1; i < vals.length; i++) out.push([vals[i][colIdx]]);
  return out;
}

// Detecta la fila de encabezados (por si hay filas vacías o de título antes).
function _headerRow(vals) {
  for (var r = 0; r < Math.min(5, vals.length); r++) {
    var txt = vals[r].filter(function(c){ return c !== '' && c !== null && isNaN(Number(c)) && !(c instanceof Date); }).length;
    if (txt >= 2) return r;
  }
  return 0;
}

// Lee una hoja completa y la devuelve como arreglo de objetos {encabezado: valor}.
// Nunca lanza error hacia afuera: si algo falla, regresa arreglo vacío y lo deja en el log.
function leerHoja(nombreHoja) {
  try {
    var h = hoja(nombreHoja);
    var vals = h.getDataRange().getValues();
    if (vals.length < 2) return [];
    var hr = _headerRow(vals);
    var heads = vals[hr].map(function(c){ return L(c); });
    return vals.slice(hr + 1).map(function(fila) {
      if (fila.every(function(c){ return c === '' || c === null || c === undefined; })) return null;
      var obj = {};
      heads.forEach(function(head, i) {
        if (!head) return;
        var val = fila[i];
        obj[head] = (val instanceof Date) ? val.toLocaleString('es-MX') : (val === null || val === undefined ? '' : val);
      });
      return obj;
    }).filter(Boolean);
  } catch (e) {
    Logger.log('leerHoja(' + nombreHoja + '): ' + e.message);
    return [];
  }
}

// ─── CACHÉ DE LOGIN (por ejecución) ─────────────────────────────
// LOGIN se consulta muchísimas veces por request: _negocioDeCliente y
// _aliasDe se llaman UNA VEZ POR CADA FILA de JUGADAS en funciones como
// getEventosAbiertos, getNumerosUsados, getHistorialJugadas y
// declararGanadorEvento. Sin caché, cada una de esas llamadas releía y
// reparseaba la hoja LOGIN completa — con miles de filas en JUGADAS eso
// son miles de lecturas completas de LOGIN en una sola llamada. Aquí se
// lee LOGIN una sola vez por ejecución y se indexa por celular; cualquier
// función que escriba en LOGIN debe invalidar este caché después de escribir.
//
// _loginRaw() guarda además la hoja/encabezados/filas SIN filtrar (para
// saber en qué número de fila real vive cada celular) — así registrarApuesta,
// declararGanadorEvento, editarApuestaPendiente y _editarUsuarioLogin ya no
// tienen que volver a leer y escanear LOGIN completa solo para encontrar la
// fila que van a editar: la buscan en O(1) en vez de O(n) por escritura.
var _loginRawCache = null;
function _loginRaw() {
  if (!_loginRawCache) {
    var h = hoja(LOGIN.NOMBRE);
    var vals = h.getDataRange().getValues();
    var hr = _headerRow(vals);
    var heads = vals[hr].map(function (c) { return L(c); });
    _loginRawCache = { h: h, vals: vals, hr: hr, heads: heads };
  }
  return _loginRawCache;
}

var _loginCache = null;
function _loginIndex() {
  if (!_loginCache) {
    var raw = _loginRaw();
    var vals = raw.vals, heads = raw.heads, hr = raw.hr;
    var filas = [], porCelular = {}, filaPorCelular = {};
    for (var r = hr + 1; r < vals.length; r++) {
      var fila = vals[r];
      if (fila.every(function (c) { return c === '' || c === null || c === undefined; })) continue;
      var obj = {};
      heads.forEach(function (head, i) {
        if (!head) return;
        var val = fila[i];
        obj[head] = (val instanceof Date) ? val.toLocaleString('es-MX') : (val === null || val === undefined ? '' : val);
      });
      filas.push(obj);
      var cel = L(obj[LOGIN.COL.CELULAR]).toLowerCase();
      if (cel) {
        porCelular[cel] = obj;
        filaPorCelular[cel] = r + 1; // fila real de la hoja (1-based, lista para getRange)
      }
    }
    _loginCache = { filas: filas, porCelular: porCelular, filaPorCelular: filaPorCelular };
  }
  return _loginCache;
}
function _invalidarLoginCache() { _loginCache = null; _loginRawCache = null; }

// Escribe UNA celda de la fila de "celular" en LOGIN usando la fila ya
// indexada por _loginIndex() (O(1)) en vez de releer/escanear la hoja
// completa (O(n)) como hacía antes cada función que tocaba LOGIN por
// separado. Devuelve false si el celular no existe (nada que escribir).
function _escribirCeldaLogin(celular, columna, valor) {
  var fila = _loginIndex().filaPorCelular[L(celular).toLowerCase()];
  if (!fila) return false;
  var col = _loginRaw().heads.indexOf(columna);
  if (col === -1) return false;
  hoja(LOGIN.NOMBRE).getRange(fila, col + 1).setValue(valor);
  return true;
}

// ─── DEDUPE DE INTENTOS (conexión mala) ─────────────────────────
// Con conexión mala, la respuesta de una escritura puede perderse en el
// camino aunque la escritura sí se haya hecho: el operador ve "algo salió
// mal", reintenta, y sin esto se duplicaría el efecto (cobrar dos veces la
// misma apuesta, pagar dos veces la misma quiniela). El cliente manda un
// intento_id que se mantiene igual mientras reintenta EL MISMO intento; acá
// se recuerda el resultado unos minutos en CacheService (persiste entre
// ejecuciones, a diferencia de una variable normal) y, si vuelve a llegar
// el mismo intento_id, se regresa el resultado ya calculado sin repetir la
// escritura ni volver a tocar el saldo del cliente.
function _resultadoDeIntento(intentoId) {
  if (!intentoId) return null;
  try {
    var v = CacheService.getScriptCache().get('intento_' + intentoId);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null; // si el caché falla, simplemente no hay dedupe — no debe romper el flujo
  }
}
function _recordarIntento(intentoId, resultado) {
  if (!intentoId) return;
  try {
    CacheService.getScriptCache().put('intento_' + intentoId, JSON.stringify(resultado), 300); // 5 min
  } catch (e) { /* ídem: el dedupe es un extra, no algo de lo que dependa el flujo principal */ }
}

// ─── AUTENTICACIÓN Y SESIÓN ─────────────────────────────────────
// Busca un usuario en LOGIN por celular. Devuelve null si no existe.
function _buscarUsuarioPorCelular(celular) {
  var cel = L(celular).toLowerCase();
  if (!cel) return null;
  return _loginIndex().porCelular[cel] || null;
}

// Valida celular + password contra LOGIN. Nunca lanza error: siempre regresa
// { ok, rol, alias, negocio_id, saldo, limite_credito } o { ok:false, error, inactivo }.
function validarLogin(celular, password) {
  try {
    var cel = L(celular), pass = L(password);
    if (!cel || !pass) return { ok: false, error: 'Ingresa celular y contraseña.' };

    var usuario = _buscarUsuarioPorCelular(cel);
    if (!usuario || L(usuario[LOGIN.COL.PASSWORD]) !== pass)
      return { ok: false, error: 'Celular o contraseña incorrectos.' };

    var estatus = L(usuario[LOGIN.COL.ESTATUS]).toLowerCase();
    if (estatus === 'inactivo')
      return { ok: false, inactivo: true, error: 'Usuario inactivo. Contacta al administrador.' };
    if (estatus === 'pendiente')
      return { ok: false, pendiente: true, error: 'Tu cuenta está pendiente de activación. Contacta al administrador.' };

    var rol = L(usuario[LOGIN.COL.ROL]).toLowerCase();
    if (['admin', 'operador', 'cliente'].indexOf(rol) === -1)
      return { ok: false, error: 'Este usuario no tiene un rol válido asignado.' };

    return {
      ok: true,
      rol: rol,
      alias: L(usuario[LOGIN.COL.ALIAS]),
      negocio_id: L(usuario[LOGIN.COL.N_NEGOCIOS]),
      saldo: usuario[LOGIN.COL.SALDO] || 0,
      limite_credito: usuario[LOGIN.COL.LIMITE_CREDITO] || 0,
      url: getAppUrl() // se manda de una vez para no hacer un segundo viaje al servidor
    };
  } catch (e) {
    Logger.log('validarLogin: ' + e.message);
    return { ok: false, error: 'Error del servidor. Intenta de nuevo.' };
  }
}

// Revalida la sesión de un usuario contra LOGIN antes de servir un panel o
// antes de una acción sensible: confirma que sigue existiendo, activo y con
// el rol correspondiente a la vista que está pidiendo. Así evita que alguien
// entre a /admin cambiando la URL, o que una cuenta desactivada a medio uso
// siga operando.
function validarSesion(celular, rolEsperado) {
  try {
    var cel = L(celular), rol = L(rolEsperado).toLowerCase();
    if (!cel || !rol) return { ok: false, error: 'Sesión inválida.' };

    var usuario = _buscarUsuarioPorCelular(cel);
    if (!usuario) return { ok: false, error: 'Usuario no encontrado.' };

    if (L(usuario[LOGIN.COL.ESTATUS]).toLowerCase() === 'inactivo')
      return { ok: false, error: 'Usuario inactivo. Contacta al administrador.' };

    if (L(usuario[LOGIN.COL.ROL]).toLowerCase() !== rol)
      return { ok: false, error: 'No tienes permiso para acceder a este panel.' };

    return {
      ok: true,
      alias: L(usuario[LOGIN.COL.ALIAS]),
      negocio_id: L(usuario[LOGIN.COL.N_NEGOCIOS]),
      saldo: usuario[LOGIN.COL.SALDO] || 0,
      limite_credito: usuario[LOGIN.COL.LIMITE_CREDITO] || 0
    };
  } catch (e) {
    Logger.log('validarSesion: ' + e.message);
    return { ok: false, error: 'Error del servidor. Intenta de nuevo.' };
  }
}

// ─── ROUTER (doGet) ─────────────────────────────────────────────
// Cada vista protegida se revalida contra LOGIN antes de servirse: si la
// sesión ya no es válida (usuario borrado, desactivado, o rol distinto),
// regresa al login en vez de mostrar el panel a medias o con datos de otro rol.
function doGet(e) {
  // Si algo truena aquí (hoja renombrada, archivo HTML faltante, etc.), el
  // visitante vería la pantalla de error genérica de Google en vez de la
  // app — este try/catch evita eso y muestra algo entendible en su lugar.
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var vista = L(p.vista || 'login').toLowerCase();
    var celular = L(p.celular);
    // "embed=netlify" viaja en cada link interno cuando la app se abre dentro
    // del <iframe> de Netlify (ver index/index.html) — así cada página sabe
    // que debe navegar por postMessage en vez de mover window.top, para que
    // la URL de arriba se quede siempre en pelistream.netlify.app.
    var embed = L(p.embed);

    // "registro" es pública: no requiere sesión, es para gente que aún no tiene cuenta.
    if (vista === 'registro') return _servir('registro', { negocio_id: L(p.negocio_id), embed: embed });

    var vistasProtegidas = { admin: true, operador: true, cliente: true };

    if (vistasProtegidas[vista]) {
      var sesion = validarSesion(celular, vista);
      if (!sesion.ok) return _servir('login', { embed: embed });
      return _servir(vista, {
        celular: celular,
        alias: sesion.alias,
        negocio_id: sesion.negocio_id,
        embed: embed
      });
    }

    return _servir('login', { embed: embed });
  } catch (err) {
    Logger.log('doGet: ' + err.message);
    return HtmlService.createHtmlOutput(
      '<body style="background:#050d24;color:#fff;font-family:sans-serif;text-align:center;padding:3rem 1rem;">' +
      '<h2>😕 No se pudo cargar Peli Streams</h2>' +
      '<p style="color:rgba(255,255,255,.5)">Intenta recargar la página en unos segundos. Si sigue igual, avísale al administrador.</p>' +
      '</body>'
    );
  }
}

function _servir(archivo, vars) {
  var tpl = HtmlService.createTemplateFromFile(archivo);
  Object.keys(vars || {}).forEach(function(k){ tpl[k] = vars[k]; });
  if (typeof tpl.celular === 'undefined')    tpl.celular = '';
  if (typeof tpl.alias === 'undefined')      tpl.alias = '';
  if (typeof tpl.negocio_id === 'undefined') tpl.negocio_id = '';
  if (typeof tpl.embed === 'undefined')      tpl.embed = '';
  tpl.url = getAppUrl();
  return tpl.evaluate()
    .setTitle('Peli Streams')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAppUrl() {
  try { return ScriptApp.getService().getUrl(); } catch (e) { return ''; }
}

// ─── DASHBOARD ADMIN (Inicio) ───────────────────────────────────
// Convierte el valor de una celda de fecha (Date real o texto) a un objeto Date.
function _parseFechaCelda(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Cuenta clientes con saldo negativo (en deuda). Es un corte del momento,
// no depende del filtro de fecha (Hoy/Semana/Mes/Todo).
function _contarClientesEnDeuda() {
  try {
    var filas = _loginIndex().filas;
    return filas.filter(function (u) {
      return L(u[LOGIN.COL.ROL]).toLowerCase() === 'cliente' && Number(u[LOGIN.COL.SALDO]) < 0;
    }).length;
  } catch (e) {
    Logger.log('_contarClientesEnDeuda: ' + e.message);
    return 0;
  }
}

// ─── CACHÉ DE JUGADAS (por ejecución, solo lectura) ─────────────
// getResumenInicio pide tanto el resumen (_jugadasEnRango) como la serie de
// la gráfica (_serieParaFiltro/_corretajePorMes) en una sola llamada — sin
// esto, eso significaba leer y reparsear la hoja JUGADAS completa DOS veces
// por cada carga del dashboard. _jugadasComoObjetos() extiende el mismo
// caché a getEventosAbiertos/getNumerosUsados/getHistorialJugadas/
// getHistorialCliente/getHistorialOperador, que antes hacían CADA UNA su
// propio leerHoja(JUGADAS) independiente — el panel de operador pide 2-3 de
// estas casi al mismo tiempo al cargar, así que eran 2-3 lecturas completas
// de la hoja en un solo refresh. Nada de esto escribe en JUGADAS, pero
// registrarApuesta/declararGanadorEvento/cerrarQuiniela/editarApuestaPendiente
// sí — esas llaman _invalidarJugadasCache() después de escribir, igual que
// el caché de LOGIN, por si alguna vez se combinan lectura+escritura en una
// misma ejecución.
var _jugadasRawCache = null;
function _jugadasRaw() {
  if (!_jugadasRawCache) {
    var h = hoja(JUGADAS.NOMBRE);
    var vals = h.getDataRange().getValues();
    var hr = _headerRow(vals);
    var heads = vals[hr].map(function (c) { return L(c); });
    _jugadasRawCache = { vals: vals, hr: hr, heads: heads };
  }
  return _jugadasRawCache;
}

var _jugadasObjCache = null;
function _jugadasComoObjetos() {
  if (!_jugadasObjCache) {
    var raw = _jugadasRaw();
    var vals = raw.vals, heads = raw.heads, hr = raw.hr;
    var out = [];
    for (var r = hr + 1; r < vals.length; r++) {
      var fila = vals[r];
      if (fila.every(function (c) { return c === '' || c === null || c === undefined; })) continue;
      var obj = {};
      heads.forEach(function (head, i) {
        if (!head) return;
        var val = fila[i];
        obj[head] = (val instanceof Date) ? val.toLocaleString('es-MX') : (val === null || val === undefined ? '' : val);
      });
      out.push(obj);
    }
    _jugadasObjCache = out;
  }
  return _jugadasObjCache;
}
function _invalidarJugadasCache() { _jugadasRawCache = null; _jugadasObjCache = null; }

// Suma el corretaje de JUGADAS mes por mes, para los últimos "nMeses" meses
// (incluyendo el actual). Siempre es una ventana fija de 12 meses, sin
// importar el filtro Hoy/Semana/Mes/Todo que aplica solo a las stat cards.
function _corretajePorMes(nMeses) {
  var MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var hoy = new Date();
  var buckets = [];
  for (var i = nMeses - 1; i >= 0; i--) {
    var d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    var dSig = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1);
    buckets.push({
      anio: d.getFullYear(), mes: d.getMonth(),
      label: MESES[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2), monto: 0,
      desde: d.toISOString(), hasta: dSig.toISOString()
    });
  }
  try {
    var raw = _jugadasRaw();
    var vals = raw.vals;
    if (vals.length > 1) {
      var heads = raw.heads, hr = raw.hr;
      var iFecha = heads.indexOf(JUGADAS.COL.FECHA);
      var iCorretaje = heads.indexOf(JUGADAS.COL.CORRETAJE);
      for (var r = hr + 1; r < vals.length; r++) {
        var fecha = _parseFechaCelda(vals[r][iFecha]);
        if (!fecha) continue;
        for (var b = 0; b < buckets.length; b++) {
          if (fecha.getFullYear() === buckets[b].anio && fecha.getMonth() === buckets[b].mes) {
            buckets[b].monto += Number(vals[r][iCorretaje]) || 0;
            break;
          }
        }
      }
    }
  } catch (e) {
    Logger.log('_corretajePorMes: ' + e.message);
  }
  return buckets;
}

// Retrocede hasta el lunes de la semana que contiene "fecha" (00:00). Es el
// mismo cálculo que usa el cliente para el corte semanal — en Peli Streams
// TODO corte de semana es lunes-a-lunes, sin excepción.
function _lunesDe(fecha) {
  var d = new Date(fecha);
  var dia = d.getDay(); // 0=domingo … 6=sábado
  var diff = (dia === 0) ? -6 : (1 - dia);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Construye la serie que alimenta la gráfica, con la granularidad que
// corresponde al filtro activo: por día en Semana, por semana lunes-a-lunes
// en Mensual (4 o 5, según cómo caigan las semanas ese mes), por mes en Anual.
function _serieParaFiltro(filtro, desde, hasta) {
  var buckets = [];
  var semanasInicio = [];

  if (filtro === 'semana') {
    var nombres = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    for (var i = 0; i < 7; i++) {
      var dDia = new Date(desde); dDia.setDate(dDia.getDate() + i);
      var dDiaSig = new Date(dDia); dDiaSig.setDate(dDiaSig.getDate() + 1);
      buckets.push({ label: nombres[i], monto: 0, desde: dDia.toISOString(), hasta: dDiaSig.toISOString() });
    }
  } else if (filtro === 'mensual') {
    var cursor = _lunesDe(desde);
    var n = 1;
    while (cursor < hasta) {
      semanasInicio.push(new Date(cursor));
      var cursorSig = new Date(cursor); cursorSig.setDate(cursorSig.getDate() + 7);
      buckets.push({ label: 'Sem ' + n, monto: 0, desde: cursor.toISOString(), hasta: cursorSig.toISOString() });
      cursor.setDate(cursor.getDate() + 7);
      n++;
    }
  } else {
    return _corretajePorMes(12); // 'anual' → mensual, últimos 12 meses
  }

  try {
    var raw = _jugadasRaw();
    var vals = raw.vals;
    if (vals.length > 1) {
      var heads = raw.heads, hr = raw.hr;
      var iFecha = heads.indexOf(JUGADAS.COL.FECHA);
      var iCorretaje = heads.indexOf(JUGADAS.COL.CORRETAJE);

      for (var r = hr + 1; r < vals.length; r++) {
        var fecha = _parseFechaCelda(vals[r][iFecha]);
        if (!fecha) continue;
        if (desde && fecha < desde) continue;
        if (hasta && fecha >= hasta) continue;
        var monto = Number(vals[r][iCorretaje]) || 0;

        if (filtro === 'semana') {
          var idx = Math.floor((fecha - desde) / 86400000);
          if (idx >= 0 && idx < 7) buckets[idx].monto += monto;
        } else if (filtro === 'mensual') {
          var idxSemana = Math.floor((fecha - semanasInicio[0]) / (7 * 86400000));
          idxSemana = Math.max(0, Math.min(buckets.length - 1, idxSemana));
          buckets[idxSemana].monto += monto;
        }
      }
    }
  } catch (e) {
    Logger.log('_serieParaFiltro: ' + e.message);
  }

  return buckets;
}

var _aliasCache = {};
function _aliasDe(celular) {
  celular = L(celular);
  if (_aliasCache[celular] === undefined) {
    var u = _buscarUsuarioPorCelular(celular);
    _aliasCache[celular] = u ? (L(u[LOGIN.COL.ALIAS]) || celular) : celular;
  }
  return _aliasCache[celular];
}

// Recorre JUGADAS una vez y arma tanto los totales (jugadas/volumen/corretaje)
// como el detalle fila por fila, dentro de [desde, hasta). La usan tanto el
// resumen de Inicio como el detalle de una barra de la gráfica (mismo cálculo,
// distinto rango). Cliente y Operador llevan alias (para mostrar) y celular
// (para poder abrir su historial al hacer clic).
function _jugadasEnRango(desde, hasta) {
  var jugadas = 0, volumen = 0, corretaje = 0;
  var detalle = [];
  var raw = _jugadasRaw();
  var vals = raw.vals;

  if (vals.length > 1) {
    var heads = raw.heads, hr = raw.hr;
    var iFecha = heads.indexOf(JUGADAS.COL.FECHA);
    var iEvento = heads.indexOf(JUGADAS.COL.EVENTO);
    var iCliente = heads.indexOf(JUGADAS.COL.CLIENTE);
    var iColor = heads.indexOf(JUGADAS.COL.COLOR);
    var iMonto = heads.indexOf(JUGADAS.COL.MONTO);
    var iCorretaje = heads.indexOf(JUGADAS.COL.CORRETAJE);
    var iResultado = heads.indexOf(JUGADAS.COL.RESULTADO);
    var iNeto = heads.indexOf(JUGADAS.COL.NETO);
    var iOperador = heads.indexOf(JUGADAS.COL.OPERADOR);

    for (var r = hr + 1; r < vals.length; r++) {
      var fila = vals[r];
      if (fila.every(function (c) { return c === '' || c === null || c === undefined; })) continue;
      var fecha = _parseFechaCelda(fila[iFecha]);
      if (!fecha) continue;
      if (desde && fecha < desde) continue;
      if (hasta && fecha >= hasta) continue;
      jugadas++;
      volumen += Number(fila[iMonto]) || 0;
      corretaje += Number(fila[iCorretaje]) || 0;

      var celCliente = L(fila[iCliente]);
      var celOperador = L(fila[iOperador]);
      detalle.push({
        evento: L(fila[iEvento]),
        cliente: _aliasDe(celCliente),
        cliente_celular: celCliente,
        operador: _aliasDe(celOperador),
        operador_celular: celOperador,
        color: L(fila[iColor]),
        monto: Number(fila[iMonto]) || 0,
        corretaje: Number(fila[iCorretaje]) || 0,
        resultado: L(fila[iResultado]),
        neto: fila[iNeto],
        fecha: (fila[iFecha] instanceof Date) ? fila[iFecha].toLocaleString('es-MX') : L(fila[iFecha])
      });
    }
  }

  detalle.reverse();
  return { jugadas: jugadas, volumen: volumen, corretaje: corretaje, detalle: detalle };
}

// Resumen del panel Inicio del admin: jugadas, volumen, corretaje y deudas
// dentro del rango [desdeISO, hastaISO) elegido con el filtro Semana/Mes/Todo,
// más la serie que alimenta la gráfica con la granularidad de ese mismo filtro.
// desdeISO/hastaISO llegan como texto ISO desde el cliente, o vacíos para "Todo".
function getResumenInicio(filtro, desdeISO, hastaISO) {
  try {
    var desde = desdeISO ? new Date(desdeISO) : null;
    var hasta = hastaISO ? new Date(hastaISO) : null;
    var r = _jugadasEnRango(desde, hasta);

    return {
      ok: true,
      jugadas: r.jugadas,
      volumen: r.volumen,
      corretaje: r.corretaje,
      deudas: _contarClientesEnDeuda(),
      serie: _serieParaFiltro(filtro, desde, hasta)
    };
  } catch (e) {
    Logger.log('getResumenInicio: ' + e.message);
    return { ok: false, error: 'No se pudo cargar el resumen de Inicio.' };
  }
}

// Detalle de UNA barra de la gráfica (un día/semana/mes puntual) — se pide
// al hacer clic en la barra, con el rango exacto que ya viene calculado en
// esa barra (ver _serieParaFiltro).
function getDetalleCorte(desdeISO, hastaISO) {
  try {
    var desde = desdeISO ? new Date(desdeISO) : null;
    var hasta = hastaISO ? new Date(hastaISO) : null;
    var r = _jugadasEnRango(desde, hasta);
    return { ok: true, jugadas: r.jugadas, volumen: r.volumen, corretaje: r.corretaje, detalle: r.detalle };
  } catch (e) {
    Logger.log('getDetalleCorte: ' + e.message);
    return { ok: false, error: 'No se pudo cargar el detalle de ese corte.' };
  }
}

// Historial completo (todo el tiempo) de las jugadas que registró un
// operador — para ver, desde admin, qué palenques/clientes ha atendido.
function getHistorialOperador(celular) {
  try {
    var cel = L(celular).toLowerCase();
    if (!cel) return { ok: false, error: 'Falta el celular.' };

    var filas = _jugadasComoObjetos().filter(function (j) {
      return L(j[JUGADAS.COL.OPERADOR]).toLowerCase() === cel;
    });
    filas.reverse();

    var palenques = {}, clientes = {}, corretajeTotal = 0;
    var detalle = filas.map(function (j) {
      var celCliente = L(j[JUGADAS.COL.CLIENTE]);
      if (L(j[JUGADAS.COL.EVENTO])) palenques[L(j[JUGADAS.COL.EVENTO])] = true;
      if (celCliente) clientes[celCliente] = true;
      corretajeTotal += Number(j[JUGADAS.COL.CORRETAJE]) || 0;

      return {
        evento: L(j[JUGADAS.COL.EVENTO]),
        cliente: _aliasDe(celCliente),
        cliente_celular: celCliente,
        color: L(j[JUGADAS.COL.COLOR]),
        monto: Number(j[JUGADAS.COL.MONTO]) || 0,
        corretaje: Number(j[JUGADAS.COL.CORRETAJE]) || 0,
        resultado: L(j[JUGADAS.COL.RESULTADO]),
        neto: j[JUGADAS.COL.NETO],
        fecha: L(j[JUGADAS.COL.FECHA])
      };
    });

    return {
      ok: true,
      alias: _aliasDe(cel),
      detalle: detalle,
      totalPalenques: Object.keys(palenques).length,
      totalClientes: Object.keys(clientes).length,
      corretajeTotal: corretajeTotal
    };
  } catch (e) {
    Logger.log('getHistorialOperador: ' + e.message);
    return { ok: false, error: 'No se pudo cargar el historial del operador.' };
  }
}

// ─── NEGOCIOS (sub-tab "Mi Negocio") ────────────────────────────
// Devuelve la lista de negocios dados de alta.
function getNegocios() {
  try {
    return { ok: true, negocios: leerHoja(NEGOCIOS.NOMBRE) };
  } catch (e) {
    Logger.log('getNegocios: ' + e.message);
    return { ok: false, error: 'No se pudieron cargar los negocios.' };
  }
}

// Crea un negocio nuevo. "nombre" funciona como identificador (N_NEGOCIOS),
// así que debe ser único. Límite de 5 negocios activos, igual que en la v1.
function crearNegocio(datos) {
  try {
    var nombre = L(datos && datos.nombre);
    if (!nombre) return { ok: false, error: 'El nombre del negocio es obligatorio.' };

    var existentes = leerHoja(NEGOCIOS.NOMBRE);

    var yaExiste = existentes.some(function (n) {
      return L(n[NEGOCIOS.COL.N_NEGOCIOS]).toLowerCase() === nombre.toLowerCase();
    });
    if (yaExiste) return { ok: false, error: 'Ya existe un negocio con ese nombre.' };

    var activos = existentes.filter(function (n) {
      return L(String(n[NEGOCIOS.COL.ACTIVO])).toUpperCase() !== 'FALSE';
    });
    if (activos.length >= 5) return { ok: false, error: 'Límite alcanzado: máximo 5 negocios activos.' };

    var maxOperadores = parseInt(datos.max_operadores, 10) || 3;
    var corretajePct = (datos.corretaje_pct !== undefined && datos.corretaje_pct !== '')
      ? parseFloat(datos.corretaje_pct) : 10;
    // Misma validación que editarNegocio (antes crearNegocio no la tenía, así que
    // se podía dar de alta un negocio con corretaje negativo o mayor a 100%).
    if (isNaN(corretajePct) || corretajePct < 0 || corretajePct > 100)
      return { ok: false, error: 'El corretaje debe ser un porcentaje entre 0 y 100.' };
    var creadoPor = L(datos.creado_por);

    hoja(NEGOCIOS.NOMBRE).appendRow([nombre, 'TRUE', maxOperadores, corretajePct, ahora(), creadoPor]);

    return { ok: true };
  } catch (e) {
    Logger.log('crearNegocio: ' + e.message);
    return { ok: false, error: 'No se pudo crear el negocio. Intenta de nuevo.' };
  }
}

// Edita un negocio ya existente (corretaje, máx. operadores, activo/inactivo).
// El nombre (N_NEGOCIOS) NO se puede cambiar: es la clave que relaciona a
// todos sus operadores/clientes en LOGIN — renombrarlo los dejaría huérfanos.
function editarNegocio(datos) {
  try {
    var nombre = L(datos && datos.nombre);
    if (!nombre) return { ok: false, error: 'Falta el nombre del negocio.' };

    var maxOperadores = parseInt(datos.max_operadores, 10) || 1;
    var corretajePct = parseFloat(datos.corretaje_pct);
    if (isNaN(corretajePct) || corretajePct < 0 || corretajePct > 100)
      return { ok: false, error: 'El corretaje debe ser un porcentaje entre 0 y 100.' };
    var activo = L(datos && datos.activo).toLowerCase() !== 'false';

    var h = hoja(NEGOCIOS.NOMBRE);
    var vals = h.getDataRange().getValues();
    var hr = _headerRow(vals);
    var heads = vals[hr].map(function (c) { return L(c); });
    var iNombre = heads.indexOf(NEGOCIOS.COL.N_NEGOCIOS);
    var iActivo = heads.indexOf(NEGOCIOS.COL.ACTIVO);
    var iMaxOp = heads.indexOf(NEGOCIOS.COL.MAX_OPERADORES);
    var iCorretaje = heads.indexOf(NEGOCIOS.COL.CORRETAJE_PCT);

    for (var r = hr + 1; r < vals.length; r++) {
      if (L(vals[r][iNombre]).toLowerCase() === nombre.toLowerCase()) {
        // Si se está REACTIVANDO un negocio (estaba inactivo, ahora activo:true),
        // hay que respetar el mismo límite de 5 negocios activos que ya aplica
        // crearNegocio — antes editarNegocio no lo validaba y se podía reactivar
        // un 6º negocio sin que crearNegocio se enterara.
        var estabaActivo = L(String(vals[r][iActivo])).toUpperCase() !== 'FALSE';
        if (activo && !estabaActivo) {
          var activos = 0;
          for (var r2 = hr + 1; r2 < vals.length; r2++) {
            if (r2 === r) continue;
            if (L(String(vals[r2][iActivo])).toUpperCase() !== 'FALSE') activos++;
          }
          if (activos >= 5) return { ok: false, error: 'Límite alcanzado: máximo 5 negocios activos.' };
        }

        h.getRange(r + 1, iActivo + 1).setValue(activo ? 'TRUE' : 'FALSE');
        h.getRange(r + 1, iMaxOp + 1).setValue(maxOperadores);
        h.getRange(r + 1, iCorretaje + 1).setValue(corretajePct);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Negocio no encontrado.' };
  } catch (e) {
    Logger.log('editarNegocio: ' + e.message);
    return { ok: false, error: 'No se pudo guardar el cambio. Intenta de nuevo.' };
  }
}

// ─── OPERADORES Y CLIENTES (sub-tabs "Mi Negocio") ──────────────
// Operadores y clientes son ambos filas de LOGIN; solo cambia el "rol".

function getOperadores() {
  try {
    var filas = _loginIndex().filas.filter(function (u) {
      return L(u[LOGIN.COL.ROL]).toLowerCase() === 'operador';
    });
    return { ok: true, operadores: filas };
  } catch (e) {
    Logger.log('getOperadores: ' + e.message);
    return { ok: false, error: 'No se pudieron cargar los operadores.' };
  }
}

function getClientes() {
  try {
    var filas = _loginIndex().filas.filter(function (u) {
      return L(u[LOGIN.COL.ROL]).toLowerCase() === 'cliente';
    });
    return { ok: true, clientes: filas };
  } catch (e) {
    Logger.log('getClientes: ' + e.message);
    return { ok: false, error: 'No se pudieron cargar los clientes.' };
  }
}

// Crea una fila en LOGIN con el rol indicado. Común para operador y cliente
// porque comparten la misma hoja y casi los mismos campos.
function _crearUsuarioLogin(datos, rolFijo) {
  try {
    var celular = L(datos && datos.celular).replace(/\D/g, '');
    var password = L(datos && datos.password);
    var alias = L(datos && datos.alias);
    var negocioId = L(datos && datos.negocio_id);

    if (!celular || !password) return { ok: false, error: 'Celular y contraseña son obligatorios.' };
    if (!negocioId) return { ok: false, error: 'Selecciona un negocio.' };
    if (_buscarUsuarioPorCelular(celular)) return { ok: false, error: 'Ya existe un usuario con ese celular.' };

    // NEGOCIOS.max_operadores se guarda y se edita desde admin.html, pero antes
    // nunca se comparaba contra el número real de operadores del negocio al dar
    // de alta uno nuevo — el límite existía solo en la hoja, no en la lógica.
    if (rolFijo === 'operador') {
      var negocio = leerHoja(NEGOCIOS.NOMBRE).filter(function (n) {
        return L(n[NEGOCIOS.COL.N_NEGOCIOS]).toLowerCase() === negocioId.toLowerCase();
      })[0];
      var maxOperadoresNegocio = negocio ? (parseInt(negocio[NEGOCIOS.COL.MAX_OPERADORES], 10) || 0) : 0;
      if (maxOperadoresNegocio) {
        var operadoresActuales = _loginIndex().filas.filter(function (u) {
          return L(u[LOGIN.COL.ROL]).toLowerCase() === 'operador' &&
                 L(u[LOGIN.COL.N_NEGOCIOS]).toLowerCase() === negocioId.toLowerCase() &&
                 L(u[LOGIN.COL.ESTATUS]).toLowerCase() === 'activo';
        }).length;
        if (operadoresActuales >= maxOperadoresNegocio)
          return { ok: false, error: 'Este negocio ya alcanzó su límite de ' + maxOperadoresNegocio + ' operadores.' };
      }
    }

    var saldo = rolFijo === 'cliente' ? (parseFloat(datos.saldo) || 0) : 0;
    var limiteCredito = rolFijo === 'cliente' ? (parseFloat(datos.limite_credito) || 0) : 0;

    hoja(LOGIN.NOMBRE).appendRow([celular, password, rolFijo, alias, saldo, limiteCredito, negocioId, 'activo', ahora()]);
    _invalidarLoginCache();

    return { ok: true };
  } catch (e) {
    Logger.log('_crearUsuarioLogin(' + rolFijo + '): ' + e.message);
    return { ok: false, error: 'No se pudo crear el usuario. Intenta de nuevo.' };
  }
}

function crearOperador(datos) { return _crearUsuarioLogin(datos, 'operador'); }
function crearCliente(datos)  { return _crearUsuarioLogin(datos, 'cliente'); }

// Edita una fila ya existente en LOGIN (operador o cliente). El celular NO
// se puede cambiar (es el identificador de acceso); la contraseña solo se
// actualiza si mandan una nueva (en blanco = se deja la que ya tenía).
// Común para operador y cliente, igual que _crearUsuarioLogin.
function _editarUsuarioLogin(datos, rolFijo) {
  try {
    var celular = L(datos && datos.celular).toLowerCase();
    if (!celular) return { ok: false, error: 'Falta el celular.' };

    var alias = L(datos && datos.alias);
    var negocioId = L(datos && datos.negocio_id);
    var estatus = L(datos && datos.estatus).toLowerCase() === 'inactivo' ? 'inactivo' : 'activo';
    var password = L(datos && datos.password);

    if (!alias) return { ok: false, error: 'El alias es obligatorio.' };
    if (!negocioId) return { ok: false, error: 'Selecciona un negocio.' };

    // Fila vía índice (O(1)) en vez de releer y escanear LOGIN completa (O(n)).
    var idx = _loginIndex();
    var usuario = idx.porCelular[celular];
    var fila = idx.filaPorCelular[celular];
    if (!usuario || fila === undefined || L(usuario[LOGIN.COL.ROL]).toLowerCase() !== rolFijo)
      return { ok: false, error: (rolFijo === 'operador' ? 'Operador' : 'Cliente') + ' no encontrado.' };

    var h = hoja(LOGIN.NOMBRE);
    var heads = _loginRaw().heads;
    h.getRange(fila, heads.indexOf(LOGIN.COL.ALIAS) + 1).setValue(alias);
    h.getRange(fila, heads.indexOf(LOGIN.COL.N_NEGOCIOS) + 1).setValue(negocioId);
    h.getRange(fila, heads.indexOf(LOGIN.COL.ESTATUS) + 1).setValue(estatus);
    if (password) h.getRange(fila, heads.indexOf(LOGIN.COL.PASSWORD) + 1).setValue(password);
    if (rolFijo === 'cliente') {
      h.getRange(fila, heads.indexOf(LOGIN.COL.SALDO) + 1).setValue(parseFloat(datos.saldo) || 0);
      h.getRange(fila, heads.indexOf(LOGIN.COL.LIMITE_CREDITO) + 1).setValue(parseFloat(datos.limite_credito) || 0);
    }
    _invalidarLoginCache();
    return { ok: true };
  } catch (e) {
    Logger.log('_editarUsuarioLogin(' + rolFijo + '): ' + e.message);
    return { ok: false, error: 'No se pudo guardar el cambio. Intenta de nuevo.' };
  }
}

function editarOperador(datos) { return _editarUsuarioLogin(datos, 'operador'); }
function editarCliente(datos)  { return _editarUsuarioLogin(datos, 'cliente'); }

// ─── AUTO-REGISTRO DE CLIENTES (link público) ───────────────────
// Llamada desde registro.html, SIN sesión. El negocio ya viene fijo en el
// link que comparte el admin, así que aquí solo se valida que exista y
// esté activo. La cuenta se crea en estatus "pendiente": no puede iniciar
// sesión hasta que el admin la active desde su panel — evita que cualquiera
// con el link se dé de alta y empiece a operar sin autorización.
function registrarCliente(datos) {
  try {
    var negocioId = L(datos && datos.negocio_id);
    var alias = L(datos && datos.alias);
    var celular = L(datos && datos.celular).replace(/\D/g, '');
    var password = L(datos && datos.password);

    if (!negocioId) return { ok: false, error: 'Falta el negocio. Pide al administrador un link válido.' };
    if (!alias || !celular || !password) return { ok: false, error: 'Completa todos los campos.' };

    var negocio = leerHoja(NEGOCIOS.NOMBRE).filter(function (n) {
      return L(n[NEGOCIOS.COL.N_NEGOCIOS]).toLowerCase() === negocioId.toLowerCase();
    })[0];
    if (!negocio || L(String(negocio[NEGOCIOS.COL.ACTIVO])).toUpperCase() === 'FALSE')
      return { ok: false, error: 'Este negocio ya no está disponible para registro.' };

    if (_buscarUsuarioPorCelular(celular)) return { ok: false, error: 'Ya existe una cuenta con ese celular.' };

    hoja(LOGIN.NOMBRE).appendRow([celular, password, 'cliente', alias, 0, 0, negocioId, 'pendiente', ahora()]);
    _invalidarLoginCache();

    return { ok: true };
  } catch (e) {
    Logger.log('registrarCliente: ' + e.message);
    return { ok: false, error: 'No se pudo completar el registro. Intenta de nuevo.' };
  }
}

// Devuelve el nombre del negocio si existe y está activo (para mostrarlo en
// registro.html antes de que la persona llene el formulario).
function getNegocioPublico(negocioId) {
  try {
    var id = L(negocioId);
    var negocio = leerHoja(NEGOCIOS.NOMBRE).filter(function (n) {
      return L(n[NEGOCIOS.COL.N_NEGOCIOS]).toLowerCase() === id.toLowerCase();
    })[0];
    if (!negocio || L(String(negocio[NEGOCIOS.COL.ACTIVO])).toUpperCase() === 'FALSE') {
      return { ok: false };
    }
    return { ok: true, nombre: negocio[NEGOCIOS.COL.N_NEGOCIOS] };
  } catch (e) {
    Logger.log('getNegocioPublico: ' + e.message);
    return { ok: false };
  }
}

// Para clientes que llegaron por auto-registro (estatus "pendiente"): el
// cliente solo puso alias/celular/contraseña, así que aquí el admin completa
// saldo y límite de crédito Y activa la cuenta en un solo paso.
function completarYActivarCliente(datos) {
  try {
    var cel = L(datos && datos.celular).toLowerCase();
    if (!cel) return { ok: false, error: 'Falta el celular del cliente.' };

    var saldo = parseFloat(datos.saldo) || 0;
    var limiteCredito = parseFloat(datos.limite_credito) || 0;

    // Fila vía índice (O(1)) en vez de releer y escanear LOGIN completa (O(n)).
    var fila = _loginIndex().filaPorCelular[cel];
    if (fila === undefined) return { ok: false, error: 'Cliente no encontrado.' };

    var h = hoja(LOGIN.NOMBRE);
    var heads = _loginRaw().heads;
    h.getRange(fila, heads.indexOf(LOGIN.COL.SALDO) + 1).setValue(saldo);
    h.getRange(fila, heads.indexOf(LOGIN.COL.LIMITE_CREDITO) + 1).setValue(limiteCredito);
    h.getRange(fila, heads.indexOf(LOGIN.COL.ESTATUS) + 1).setValue('activo');
    _invalidarLoginCache();
    return { ok: true };
  } catch (e) {
    Logger.log('completarYActivarCliente: ' + e.message);
    return { ok: false, error: 'No se pudo activar al cliente.' };
  }
}

// ─── PANEL OPERADOR: JUGADAS ─────────────────────────────────────
// JUGADAS no tiene columna negocio_id (a diferencia de v1), así que el
// negocio de cada apuesta/usuario se infiere vía LOGIN → negocio_id.
// Sirve tanto para clientes (dueño de la apuesta) como para operadores
// (para saber a qué negocio pertenece quien hace la llamada).
function _negocioDeCliente(celular) {
  var u = _buscarUsuarioPorCelular(celular);
  return u ? L(u[LOGIN.COL.N_NEGOCIOS]) : '';
}

function _corretajePctDe(negocioId) {
  var neg = leerHoja(NEGOCIOS.NOMBRE).filter(function (n) {
    return L(n[NEGOCIOS.COL.N_NEGOCIOS]).toLowerCase() === L(negocioId).toLowerCase();
  })[0];
  return neg ? (parseFloat(neg[NEGOCIOS.COL.CORRETAJE_PCT]) || 0) : 0;
}

// Clientes activos del negocio del operador (para el buscador al apostar).
// El negocio se deriva del celular del operador, nunca de un parámetro que
// venga del navegador — así un operador no puede pedir clientes de otro negocio.
function getClientesPorNegocio(operadorCelular) {
  try {
    var id = _negocioDeCliente(operadorCelular);
    if (!id) return { ok: false, error: 'No se pudo identificar tu negocio.' };

    var filas = _loginIndex().filas.filter(function (u) {
      return L(u[LOGIN.COL.ROL]).toLowerCase() === 'cliente' &&
             L(u[LOGIN.COL.ESTATUS]).toLowerCase() === 'activo' &&
             L(u[LOGIN.COL.N_NEGOCIOS]).toLowerCase() === id.toLowerCase();
    });
    return { ok: true, clientes: filas };
  } catch (e) {
    Logger.log('getClientesPorNegocio: ' + e.message);
    return { ok: false, error: 'No se pudieron cargar los clientes.' };
  }
}

// Registra una apuesta: descuenta el monto al cliente de inmediato (se le
// regresa solo si gana, vía declararGanadorEvento) y deja la fila en JUGADAS
// con Resultado vacío (pendiente de cierre). El negocio del operador se
// deriva de su celular (no del navegador) y se exige que el cliente sea de
// ESE MISMO negocio — evita que un operador apueste a nombre de clientes ajenos.
function registrarApuesta(datos) {
  try {
    var intentoId = L(datos && datos.intento_id);
    var yaProcesado = _resultadoDeIntento(intentoId);
    if (yaProcesado) return yaProcesado; // mismo intento_id que una llamada reciente ya resuelta: no repetir el cobro

    var evento = L(datos && datos.evento);
    var celular = L(datos && datos.cliente_celular);
    var color = L(datos && datos.color).toLowerCase();
    var monto = parseFloat(datos && datos.monto) || 0;
    var tipo = L(datos && datos.tipo) || 'Apuesta';
    var operador = L(datos && datos.operador);

    if (!evento) return { ok: false, error: 'Falta el nombre del evento.' };
    if (!celular) return { ok: false, error: 'Selecciona un cliente.' };
    if (color !== 'rojo' && color !== 'verde') return { ok: false, error: 'Color inválido (rojo o verde).' };
    if (!monto || monto <= 0) return { ok: false, error: 'El monto debe ser mayor a 0.' };

    // El candado se toma ANTES de leer el saldo, no solo antes de escribirlo:
    // si dos operadores registran casi al mismo tiempo una apuesta del MISMO
    // cliente, sin esto ambas ejecuciones leerían el mismo saldoAntes y la
    // segunda pisaría el descuento de la primera (lost update). Con el
    // candado, la segunda ejecución espera; cuando le toca, invalida el
    // caché y vuelve a leer el saldo ya actualizado por la primera.
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      return { ok: false, error: 'El sistema está ocupado procesando otra apuesta. Intenta de nuevo en unos segundos.' };
    }
    try {
      _invalidarLoginCache();
      var cliente = _buscarUsuarioPorCelular(celular);
      if (!cliente) return { ok: false, error: 'Cliente no encontrado.' };
      // getClientesPorNegocio ya filtra por estatus 'activo' así que el operador
      // normalmente no ve clientes inactivos/pendientes en su buscador, pero
      // registrarApuesta nunca lo revalidaba del lado del servidor — una llamada
      // directa (o una lista de clientes cacheada y desactualizada en el
      // navegador) podía cobrarle una apuesta a un cliente ya desactivado.
      if (L(cliente[LOGIN.COL.ESTATUS]).toLowerCase() !== 'activo')
        return { ok: false, error: 'Ese cliente no está activo.' };

      var negocioOperador = _negocioDeCliente(operador);
      if (!negocioOperador) return { ok: false, error: 'No se pudo identificar tu negocio.' };
      if (L(cliente[LOGIN.COL.N_NEGOCIOS]) !== negocioOperador)
        return { ok: false, error: 'Ese cliente no pertenece a tu negocio.' };

      var saldoAntes = parseFloat(cliente[LOGIN.COL.SALDO]) || 0;
      var limiteCredito = parseFloat(cliente[LOGIN.COL.LIMITE_CREDITO]) || 0;
      var saldoDespues = saldoAntes - monto;

      if (saldoDespues < -limiteCredito)
        return { ok: false, error: 'El cliente no tiene saldo/crédito suficiente para esta apuesta.' };

      // Actualiza saldo del cliente en LOGIN: fila ya conocida por el índice
      // (O(1)) en vez de releer y escanear la hoja completa (O(n)).
      _escribirCeldaLogin(celular, LOGIN.COL.SALDO, saldoDespues);
      _invalidarLoginCache();

      var ts = ahora();

      // Registra el movimiento de saldo
      hoja(MOVIMIENTOS.NOMBRE).appendRow([
        celular, 'apuesta', evento, -monto, saldoAntes, saldoDespues, ts, operador
      ]);

      // Registra la apuesta en JUGADAS (pendiente: Resultado/Corretaje/Neto vacíos)
      hoja(JUGADAS.NOMBRE).appendRow([
        tipo, evento, celular, color, monto, '', '', '', operador, ts
      ]);
      _invalidarJugadasCache();

      var resultado = { ok: true, saldo: saldoDespues };
      _recordarIntento(intentoId, resultado);
      return resultado;
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    Logger.log('registrarApuesta: ' + e.message);
    return { ok: false, error: 'No se pudo registrar la apuesta. Intenta de nuevo.' };
  }
}

// Números de N# Jugada ya usados para un palenque (nombre) dentro del
// negocio del operador — sin importar si esa jugada ya cerró o sigue
// abierta, y sin importar qué operador la haya registrado. El frontend solo
// valida contra las jugadas activas en el propio navegador, así que esto
// cubre lo que ya pasó antes (otra sesión, otro operador, u otro día).
function getNumerosUsados(operadorCelular, nombrePalenque) {
  try {
    var negocioId = _negocioDeCliente(operadorCelular);
    if (!negocioId) return { ok: false, error: 'No se pudo identificar tu negocio.' };

    var nombre = L(nombrePalenque).toLowerCase();
    if (!nombre) return { ok: true, numeros: [] };

    var filas = _jugadasComoObjetos().filter(function (j) {
      return _negocioDeCliente(j[JUGADAS.COL.CLIENTE]) === negocioId;
    });

    var numeros = {};
    filas.forEach(function (j) {
      var ev = L(j[JUGADAS.COL.EVENTO]);
      var m = ev.match(/^(.*) #(\d+)$/);
      if (m && m[1].trim().toLowerCase() === nombre) numeros[m[2]] = true;
    });

    return { ok: true, numeros: Object.keys(numeros) };
  } catch (e) {
    Logger.log('getNumerosUsados: ' + e.message);
    return { ok: false, error: 'No se pudieron revisar los números usados.' };
  }
}

// Eventos con apuestas pendientes (Resultado vacío) del negocio del operador,
// con su volumen por color — para que el operador elija cuál cerrar.
function getEventosAbiertos(operadorCelular) {
  try {
    var id = _negocioDeCliente(operadorCelular);
    if (!id) return { ok: false, error: 'No se pudo identificar tu negocio.' };

    var filas = _jugadasComoObjetos().filter(function (j) {
      return L(j[JUGADAS.COL.RESULTADO]) === '' && _negocioDeCliente(j[JUGADAS.COL.CLIENTE]) === id;
    });

    var aliasCache = {};
    function _aliasDe(celular) {
      if (aliasCache[celular] === undefined) {
        var u = _buscarUsuarioPorCelular(celular);
        aliasCache[celular] = u ? (L(u[LOGIN.COL.ALIAS]) || celular) : celular;
      }
      return aliasCache[celular];
    }

    var porEvento = {};
    filas.forEach(function (j) {
      var ev = L(j[JUGADAS.COL.EVENTO]);
      if (!porEvento[ev]) porEvento[ev] = { evento: ev, apuestas: 0, volRojo: 0, volVerde: 0, detalle: [] };
      porEvento[ev].apuestas++;
      var monto = Number(j[JUGADAS.COL.MONTO]) || 0;
      var color = L(j[JUGADAS.COL.COLOR]).toLowerCase();
      if (color === 'rojo') porEvento[ev].volRojo += monto; else porEvento[ev].volVerde += monto;
      porEvento[ev].detalle.push({ alias: _aliasDe(j[JUGADAS.COL.CLIENTE]), color: color, monto: monto });
    });

    return { ok: true, eventos: Object.keys(porEvento).map(function (k) { return porEvento[k]; }) };
  } catch (e) {
    Logger.log('getEventosAbiertos: ' + e.message);
    return { ok: false, error: 'No se pudieron cargar los eventos abiertos.' };
  }
}

// Cierra un evento: declara el color ganador, calcula corretaje/neto de cada
// apuesta pendiente de ese evento (solo las del negocio del operador) y
// acredita a los clientes que acertaron. A los que perdieron no se les mueve
// el saldo (ya se les había descontado al apostar), pero igual queda el
// registro en MOVIMIENTOS para el historial. El negocio se deriva del celular
// del operador (no de un parámetro del navegador), así no puede cerrar
// eventos de otro negocio aunque falsee la llamada.
// resultado: 'rojo' | 'verde' | 'empate' | 'cancelada' (igual que en v1).
//   rojo/verde → el color que acertó cobra (monto - corretaje); el que
//                perdió no recibe nada más (ya pagó su apuesta al registrarla).
//   empate/cancelada → a TODOS se les regresa el monto íntegro, sin corretaje
//                (la casa no cobra nada en esos dos casos).
function declararGanadorEvento(datos) {
  try {
    var evento = L(datos && datos.evento);
    var resultado = L(datos && datos.color_ganador).toLowerCase();
    var operador = L(datos && datos.operador);

    if (!evento) return { ok: false, error: 'Falta el evento.' };
    if (['rojo', 'verde', 'empate', 'cancelada'].indexOf(resultado) === -1)
      return { ok: false, error: 'Resultado inválido.' };

    var negocioId = _negocioDeCliente(operador);
    if (!negocioId) return { ok: false, error: 'No se pudo identificar tu negocio.' };

    // Candado de todo el cierre: se tocan los saldos de TODOS los clientes que
    // acertaron/recuperan en este evento. Sin esto, cerrar dos eventos casi al
    // mismo tiempo (o cerrar uno mientras otro operador registra una apuesta
    // del mismo cliente) podría pisar saldos entre sí (lost update).
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      return { ok: false, error: 'El sistema está ocupado cerrando otra operación. Intenta de nuevo en unos segundos.' };
    }
    try {
      var esRifaDeColor = resultado === 'rojo' || resultado === 'verde';
      var corretajePct = _corretajePctDe(negocioId) / 100;

      var h = hoja(JUGADAS.NOMBRE);
      var vals = h.getDataRange().getValues();
      var hr = _headerRow(vals);
      var heads = vals[hr].map(function (c) { return L(c); });
      var iEvento = heads.indexOf(JUGADAS.COL.EVENTO);
      var iCliente = heads.indexOf(JUGADAS.COL.CLIENTE);
      var iColor = heads.indexOf(JUGADAS.COL.COLOR);
      var iMonto = heads.indexOf(JUGADAS.COL.MONTO);
      var iCorretaje = heads.indexOf(JUGADAS.COL.CORRETAJE);
      var iResultado = heads.indexOf(JUGADAS.COL.RESULTADO);
      var iNeto = heads.indexOf(JUGADAS.COL.NETO);

      var hLogin = hoja(LOGIN.NOMBRE);
      var valsLogin = hLogin.getDataRange().getValues();
      var hrLogin = _headerRow(valsLogin);
      var headsLogin = valsLogin[hrLogin].map(function (c) { return L(c); });
      var iCelularLogin = headsLogin.indexOf(LOGIN.COL.CELULAR);
      var iSaldoLogin = headsLogin.indexOf(LOGIN.COL.SALDO);

      // Índice celular → fila de LOGIN, construido UNA vez (O(n)). Antes esto
      // se buscaba con un escaneo lineal de LOGIN por cada apuesta que había
      // que pagar (O(n) × cada apuesta pendiente del evento) — con un evento
      // de 50 apuestas y una hoja de usuarios grande, eso se sentía.
      var filaLoginPorCelular = {};
      for (var rl0 = hrLogin + 1; rl0 < valsLogin.length; rl0++) {
        var cel0 = L(valsLogin[rl0][iCelularLogin]).toLowerCase();
        if (cel0) filaLoginPorCelular[cel0] = rl0;
      }

      var movimientos = [];
      var ts = ahora();
      var totalCorretaje = 0, ganadores = 0, perdedores = 0;
      var huboCambioJugadas = false, huboCambioSaldos = false;

      for (var r = hr + 1; r < vals.length; r++) {
        var fila = vals[r];
        if (L(fila[iEvento]) !== evento) continue;
        if (L(fila[iResultado]) !== '') continue; // ya resuelta

        var celular = L(fila[iCliente]);
        if (_negocioDeCliente(celular) !== negocioId) continue; // no es de este negocio

        var color = L(fila[iColor]).toLowerCase();
        var monto = Number(fila[iMonto]) || 0;

        var filaResultado, corretaje, neto, saldoDelta, movTipo;

        if (!esRifaDeColor) {
          // Empate o cancelada: se regresa el monto íntegro a todos, sin corretaje.
          filaResultado = resultado;
          corretaje = 0;
          neto = 0;
          saldoDelta = monto;
          movTipo = resultado === 'empate' ? 'devolución (empate)' : 'devolución (cancelada)';
          ganadores++; // cuenta como "resuelta", no como ganada de verdad
        } else {
          var gano = color === resultado;
          filaResultado = gano ? 'ganada' : 'perdida';
          corretaje = gano ? monto * corretajePct : 0;
          neto = gano ? (monto - corretaje) : -monto;
          saldoDelta = gano ? neto : 0;
          movTipo = gano ? 'ganancia' : 'perdida';
          if (gano) { totalCorretaje += corretaje; ganadores++; } else { perdedores++; }
        }

        // Se muta el arreglo YA LEÍDO en memoria en vez de llamar setValue()
        // por celda — la escritura real a la hoja pasa una sola vez, al
        // final, en 3 llamadas setValues() (una por columna) sin importar
        // cuántas filas se resolvieron.
        vals[r][iResultado] = filaResultado;
        vals[r][iCorretaje] = corretaje;
        // En empate/cancelada "neto" ya es 0 (se le devuelve el monto íntegro,
        // sin ganancia ni pérdida real) — antes se guardaba el monto original
        // aquí, lo que hacía ver como "ganancia" algo que solo fue una devolución.
        vals[r][iNeto] = neto;
        huboCambioJugadas = true;

        // Actualiza saldo del cliente (solo si le toca recibir algo: ganó, empate o cancelada).
        if (saldoDelta !== 0) {
          var rl = filaLoginPorCelular[celular.toLowerCase()];
          if (rl !== undefined) {
            var saldoAntes = parseFloat(valsLogin[rl][iSaldoLogin]) || 0;
            var saldoDespues = saldoAntes + saldoDelta;
            valsLogin[rl][iSaldoLogin] = saldoDespues; // por si el mismo cliente aparece en más de una fila
            huboCambioSaldos = true;
            movimientos.push([celular, movTipo, evento, saldoDelta, saldoAntes, saldoDespues, ts, operador]);
          }
        }
      }

      if (ganadores + perdedores === 0)
        return { ok: false, error: 'No hay apuestas pendientes para ese evento.' };

      // Flush: cada columna se escribe completa en UNA sola llamada, en vez
      // de una llamada por fila afectada (ver _columnaComoRango).
      if (huboCambioJugadas) {
        h.getRange(hr + 2, iResultado + 1, vals.length - hr - 1, 1).setValues(_columnaComoRango(vals, hr, iResultado));
        h.getRange(hr + 2, iCorretaje + 1, vals.length - hr - 1, 1).setValues(_columnaComoRango(vals, hr, iCorretaje));
        h.getRange(hr + 2, iNeto + 1, vals.length - hr - 1, 1).setValues(_columnaComoRango(vals, hr, iNeto));
        _invalidarJugadasCache();
      }
      if (huboCambioSaldos) {
        hLogin.getRange(hrLogin + 2, iSaldoLogin + 1, valsLogin.length - hrLogin - 1, 1)
          .setValues(_columnaComoRango(valsLogin, hrLogin, iSaldoLogin));
        _invalidarLoginCache(); // los saldos que se tocaron arriba ya no coinciden con el caché
      }

      if (movimientos.length) {
        var hMov = hoja(MOVIMIENTOS.NOMBRE);
        movimientos.forEach(function (m) { hMov.appendRow(m); });
      }

      return { ok: true, ganadores: ganadores, perdedores: perdedores, corretaje: totalCorretaje };
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    Logger.log('declararGanadorEvento: ' + e.message);
    return { ok: false, error: 'No se pudo cerrar el evento. Intenta de nuevo.' };
  }
}

// ─── QUINIELAS ───────────────────────────────────────────────────
// A diferencia de v1 (que solo vivía en localStorage y nunca tocaba la hoja),
// aquí la quiniela se guarda completa en JUGADAS al momento de cerrarla.
// Los apostadores de una quiniela normalmente NO son clientes con cuenta
// (son lugares vendidos en efectivo), así que no tienen saldo que tocar en
// LOGIN/MOVIMIENTOS. Para poder seguir infiriendo el negocio desde la fila
// (igual que con las apuestas), se guarda el celular del OPERADOR en la
// columna Cliente, y el nombre real del apostador queda dentro de EVENTO.
// sub_tipo replica los 4 tipos de v1: Ventaja | Quiniela | Mano a mano | Pares y nones.
// "Pares y nones" además trae puntos/carta por apostador, que se anexan al EVENTO.
var TIPOS_QUINIELA = ['Ventaja', 'Quiniela', 'Mano a mano', 'Pares y nones'];

function cerrarQuiniela(datos) {
  try {
    var intentoId = L(datos && datos.intento_id);
    var yaProcesado = _resultadoDeIntento(intentoId);
    if (yaProcesado) return yaProcesado; // mismo intento_id que un cierre reciente ya resuelto: no pagar dos veces

    var operador = L(datos && datos.operador);
    var nombreQuiniela = L(datos && datos.nombre);
    var subTipo = L(datos && datos.sub_tipo);
    if (TIPOS_QUINIELA.indexOf(subTipo) === -1) subTipo = 'Quiniela';
    var montoLugar = parseFloat(datos && datos.monto_lugar) || 0;
    var apostadores = (datos && datos.apostadores) || [];

    if (!nombreQuiniela) return { ok: false, error: 'Falta el nombre de la quiniela.' };
    if (!montoLugar || montoLugar <= 0) return { ok: false, error: 'El monto por lugar debe ser mayor a 0.' };
    if (!apostadores.length) return { ok: false, error: 'Agrega al menos un apostador.' };

    var negocioId = _negocioDeCliente(operador);
    if (!negocioId) return { ok: false, error: 'No se pudo identificar tu negocio.' };

    var corretajePct = _corretajePctDe(negocioId) / 100;
    var ts = ahora();
    var totalGanadores = 0, totalCorretaje = 0;

    // Se arman todas las filas en memoria primero y se escriben en UNA sola
    // llamada al final (getRange().setValues()), en vez de un appendRow()
    // por apostador — una quiniela de 20 lugares pasó de 20 llamadas a la
    // API de Sheets a 1 sola.
    var filasNuevas = apostadores.map(function (a) {
      var gano = !!a.ganador;
      var corretaje = gano ? montoLugar * corretajePct : 0;
      var neto = gano ? (montoLugar - corretaje) : -montoLugar;
      if (gano) { totalGanadores++; totalCorretaje += corretaje; }

      var extra = '';
      if (subTipo === 'Pares y nones') {
        var pts = L(a.pts), carta = L(a.carta);
        if (pts) extra += ', ' + pts + ' pts';
        if (carta) extra += ', carta ' + carta;
      }

      return [
        subTipo,
        nombreQuiniela + ' — ' + L(a.nombre) + ' (Lugar ' + a.lugar + extra + ')',
        operador,
        'Lugar ' + a.lugar,
        montoLugar,
        corretaje,
        gano ? 'ganada' : 'perdida',
        neto,
        operador,
        ts
      ];
    });

    // Candado solo para reservar el rango de filas de forma segura: si dos
    // cierres (de negocios/operadores distintos) llegan casi al mismo tiempo,
    // sin esto ambos podrían calcular el mismo "última fila libre" y uno
    // pisaría las filas del otro.
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      return { ok: false, error: 'El sistema está ocupado cerrando otra operación. Intenta de nuevo en unos segundos.' };
    }
    try {
      var h = hoja(JUGADAS.NOMBRE);
      h.getRange(h.getLastRow() + 1, 1, filasNuevas.length, filasNuevas[0].length).setValues(filasNuevas);
      _invalidarJugadasCache();
    } finally {
      lock.releaseLock();
    }

    var resultado = { ok: true, ganadores: totalGanadores, corretaje: totalCorretaje };
    _recordarIntento(intentoId, resultado);
    return resultado;
  } catch (e) {
    Logger.log('cerrarQuiniela: ' + e.message);
    return { ok: false, error: 'No se pudo cerrar la quiniela. Intenta de nuevo.' };
  }
}

// Solo el saldo actual del cliente — se usa para refrescarlo en tiempo real
// en la pantalla de cliente sin recargar toda la sesión.
function getSaldoCliente(celular) {
  try {
    var usuario = _buscarUsuarioPorCelular(celular);
    if (!usuario) return { ok: false, error: 'Usuario no encontrado.' };
    return { ok: true, saldo: usuario[LOGIN.COL.SALDO] || 0 };
  } catch (e) {
    Logger.log('getSaldoCliente: ' + e.message);
    return { ok: false, error: 'No se pudo actualizar el saldo.' };
  }
}

// Historial de jugadas del propio cliente (resueltas y pendientes), más
// recientes primero. Solo sus propias apuestas (JUGADAS.Cliente = su celular).
function getHistorialCliente(celular) {
  try {
    var cel = L(celular).toLowerCase();
    if (!cel) return { ok: false, error: 'Falta el celular.' };

    var filas = _jugadasComoObjetos().filter(function (j) {
      return L(j[JUGADAS.COL.CLIENTE]).toLowerCase() === cel;
    });
    filas.reverse();
    return { ok: true, jugadas: filas };
  } catch (e) {
    Logger.log('getHistorialCliente: ' + e.message);
    return { ok: false, error: 'No se pudo cargar tu historial.' };
  }
}

// Historial de jugadas del negocio del operador (resueltas y pendientes),
// más recientes primero. El negocio se deriva del celular del operador.
function getHistorialJugadas(operadorCelular) {
  try {
    var id = _negocioDeCliente(operadorCelular);
    if (!id) return { ok: false, error: 'No se pudo identificar tu negocio.' };

    var filas = _jugadasComoObjetos().filter(function (j) {
      return _negocioDeCliente(j[JUGADAS.COL.CLIENTE]) === id;
    });
    filas.reverse();
    return { ok: true, jugadas: filas };
  } catch (e) {
    Logger.log('getHistorialJugadas: ' + e.message);
    return { ok: false, error: 'No se pudo cargar el historial.' };
  }
}

// Edita el Monto/Color de una apuesta que AÚN está pendiente (Resultado
// vacío). Solo se permite mientras esté pendiente: una vez cerrada ya se
// pagó/cobró con el monto original, y editarla después descuadraría el
// saldo y el corretaje ya aplicados. Ajusta el saldo del cliente por la
// diferencia entre el monto viejo y el nuevo, y deja el ajuste en MOVIMIENTOS.
function editarApuestaPendiente(datos) {
  try {
    var operador = L(datos && datos.operador);
    var evento = L(datos && datos.evento);
    var celular = L(datos && datos.cliente_celular);
    var fecha = L(datos && datos.fecha);
    var montoNuevo = parseFloat(datos && datos.monto_nuevo) || 0;
    var colorNuevo = L(datos && datos.color_nuevo).toLowerCase();

    if (colorNuevo !== 'rojo' && colorNuevo !== 'verde') return { ok: false, error: 'Color inválido.' };
    if (!montoNuevo || montoNuevo < 500 || montoNuevo > 1000000)
      return { ok: false, error: 'El monto debe ser entre $500 y $1,000,000.' };

    var negocioOperador = _negocioDeCliente(operador);
    if (!negocioOperador) return { ok: false, error: 'No se pudo identificar tu negocio.' };
    if (_negocioDeCliente(celular) !== negocioOperador) return { ok: false, error: 'Esa apuesta no pertenece a tu negocio.' };

    // Candado: esto ajusta el saldo del cliente por la diferencia de monto —
    // mismo riesgo de lost update que registrarApuesta si dos ediciones (o una
    // edición y una apuesta nueva) del mismo cliente llegan casi juntas.
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      return { ok: false, error: 'El sistema está ocupado procesando otra operación. Intenta de nuevo en unos segundos.' };
    }
    try {
      var h = hoja(JUGADAS.NOMBRE);
      var vals = h.getDataRange().getValues();
      var hr = _headerRow(vals);
      var heads = vals[hr].map(function (c) { return L(c); });
      var iEvento = heads.indexOf(JUGADAS.COL.EVENTO);
      var iCliente = heads.indexOf(JUGADAS.COL.CLIENTE);
      var iFecha = heads.indexOf(JUGADAS.COL.FECHA);
      var iColor = heads.indexOf(JUGADAS.COL.COLOR);
      var iMonto = heads.indexOf(JUGADAS.COL.MONTO);
      var iResultado = heads.indexOf(JUGADAS.COL.RESULTADO);

      var filaEncontrada = -1, montoViejo = 0;
      for (var r = hr + 1; r < vals.length; r++) {
        if (L(vals[r][iEvento]) === evento && L(vals[r][iCliente]) === celular &&
            L(vals[r][iFecha]) === fecha && L(vals[r][iResultado]) === '') {
          filaEncontrada = r;
          montoViejo = Number(vals[r][iMonto]) || 0;
          break;
        }
      }
      if (filaEncontrada === -1) return { ok: false, error: 'Esa apuesta ya no está pendiente o no se encontró.' };

      var diferencia = montoNuevo - montoViejo; // positivo = se le descuenta más al cliente

      // Fila de LOGIN vía índice (O(1)) en vez de releer/escanear la hoja
      // completa (O(n)) como antes.
      _invalidarLoginCache(); // por si cambió el saldo mientras esperábamos el candado
      var cliente = _buscarUsuarioPorCelular(celular);
      // Si el cliente de esta apuesta ya no existe en LOGIN (dato corrupto o
      // borrado a mano en la hoja), no se debe tocar el monto/color sin haber
      // podido ajustar el saldo — antes esto se guardaba en silencio y dejaba
      // el saldo descuadrado con el nuevo monto.
      if (!cliente) return { ok: false, error: 'No se encontró al cliente de esta apuesta en LOGIN.' };
      // Mismo caso que registrarApuesta: si el cliente fue desactivado después de
      // apostar pero mientras la apuesta seguía pendiente, no se debe poder
      // ajustar su saldo (subir el monto) sin que esté activo.
      if (L(cliente[LOGIN.COL.ESTATUS]).toLowerCase() !== 'activo')
        return { ok: false, error: 'Ese cliente no está activo.' };

      var saldoAntes = parseFloat(cliente[LOGIN.COL.SALDO]) || 0;
      var limiteCredito = parseFloat(cliente[LOGIN.COL.LIMITE_CREDITO]) || 0;
      var saldoDespues = saldoAntes - diferencia;

      if (saldoDespues < -limiteCredito)
        return { ok: false, error: 'El cliente no tiene saldo/crédito suficiente para este nuevo monto.' };

      _escribirCeldaLogin(celular, LOGIN.COL.SALDO, saldoDespues);
      _invalidarLoginCache();
      hoja(MOVIMIENTOS.NOMBRE).appendRow([
        celular, 'ajuste', evento, -diferencia, saldoAntes, saldoDespues, ahora(), operador
      ]);

      h.getRange(filaEncontrada + 1, iMonto + 1).setValue(montoNuevo);
      h.getRange(filaEncontrada + 1, iColor + 1).setValue(colorNuevo);
      _invalidarJugadasCache();

      return { ok: true };
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    Logger.log('editarApuestaPendiente: ' + e.message);
    return { ok: false, error: 'No se pudo editar la apuesta. Intenta de nuevo.' };
  }
}
