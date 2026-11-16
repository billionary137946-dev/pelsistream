# Peli Streams — reglas del proyecto

Sistema de apuestas para palenques (peleas rojo/verde, quinielas) con 3 roles: admin, operador, cliente.
Las reglas universales vienen del plugin Método Billi777; aquí solo lo propio de este proyecto.

## Orden de lectura
1. `mapa.txt` — estado actual (leer primero, siempre).
2. El doc que toque: `docs/PLAN.md`, `docs/ARQUITECTURA.md`, `docs/SEGURIDAD.md`, `docs/ERRORES.md`.
3. `MAPA_GLOBAL.md` (local, no se sube) — detalle largo por ruta/tabla y resultados de pruebas.
4. El código exacto.

## Stack
- Todo vive en `pelisfront/`: Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres).
- Backend = API routes en `pelisfront/src/app/api/**/route.ts` (no hay backend aparte).
- BD con `postgres` (postgres.js) directo, NO Supabase Auth. Login propio: celular + contraseña, bcrypt + JWT (`jose`).
- Despliegue: GitHub `billionary137946-dev/pelsistream` → Vercel proyecto `pelisfront`.
- Next.js 16 tiene cambios grandes: leer `pelisfront/node_modules/next/dist/docs/` antes de usar una API (ver `pelisfront/AGENTS.md`).
- Referencia vieja: `v.2/` (Apps Script + Sheets). Solo de consulta, no se despliega.

## Reglas de negocio (no se rompen)
- Registrar apuesta descuenta el monto del saldo AL INSTANTE.
- Cerrar evento solo aplica el delta: ganó = +ganancia neta, perdió = 0, empate/cancelada = +monto (devolución).
- Corretaje = % del negocio (0–100) sobre lo ganado; se calcula en código, nunca a mano.
- Toda escritura de dinero va en transacción con `select ... for update` + `intento_id` (tabla `intentos_procesados`).
- Columnas numeric se devuelven con `::float8` (postgres.js las regresa como texto).
- Conexión con `{ prepare: false }` (pooler de Supabase en modo Transaction).
- `GET /api/auth/sesion` nunca devuelve `token`.

## Reglas de código (Método)
- Pocos componentes base con VARIANTES (CVA o similar), no componentes nuevos por cada diferencia.
- Colores, sombras y degradados solo como tokens en `src/app/globals.css`.
- Capas `app → features → shared`. Hoy el código está plano (`src/components`, `src/lib`):
  al tocar un módulo, moverlo a la capa correcta; no reorganizar todo de golpe.
- Lo de servidor vive en `src/lib/server/` y lleva `import "server-only"`.
- Nada de `any` ni `@ts-nocheck`. Hooks empiezan con `use`.

## Comandos (desde `pelisfront/`)
- `npm run dev` · `npm run build` · `npm run lint`
- Migraciones nuevas = archivo nuevo en `pelisfront/supabase/migrations/`. Nunca editar una aplicada.
