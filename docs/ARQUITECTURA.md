# Arquitectura — Peli Streams

Un solo proyecto Next.js (`pelisfront/`) con las páginas y el backend juntos, desplegado en Vercel.

## Flujo
Navegador → página `src/app/<rol>/page.tsx` → `src/lib/api.ts` (fetch con JWT) →
API route `src/app/api/**/route.ts` → `src/lib/server/*` → Postgres (Supabase) vía postgres.js.

## Carpetas (`pelisfront/`)
| Ruta | Qué hay |
|---|---|
| `src/app/login`, `registro` | Login y auto-registro público de cliente |
| `src/app/admin` | Panel admin: resumen, negocios, operadores, clientes, historiales |
| `src/app/operador` | Apostar, eventos abiertos/cerrar, historial, editar apuesta |
| `src/app/cliente` | Saldo + historial propio |
| `src/app/api/` | Backend (ver tabla de abajo) |
| `src/lib/server/db.ts` | Conexión postgres.js (`prepare: false`) |
| `src/lib/server/auth.ts` | Verificar JWT + rol en cada ruta |
| `src/lib/server/seguridad.ts` | bcrypt + firma/verificación JWT |
| `src/lib/server/apuestas.ts` | Reglas de dinero (registrar, cerrar, corretaje) |
| `src/lib/server/dedupe.ts` | Idempotencia por `intento_id` (tabla `intentos_procesados`) |
| `src/lib/server/usuarios.ts` | Consultas de usuarios |
| `src/features/auth`, `features/cliente` | Login, registro y panel del cliente (admin y operador: pendiente moverlos) |
| `src/shared/lib/` | `api`, `sesion`, `useSesion`, `inputs`, `formato`, `pwa` |
| `src/shared/ui/` | Modal, Cargando, Campo, Toast, BottomNav, PanelHeader, LogoPeli, FondoAuth, InstalarApp, AvisoActualizar |
| `src/shared/guia/` | Recorrido guiado (de HGC) + `recorridos.ts` con todos los textos de ayuda |
| `public/sw.js`, `src/app/manifest.ts` | PWA (ver decisiones/0002) |
| `src/app/globals.css` | Tokens de color/tema |
| `supabase/migrations/` | Esquema de BD (solo se agregan archivos) |

## API
| Grupo | Rutas | Rol |
|---|---|---|
| Auth | `auth/iniciar-sesion`, `auth/sesion` | público / cualquiera |
| Catálogos | `negocios`, `operadores`, `clientes` (+ `/[id]`, `/activar`) | admin |
| Registro | `registro-publico`, `registro-publico/[negocioId]` | público |
| Operación | `apuestas`, `apuestas/[id]`, `eventos/[evento]/cerrar`, `quinielas`, `operador/*` | operador |
| Cliente | `cliente/saldo`, `cliente/historial` | cliente |
| Reportes | `admin/resumen`, `admin/*/historial`, `admin/negocios/[nombre]/resumen` | admin |
| App | `version` (commit publicado, para "Actualizar") | público |

## Base de datos
Tablas: `usuarios` (los 3 roles), `negocios`, `jugadas`, `movimientos`, `intentos_procesados`.
RLS activado sin policies: solo el backend (conexión directa) lee y escribe.

## Fuera del repo
`v.2/` (versión Apps Script de referencia), `index/`, `LEAME.TXT`, `MAPA_GLOBAL.md`.
