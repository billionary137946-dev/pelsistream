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
  | "operadorHistorial"
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
      texto: "Apuesta = pelea rojo contra verde. Quiniela = varios apostadores por lugar (Ventaja, Mano a mano, Pares y nones…).",
      consejo: "Solo puede haber una quiniela a la vez y siempre va en el slot 1.",
    },
    {
      objetivo: '[data-guia="op-slots"]',
      titulo: "Tus 5 slots",
      texto: "Lleva hasta 5 jugadas al mismo tiempo. Cada número guarda su propia jugada; cambia entre ellos sin perder nada.",
      consejo: "Al iniciar una jugada se abre el siguiente slot.",
    },
    {
      objetivo: '[data-guia="op-definir"]',
      titulo: "Define la jugada",
      texto: "Nombre del palenque, número de jugada y el nombre de cada equipo. Luego toca Iniciar.",
      consejo: "Si el número de jugada ya se usó en ese palenque, el campo se pone rojo.",
    },
    {
      objetivo: '[data-guia="op-cliente"]',
      titulo: "Elige al cliente",
      texto: "Búscalo por alias o celular y tócalo en la lista. Solo salen clientes activos de tu negocio.",
    },
    {
      objetivo: '[data-guia="op-colores"]',
      titulo: "Toca el color y listo",
      texto: "Con cliente y monto ($500 a $1,000,000), al tocar rojo o verde la apuesta se registra y se descuenta de su saldo.",
    },
    {
      objetivo: '[data-guia="op-cerrar"]',
      titulo: "Cierra la apuesta",
      texto: "Elige quién ganó. Ganador cobra menos el corretaje; empate o cancelada regresa la apuesta completa.",
      consejo: "Se activa cuando ya hay apuestas de los dos colores.",
    },
    {
      objetivo: '[data-guia="op-quiniela"]',
      titulo: "Agrega apostadores",
      texto: "Escribe cada nombre y tócalo en Agregar. Al cerrar, marca a los ganadores y confirma.",
    },
    {
      objetivo: '[data-guia="op-palenques"]',
      titulo: "Palenques abiertos",
      texto: "Lo apostado a cada color en las jugadas que siguen abiertas, con quién apostó y cuánto.",
    },
    {
      objetivo: '[data-guia="menu"]',
      titulo: "Jugadas e Historial",
      texto: "Abajo cambias entre registrar jugadas y ver tu historial.",
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
      objetivo: '[data-guia="op-historial"]',
      titulo: "Tu historial",
      texto: "Cada apuesta con su color, monto, fecha y resultado.",
      consejo: "Las pendientes tienen “Editar”: corrige monto o color antes de cerrar y el saldo se ajusta solo.",
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
