// Conexión a la base de datos (Supabase Postgres) desde las API routes de
// Next.js. "server-only" evita que este archivo se pueda importar por
// accidente desde código de cliente (traería la cadena de conexión al
// navegador).
import "server-only";
import postgres from "postgres";

// prepare: false es CRÍTICO con el pooler de Supabase en modo "Transaction"
// (puerto 6543, el que usa DATABASE_URL): ese pooler reasigna conexiones
// físicas de Postgres entre sesiones de clientes distintas, pero por
// default los drivers cachean "prepared statements" del lado del servidor
// con nombres autogenerados. Dos sesiones distintas pueden compartir la
// misma conexión física del pooler y chocar con el mismo nombre de
// statement -- eso se manifestaba como errores intermitentes e
// impredecibles (ver MAPA_GLOBAL.md, bug #3, encontrado en la versión
// Python con psycopg: "DuplicatePreparedStatement"). Mismo fix aquí, del
// lado de postgres.js.
export const sql = postgres(process.env.DATABASE_URL!, {
  prepare: false,
});
