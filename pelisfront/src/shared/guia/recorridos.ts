// Recorridos guiados de Peli Streams (mismo sistema que HGC): la pantalla se oscurece, se marca cada parte
// con borde punteado y una tarjeta explica qué es. UN solo lugar para todos los textos de ayuda.
// objetivo = selector CSS (casi siempre [data-guia="…"]). Si en ese momento no existe o no se ve, el paso se salta.
// Si cambias lo que hace una pantalla, actualiza aquí su texto.
export type PasoRecorrido = { objetivo: string; titulo: string; texto: string; consejo?: string };
export type Pantalla =
  | "adminInicio"
  | "adminNegocios"
  | "adminOperadores"
  | "adminClientes"
  | "operadorJugadas"
  | "operadorApuesta"
  | "operadorQuiniela"
  | "operadorCerrar"
  | "operadorEditar"
  | "operadorHistorial"
  | "operadorClientes"
  | "cliente";

const AYUDA: PasoRecorrido = {
  objetivo: '[data-guia="ayuda"]',
  titulo: "¿Dudas? Toca aquí",
  texto: "Repite este recorrido cuando quieras. Cada pantalla tiene el suyo.",
};

export const RECORRIDOS: Record<Pantalla, PasoRecorrido[]> = {
  adminInicio: [
    {
      objetivo: '[data-guia="admin-pestanas"]',
      titulo: "Tus secciones",
      texto: "Inicio (tus números), Negocios, Operadores y Clientes. Toca una para cambiar.",
      consejo: "El orden para arrancar es: primero un negocio, luego sus operadores y al final sus clientes.",
    },
    {
      objetivo: '[data-guia="admin-resumen"]',
      titulo: "Tus números",
      texto: "Jugadas registradas, volumen apostado, corretaje ganado y cuántos clientes deben (saldo negativo).",
      consejo: "El corretaje es lo que se queda la casa: el % del negocio sobre cada apuesta ganada.",
    },
    AYUDA,
  ],
  adminNegocios: [
    {
      objetivo: '[data-guia="admin-nuevo"]',
      titulo: "Crea un negocio",
      texto: "Cada palenque o punto de venta es un negocio, con su propio % de corretaje y su límite de operadores.",
      consejo: "El nombre no se puede cambiar después. Puedes tener hasta 5 negocios activos.",
    },
    {
      objetivo: '[data-guia="admin-lista"]',
      titulo: "Tus negocios",
      texto: "Toca un negocio para ver sus ganancias: operadores, clientes, jugadas, volumen y corretaje.",
    },
    {
      objetivo: '[data-guia="admin-acciones"]',
      titulo: "Editar o desactivar",
      texto: "Cambia su corretaje o su máximo de operadores. Desactivar no borra nada y se puede revertir.",
    },
    AYUDA,
  ],
  adminOperadores: [
    {
      objetivo: '[data-guia="admin-nuevo"]',
      titulo: "Da de alta un operador",
      texto: "El operador registra apuestas y cierra palenques. Entra con su celular y contraseña.",
      consejo: "Cada negocio tiene un máximo de operadores: si ya está lleno, sube el límite en Negocios.",
    },
    {
      objetivo: '[data-guia="admin-lista"]',
      titulo: "Tus operadores",
      texto: "Toca uno para ver su historial: cada jugada que registró y el corretaje que generó.",
    },
    {
      objetivo: '[data-guia="admin-acciones"]',
      titulo: "Editar o desactivar",
      texto: "Cambia su alias, su negocio o su contraseña. Desactivado ya no puede entrar.",
    },
    AYUDA,
  ],
  adminClientes: [
    {
      objetivo: '[data-guia="admin-nuevo"]',
      titulo: "Da de alta un cliente",
      texto: "El cliente es quien apuesta. Con su celular y contraseña ve su saldo y su historial.",
      consejo: "También se pueden registrar solos con el link /registro?negocio=NOMBRE; llegan como pendientes.",
    },
    {
      objetivo: '[data-guia="admin-lista"]',
      titulo: "Tus clientes",
      texto: "Verás su saldo actual. Toca uno para ver su historial y su neto acumulado.",
      consejo: "Los que se registraron solos dicen “Activar cuenta”: tócalo para darlos de alta.",
    },
    {
      objetivo: '[data-guia="admin-acciones"]',
      titulo: "Editar saldo y crédito",
      texto: "Ajusta su saldo o su límite de crédito, cambia su contraseña o desactívalo.",
    },
    AYUDA,
  ],
  operadorJugadas: [
    {
      objetivo: '[data-guia="op-tipo"]',
      titulo: "Apuesta o Quiniela",
      texto: "Apuesta = pelea rojo contra verde. Quiniela = varios apostadores por lugar (Ventaja, Quiniela, Mano a mano, Pares y nones).",
      consejo: "Solo puede haber una quiniela a la vez y siempre va en el slot 1.",
    },
    {
      objetivo: '[data-guia="op-slots"]',
      titulo: "Tus 5 slots",
      texto: "Lleva hasta 5 jugadas al mismo tiempo. Cada número guarda su propia jugada; cambia entre ellos sin perder nada.",
      consejo: "Al iniciar una jugada se abre el siguiente slot. “Libre” = slot sin jugada.",
    },
    {
      objetivo: '[data-guia="op-palenque"]',
      titulo: "Palenque y número de jugada",
      texto: "Escribe el nombre del palenque y el número de esta jugada (1, 2, 3…).",
      consejo: "Si ese número ya se usó en el mismo palenque, el campo se pone rojo y no te deja iniciar.",
    },
    {
      objetivo: '[data-guia="op-equipos"]',
      titulo: "Los dos equipos",
      texto: "Quién va por el rojo y quién por el verde. Así se verá en las apuestas y en los palenques abiertos.",
    },
    {
      objetivo: '[data-guia="op-posicion"]',
      titulo: "Cambiar posición",
      texto: "Pone el verde a la izquierda y el rojo a la derecha (o al revés), para que coincida con el palenque.",
    },
    {
      objetivo: '[data-guia="op-q-tipo"]',
      titulo: "Tipo de quiniela",
      texto: "Elige Ventaja, Quiniela, Mano a mano o Pares y nones. En Pares y nones también se capturan puntos y carta.",
    },
    {
      objetivo: '[data-guia="op-q-monto"]',
      titulo: "Monto por lugar",
      texto: "Lo que paga cada apostador por su lugar: de $500 a $1,000,000. Al lado pones cuántos lugares hay.",
    },
    {
      objetivo: '[data-guia="op-iniciar"]',
      titulo: "Inicia la jugada",
      texto: "Con eso queda abierta y ya puedes registrar apuestas (o apostadores, si es quiniela).",
    },
    {
      objetivo: '[data-guia="op-palenques"]',
      titulo: "Palenques abiertos",
      texto: "Las jugadas que siguen abiertas: cuánto lleva cada color y quién apostó cuánto. “↻ Actualizar” las trae de nuevo.",
      consejo: "Si tienes varias abiertas, cambia entre ellas con las pestañas de arriba de la tarjeta.",
    },
    {
      objetivo: '[data-guia="menu"]',
      titulo: "Jugadas, Clientes e Historial",
      texto: "Abajo cambias entre registrar jugadas, ver a tus clientes con su dinero y revisar tu historial.",
    },
    AYUDA,
  ],
  operadorApuesta: [
    {
      objetivo: '[data-guia="op-cliente"]',
      titulo: "Elige al cliente",
      texto: "Escribe su alias o celular y tócalo en la lista. Solo salen clientes activos de tu negocio, con su saldo.",
      consejo: "No se puede apostar a nombre de alguien que no esté en la lista.",
    },
    {
      objetivo: '[data-guia="op-monto"]',
      titulo: "El monto",
      texto: "Cuánto apuesta: de $500 a $1,000,000, solo números.",
    },
    {
      objetivo: '[data-guia="op-colores"]',
      titulo: "Toca el color y listo",
      texto: "Al tocar rojo o verde la apuesta queda registrada y se descuenta del saldo del cliente en ese momento.",
      consejo: "No hay otro botón de guardar: el color ES el registro. Revisa cliente y monto antes de tocar.",
    },
    {
      objetivo: '[data-guia="op-cerrar"]',
      titulo: "Cierra la apuesta",
      texto: "Cuando termine la pelea, ciérrala y elige quién ganó.",
      consejo: "Se activa cuando ya hay apuestas de los dos colores.",
    },
    {
      objetivo: '[data-guia="op-volver"]',
      titulo: "Volver a la jugada",
      texto: "Regresa a los datos de la jugada (palenque, número, equipos) sin perder las apuestas.",
    },
    {
      objetivo: '[data-guia="op-palenques"]',
      titulo: "Lo que lleva esta pelea",
      texto: "Aquí ves en vivo cuánto va al rojo, cuánto al verde y quién apostó.",
    },
    AYUDA,
  ],
  operadorQuiniela: [
    {
      objetivo: '[data-guia="op-q-apostador"]',
      titulo: "Agrega apostadores",
      texto: "Escribe el nombre y toca “+ Agregar” (o Enter). Cada uno ocupa el siguiente lugar.",
      consejo: "Los apostadores de quiniela no necesitan cuenta: pagan en efectivo.",
    },
    {
      objetivo: '[data-guia="op-q-lista"]',
      titulo: "Lista de apostadores",
      texto: "Todos los lugares con su monto. Arriba ves cuántos lugares van y el total.",
    },
    {
      objetivo: '[data-guia="op-q-cerrar"]',
      titulo: "Cierra la quiniela",
      texto: "Primer toque: marcas a los ganadores tocándolos en la lista (🏆). Segundo toque: “Confirmar cierre”.",
      consejo: "Si se cae la señal al confirmar, vuelve a tocar: no se cobra dos veces.",
    },
    AYUDA,
  ],
  operadorCerrar: [
    {
      objetivo: '[data-guia="op-r-ganador"]',
      titulo: "¿Quién ganó?",
      texto: "Toca el color ganador. Cada botón muestra cuánto se apostó a ese color.",
      consejo: "Los ganadores cobran menos el corretaje del negocio.",
    },
    {
      objetivo: '[data-guia="op-r-empate"]',
      titulo: "Empate",
      texto: "A todos se les regresa su apuesta completa, sin corretaje.",
    },
    {
      objetivo: '[data-guia="op-r-cancelada"]',
      titulo: "Cancelada",
      texto: "Si la pelea no se hizo: igual que empate, todos recuperan su apuesta completa.",
    },
    {
      objetivo: '[data-guia="op-r-confirmar"]',
      titulo: "Confirma",
      texto: "Revisa la lista y confirma. Ya cerrada, la jugada no se puede editar.",
    },
  ],
  operadorEditar: [
    {
      objetivo: '[data-guia="op-e-monto"]',
      titulo: "Nuevo monto",
      texto: "Corrige cuánto apostó: de $500 a $1,000,000.",
    },
    {
      objetivo: '[data-guia="op-e-color"]',
      titulo: "Color",
      texto: "Cambia el color si se registró al revés.",
    },
    {
      objetivo: '[data-guia="op-e-guardar"]',
      titulo: "Guarda",
      texto: "El saldo del cliente se ajusta solo con la diferencia.",
      consejo: "Solo se pueden editar apuestas pendientes (de peleas que no se han cerrado).",
    },
  ],
  operadorClientes: [
    {
      objetivo: '[data-guia="op-c-resumen"]',
      titulo: "Tus clientes de un vistazo",
      texto: "Cuántos clientes activos tiene tu negocio, cuánto suman sus saldos y cuánto está apostado en peleas que aún no se cierran.",
    },
    {
      objetivo: '[data-guia="op-c-buscar"]',
      titulo: "Busca a alguien",
      texto: "Escribe su nombre o celular. ↻ trae los saldos más recientes.",
    },
    {
      objetivo: '[data-guia="op-c-orden"]',
      titulo: "Ordena la lista",
      texto: "Por nombre, por quién tiene más saldo o por quién tiene más dinero en juego.",
    },
    {
      objetivo: '[data-guia="op-c-lista"]',
      titulo: "Cada cliente",
      texto: "En dorado su saldo (en rojo si debe). Disponible = saldo + crédito: lo máximo que puede apostar. En juego = lo que tiene apostado sin cerrar.",
      consejo: "Solo lo ves; los saldos los cambia el admin o las apuestas.",
    },
    {
      objetivo: '[data-guia="menu"]',
      titulo: "Regresa a Jugadas",
      texto: "Toca Jugadas para seguir registrando apuestas.",
    },
    AYUDA,
  ],
  operadorHistorial: [
    {
      objetivo: '[data-guia="op-filtros"]',
      titulo: "Filtra",
      texto: "Todas tus jugadas o solo las pendientes (las que aún no se cierran).",
    },
    {
      objetivo: '[data-guia="op-actualizar"]',
      titulo: "Actualizar",
      texto: "Vuelve a traer tu historial con lo más nuevo.",
    },
    {
      objetivo: '[data-guia="op-historial"]',
      titulo: "Tu historial",
      texto: "Cada apuesta con su color, monto, fecha y resultado.",
    },
    {
      objetivo: '[data-guia="op-editar"]',
      titulo: "Editar una pendiente",
      texto: "Corrige monto o color antes de cerrar la pelea; el saldo del cliente se ajusta solo.",
    },
    {
      objetivo: '[data-guia="menu"]',
      titulo: "Regresa a Jugadas",
      texto: "Toca Jugadas para seguir registrando.",
    },
    AYUDA,
  ],
  cliente: [
    {
      objetivo: '[data-guia="cli-saldo"]',
      titulo: "Tu saldo",
      texto: "Se actualiza solo cada 5 segundos. Si sale en rojo, debes ese monto.",
    },
    {
      objetivo: '[data-guia="cli-historial"]',
      titulo: "Tu historial",
      texto: "Cada apuesta que hiciste: en qué jugada, a qué color, cuánto y si ganó o sigue pendiente.",
    },
    AYUDA,
  ],
};
