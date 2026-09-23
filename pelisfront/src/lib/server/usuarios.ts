// Puerto de pelisback/app/api/rutas/usuarios.py -- compartido entre
// operador y cliente porque ambos son filas de "usuarios", solo cambia el
// rol. Incluye el bug de v2 ya corregido: max_operadores del negocio se
// guardaba pero nunca se comparaba contra el número real de operadores al
// dar de alta uno nuevo.
import "server-only";
import { sql } from "@/lib/server/db";
import { ErrorHttp } from "@/lib/server/auth";
import { hashearContrasena } from "@/lib/server/seguridad";

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
  const celular = String(datos.celular ?? "").replace(/\D/g, "");
  const contrasena = String(datos.contrasena ?? "");
  const alias = String(datos.alias ?? "").trim();
  const negocioId = String(datos.negocio_id ?? "");

  if (!celular || !contrasena) throw new ErrorHttp(400, "Celular y contraseña son obligatorios.");
  if (!negocioId) throw new ErrorHttp(400, "Selecciona un negocio.");

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

    const saldo = rolFijo === "cliente" ? Number(datos.saldo ?? 0) : 0;
    const limiteCredito = rolFijo === "cliente" ? Number(datos.limite_credito ?? 0) : 0;

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
  const alias = String(datos.alias ?? "").trim();
  const negocioId = String(datos.negocio_id ?? "");
  const estatus = datos.estatus === "inactivo" ? "inactivo" : "activo";

  if (!alias) throw new ErrorHttp(400, "El alias es obligatorio.");
  if (!negocioId) throw new ErrorHttp(400, "Selecciona un negocio.");

  return sql.begin(async (tx) => {
    const [actual] = await tx`select rol from usuarios where celular = ${celular} for update`;
    if (!actual || actual.rol !== rolFijo) {
      throw new ErrorHttp(404, `${rolFijo === "operador" ? "Operador" : "Cliente"} no encontrado.`);
    }

    const contrasenaHash = datos.contrasena ? await hashearContrasena(datos.contrasena) : null;
    const saldo = rolFijo === "cliente" ? Number(datos.saldo ?? 0) : null;
    const limiteCredito = rolFijo === "cliente" ? Number(datos.limite_credito ?? 0) : null;

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
