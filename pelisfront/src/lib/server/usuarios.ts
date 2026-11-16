// Puerto de pelisback/app/api/rutas/usuarios.py -- compartido entre
// operador y cliente porque ambos son filas de "usuarios", solo cambia el
// rol. Incluye el bug de v2 ya corregido: max_operadores del negocio se
// guardaba pero nunca se comparaba contra el número real de operadores al
// dar de alta uno nuevo.
import "server-only";
import { sql } from "@/lib/server/db";
import { ErrorHttp } from "@/lib/server/auth";
import { hashearContrasena } from "@/lib/server/seguridad";
import * as V from "@/lib/server/validar";

// ::float8 es importante: postgres.js devuelve columnas "numeric" como
// STRING por default (para no perder precisión), a diferencia de psycopg
// en Python que las regresaba como número -- si se dejara así, el frontend
// (que espera "number" en sus tipos) se rompería en cosas como
// `saldo.toLocaleString()` (no existe en strings) o sumas que en realidad
// concatenan texto ("0" + "150.00" = "0150.00").
const CAMPOS_USUARIO = sql`celular, alias, rol, saldo::float8, limite_credito::float8, negocio_id, estatus, fecha_registro::text`;

export async function listarPorRol(rol: "operador" | "cliente") {
  return sql`
    select ${CAMPOS_USUARIO} from usuarios where rol = ${rol} order by fecha_registro desc
  `;
}

interface DatosCrearUsuario {
  celular: string;
  contrasena: string;
  alias: string;
  negocio_id: string;
  saldo?: number;
  limite_credito?: number;
}

export async function crearUsuario(datos: DatosCrearUsuario, rolFijo: "operador" | "cliente") {
  // Cada campo solo acepta su tipo de dato (lib/server/validar.ts).
  const celular = V.celular(datos.celular);
  const contrasena = V.contrasenaNueva(datos.contrasena);
  const alias = V.texto(datos.alias, "El alias", { max: V.LIMITES.alias });
  if (!datos.negocio_id) throw new ErrorHttp(400, "Selecciona un negocio.");
  const negocioId = V.texto(datos.negocio_id, "El negocio", { max: V.LIMITES.nombreNegocio });
  const saldo = rolFijo === "cliente" ? V.dinero(datos.saldo ?? 0, "El saldo", -V.LIMITES.dineroMax, V.LIMITES.dineroMax) : 0;
  const limiteCredito = rolFijo === "cliente" ? V.dinero(datos.limite_credito ?? 0, "El límite de crédito", 0, V.LIMITES.dineroMax) : 0;

  return sql.begin(async (tx) => {
    const existente = await tx`select 1 from usuarios where celular = ${celular}`;
    if (existente.length > 0) throw new ErrorHttp(409, "Ya existe un usuario con ese celular.");

    if (rolFijo === "operador") {
      const [negocio] = await tx`select max_operadores from negocios where nombre = ${negocioId}`;
      const limite = negocio ? Number(negocio.max_operadores) : 0;
      if (limite) {
        const [{ count: actuales }] = await tx<{ count: number }[]>`
          select count(*)::int from usuarios
          where rol = 'operador' and negocio_id = ${negocioId} and estatus = 'activo'
        `;
        if (actuales >= limite) {
          throw new ErrorHttp(409, `Este negocio ya alcanzó su límite de ${limite} operadores.`);
        }
      }
    }

    const [fila] = await tx`
      insert into usuarios (celular, contrasena_hash, rol, alias, saldo, limite_credito, negocio_id, estatus)
      values (${celular}, ${await hashearContrasena(contrasena)}, ${rolFijo}, ${alias}, ${saldo}, ${limiteCredito}, ${negocioId}, 'activo')
      returning ${CAMPOS_USUARIO}
    `;
    return fila;
  });
}

interface DatosEditarUsuario {
  alias: string;
  negocio_id: string;
  estatus?: string;
  contrasena?: string;
  saldo?: number;
  limite_credito?: number;
}

export async function editarUsuario(celular: string, datos: DatosEditarUsuario, rolFijo: "operador" | "cliente") {
  const alias = V.texto(datos.alias, "El alias", { max: V.LIMITES.alias });
  if (!datos.negocio_id) throw new ErrorHttp(400, "Selecciona un negocio.");
  const negocioId = V.texto(datos.negocio_id, "El negocio", { max: V.LIMITES.nombreNegocio });
  const estatus = datos.estatus === "inactivo" ? "inactivo" : "activo";
  // Contraseña solo si se quiere cambiar (vacía = se deja la actual).
  const contrasenaNueva = datos.contrasena ? V.contrasenaNueva(datos.contrasena) : null;
  const saldoNuevo =
    rolFijo === "cliente" ? V.dinero(datos.saldo ?? 0, "El saldo", -V.LIMITES.dineroMax, V.LIMITES.dineroMax) : null;
  const limiteNuevo =
    rolFijo === "cliente" ? V.dinero(datos.limite_credito ?? 0, "El límite de crédito", 0, V.LIMITES.dineroMax) : null;

  return sql.begin(async (tx) => {
    const [actual] = await tx`select rol from usuarios where celular = ${celular} for update`;
    if (!actual || actual.rol !== rolFijo) {
      throw new ErrorHttp(404, `${rolFijo === "operador" ? "Operador" : "Cliente"} no encontrado.`);
    }

    const contrasenaHash = contrasenaNueva ? await hashearContrasena(contrasenaNueva) : null;
    const saldo = saldoNuevo;
    const limiteCredito = limiteNuevo;

    const [fila] = await tx`
      update usuarios set
        alias = ${alias},
        negocio_id = ${negocioId},
        estatus = ${estatus},
        contrasena_hash = coalesce(${contrasenaHash}, contrasena_hash),
        saldo = coalesce(${saldo}, saldo),
        limite_credito = coalesce(${limiteCredito}, limite_credito)
      where celular = ${celular}
      returning ${CAMPOS_USUARIO}
    `;
    return fila;
  });
}
