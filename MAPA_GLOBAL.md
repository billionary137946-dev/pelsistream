# Mapa Global — Peli Streams

Estado real de cada sección del proyecto (qué ya está conectado a algo real vs. qué es
prototipo/placeholder), con el detalle de campos que usa cada parte — mismo formato que el
mapa de HGC, para que sirva de referencia rápida entre proyectos.

**Leyenda:**
- 🟢 **REAL** — conectado a algo de verdad (API route real de Next.js, tabla real en Supabase).
- 🟡 **PARCIAL** — el endpoint existe y funciona, pero falta la pantalla/interacción completa.
- 🔴 **NO EXISTE** — ni backend ni frontend, solo está documentado en `v.2/funcionamiento.txt`.
- ⚪ **Placeholder** — v2 (Apps Script) lo tenía o lo documenta como pendiente; aquí ni empezado.

> **Nota de arquitectura:** este proyecto ya NO tiene un backend Python separado (`pelisback`
> fue borrado). Todo vive en un solo proyecto Next.js (`pelisfront/`): las páginas en
> `src/app/**/page.tsx` y el backend como API routes en `src/app/api/**/route.ts`, para poder
> desplegar un único proyecto en Vercel. La lógica de negocio (saldo, corretaje, candados de
> fila, idempotencia) es la MISMA que tenía la versión en Python — se portó 1:1 a TypeScript,
> no se rediseñó nada.

---

## 1. Frontend (`pelisfront/src/app/`)

| Ruta | Qué hace | Estado |
|---|---|---|
| `/login` | Celular + contraseña → JWT, redirige por rol | 🟢 **REAL** — contra `POST /api/auth/iniciar-sesion` |
| `/registro` | Auto-registro público de cliente (?negocio=NOMBRE) | 🟢 **REAL** — contra `/api/registro-publico*` |
| `/admin` (Inicio) | Tarjetas: jugadas/volumen/corretaje/deudas | 🟢 **REAL** — `GET /api/admin/resumen` |
| `/admin` (gráfica) | Serie de corretaje día/semana/mes + detalle de corte + export CSV | 🔴 no existe (ni backend ni UI) |
| `/admin` (Negocios) | Alta/edición/desactivar de negocios | 🟢 **REAL** — con límite de 5 activos y validación de corretaje |
| `/admin` (Operadores) | Alta/edición/desactivar de operadores | 🟢 **REAL** — con límite `max_operadores` del negocio ya aplicado |
| `/admin` (Clientes) | Alta/edición/desactivar + activar pendientes | 🟢 **REAL** |
| `/admin` (modal historial cliente/operador) | Ver historial + ganancias (corretaje/neto acumulado) desde una tarjeta | 🟢 **REAL** |
| `/admin` (ganancias por negocio) | Clic en un negocio → operadores/clientes/jugadas/volumen/corretaje de ESE negocio | 🟢 **REAL** — `GET /api/admin/negocios/{nombre}/resumen` |
| `/admin`, `/operador` (toasts de éxito/error) | Aviso flotante notorio al crear/editar/activar/desactivar | 🟢 **REAL** — componente `Toast`, reemplaza el texto suelto de antes |
| `/operador` (Registrar apuesta) | Buscar cliente, elegir color/monto, registrar | 🟢 **REAL** — con `intento_id`, candado de fila en Postgres, validación de cliente activo |
| `/operador` (Eventos abiertos / Cerrar) | Lista eventos pendientes, declarar ganador | 🟢 **REAL** — rojo/verde/empate/cancelada |
| `/operador` (Quinielas) | Ventaja/Quiniela/Mano a mano/Pares y nones | 🟡 endpoint `POST /api/quinielas` existe, sin pantalla |
| `/operador` (Historial) | Ver jugadas del negocio, filtrar pendientes/todas | 🟢 **REAL** — con tab propio en el bottom nav |
| `/operador` (Editar apuesta pendiente) | Corregir monto/color antes de cerrar | 🟢 **REAL** — modal desde el historial, límites $500–$1,000,000 |
| `/operador` (validar # palenque repetido) | Avisar si "Palenque #5" ya se usó | 🟢 **REAL** — se valida con debounce mientras se escribe el evento |
| `/operador` (navegación) | Cambiar entre Apostar/Eventos/Historial | 🟢 **REAL** — bottom nav (sección 9-d de funcionamiento.txt ya aplicada) |
| `/operador` (5 slots en paralelo) | Varios eventos abiertos a la vez, cambiar de pestaña | 🔴 no existe — hoy es un solo espacio de trabajo |
| `/cliente` | Saldo con auto-refresco (5s) + historial propio | 🟢 **REAL** — con bandera anti-solapamiento de polling |

---

## 2. Backend (`pelisfront/src/app/api/`) — API routes de Next.js

| Ruta(s) | Estado |
|---|---|
| `auth/iniciar-sesion`, `auth/sesion` | 🟢 JWT (`jose`) + revalidación contra BD en cada request protegido |
| `negocios`, `negocios/{nombre}` | 🟢 con los 2 bugs de v2 corregidos (límite al reactivar, corretaje 0-100) |
| `operadores`, `operadores/{celular}`, `clientes`, `clientes/{celular}` | 🟢 con el límite `max_operadores` ya aplicado (bug de v2 corregido) |
| `registro-publico`, `registro-publico/{negocioId}`, `clientes/{celular}/activar` | 🟢 |
| `operador/clientes`, `apuestas`, `operador/numeros-usados`, `operador/eventos-abiertos`, `eventos/{evento}/cerrar`, `apuestas/{id}`, `operador/historial` | 🟢 backend completo — `select ... for update` (postgres.js) en vez de `LockService`, `intento_id` respaldado en tabla `intentos_procesados` |
| `quinielas` | 🟢 backend completo, sin UI (ver tabla de frontend) |
| `cliente/saldo`, `cliente/historial` | 🟢 |
| `admin/resumen`, `admin/operadores/{cel}/historial`, `admin/clientes/{cel}/historial`, `admin/negocios/{nombre}/resumen` | 🟡 falta la serie temporal para la gráfica (`getDetalleCorte`/`_serieParaFiltro` de v2 sin portar); el resto ya real |

**Cosas de plataforma, no de una ruta específica:**
- `src/lib/server/seguridad.ts` — hash con `bcryptjs` + JWT con `jose`. 🟢 **probado end-to-end**
  (login real contra Supabase, verificado tras el rewrite completo a TypeScript).
- `src/lib/server/dedupe.ts` — dedupe de `intento_id` **respaldado en Postgres**
  (tabla `intentos_procesados`), no en memoria del proceso. Esto es un cambio real respecto a
  la versión en Python (que usaba un diccionario en memoria): en Vercel cada invocación de una
  función serverless puede correr en una instancia distinta sin memoria compartida, así que el
  dedupe TENÍA que moverse a la base de datos para seguir funcionando ahí. 🟢 probado con
  reintento real del mismo `intento_id`.
- Rate-limiting en `/auth/iniciar-sesion` — 🔴 no existe.
- Tabla de auditoría (quién cambió qué) — 🔴 no existe.

### 2.1 Historial de bugs — resueltos durante la era del backend en Python

Estos bugs se encontraron y corrigieron cuando el backend todavía era FastAPI/Python
(`pelisback`, ya borrado). Se listan porque explican decisiones de diseño que siguen vigentes
en el backend TypeScript actual (aunque el código específico donde se originaron ya no existe):

1. **Autobegin/transacciones duplicadas (solo aplicaba a SQLAlchemy)** — no existe en el stack
   actual: `sql.begin()` de postgres.js se usa una sola vez por transacción, sin el patrón de
   conexión-compartida-por-request que causaba el conflicto en Python.
2. **`fecha_creacion` rompía la respuesta** (Pydantic esperaba texto, Postgres regresaba
   `datetime`) — el mismo patrón de cast a `::text` se mantuvo a propósito en las queries de
   TypeScript (aunque JSON es más permisivo que Pydantic con fechas).
3. **Login/lecturas fallaban al azar por el pooler de Supabase** (modo "Transaction", puerto
   6543, chocaba con sentencias preparadas cacheadas) — se desactivó ese cacheo con
   `connect_args={"prepare_threshold": None}` en Python; el equivalente exacto
   (`{ prepare: false }`) se incluyó desde el día uno en `src/lib/server/db.ts` para no repetir
   el bug.
4. **Token-clobbering**: `GET /auth/sesion` regresaba `"token":""` y el frontend lo dejaba
   pisar el token real en `localStorage`. Corregido en 3 capas entonces (`useSesion.ts`,
   `sesion.ts`, backend); el backend TypeScript actual simplemente NUNCA incluye el campo
   `token` en la respuesta de `GET /api/auth/sesion` (diseño, no parche).
5. **Ruta pluralizada mal** (`` `/${rol}s` `` → `/operadors`) — corregido en el frontend
   (`admin/page.tsx`), sigue vigente porque las rutas se llaman `/operadores`/`/clientes`.
6. **Toast de éxito pisado por un error de recarga silenciosa** — corregido con el patrón
   `cargarTodo(true)`, sigue vigente en el frontend (no cambió con el rewrite del backend).
7. **`next/font/google` + Turbopack rompía `npm run build`** — se cambió a `<link>` de Google
   Fonts en `layout.tsx`, sigue vigente (frontend no tocado por el rewrite del backend).
8. **`evento.currentTarget` se volvía `null` tras un `await`** — se guarda la referencia al
   formulario ANTES del `await` en `admin/page.tsx`, sigue vigente.

### 2.2 Bug encontrado y corregido durante el rewrite a TypeScript

9. **Numeric-as-string (postgres.js)** — a diferencia de `psycopg`/SQLAlchemy en Python (que
   regresaba columnas `numeric` como `float`), `postgres.js` las regresa como **string**
   (`"12.00"` en vez de `12`) para no perder precisión. Como los tipos de TypeScript del
   frontend esperan `number` (ej. `Usuario.saldo: number`), esto rompía código real como
   `saldo.toLocaleString()` (no existe en strings) y sumas que en realidad concatenaban texto
   (`0 + "150.00"` → `"0150.00"`). Corregido con casts `::float8` explícitos en cada columna
   numérica devuelta al frontend (`saldo`, `limite_credito`, `corretaje_pct`, `monto`,
   `corretaje`, `neto`) en todas las rutas afectadas.
10. **Doble serialización JSON en el dedupe de `intento_id`** — `postgres.js` tampoco parsea
    automáticamente columnas `jsonb` a objeto: al leer `intentos_procesados.resultado` regresaba
    el texto crudo como string, y `NextResponse.json()` lo volvía a serializar (el navegador
    recibía un string con JSON escapado en vez del objeto `{ok, saldo}` esperado). Corregido con
    `JSON.parse()` explícito en `src/lib/server/dedupe.ts` al leer la columna.

---

## 3. Base de datos (Supabase)

Migraciones en `pelisfront/supabase/migrations/`:
- `20260922000000_esquema_inicial.sql`
- `20260922100000_intentos_procesados.sql` (tabla de idempotencia, nueva en el rewrite a
  TypeScript — reemplaza el diccionario en memoria que usaba el backend en Python)

| Tabla | Estado |
|---|---|
| `usuarios` (admin/operador/cliente en una sola tabla) | 🟢 migrada, con RLS activado (sin policies — solo el backend con conexión directa puede leer/escribir) |
| `negocios` | 🟢 migrada |
| `jugadas` | 🟢 migrada, con `id` real (v2 en Sheets no tenía id) |
| `movimientos` | 🟢 migrada |
| `intentos_procesados` | 🟢 migrada — dedupe de `intento_id` respaldado en disco, necesario para Vercel serverless |
| Tabla de auditoría | 🔴 no existe (ver sección 8-f de `funcionamiento.txt`) |

👉 **Ya conectado.** Proyecto real creado: `pelisstream` (ref `ydmtmpmqtnfbixfwbkwf`, región us-east-2),
proyecto separado de HGC, mismo dueño de cuenta. Migraciones ya aplicadas, backend probado
end-to-end (login real devuelve JWT válido). Admin: celular `5580323041`.

---

## 4. Autenticación y sesión

| Qué | Estado |
|---|---|
| Login por celular+contraseña | 🟢 REAL — JWT propio (no Supabase Auth, porque v2 no usa email) |
| Revalidación de sesión en cada panel protegido | 🟢 `useSesion()` llama `GET /api/auth/sesion` en cada carga, igual que `validarSesion()` en v2 |
| Password en texto plano | 🟢 **corregido respecto a v2** — bcrypt (`bcryptjs`) desde el día uno |
| Rate-limiting de intentos de login | 🔴 no existe |
| "Olvidé mi contraseña" | 🔴 no existe (v2 tampoco lo tenía) |

---

## 5. Qué falta para que funcione al 100%

Checklist en orden de dependencia (lo de arriba bloquea lo de abajo). 📌 marca algo que la
mayoría de sistemas de apuestas/POS de este tipo ya traen de fábrica y aquí no tiene ni
placeholder todavía.

### 5.1 Base: para que el operador pueda trabajar completo
- [ ] Pantalla de **Quinielas** en `/operador` (el backend ya funciona).
- [x] Tab de **Historial** en `/operador`.
- [x] UI para **editar apuesta pendiente**.
- [x] Validación de **número de palenque repetido** conectada al formulario de apostar.
- [x] Bottom nav (Apostar/Eventos/Historial).
- [ ] **5 slots en paralelo** — hoy solo se puede trabajar un evento a la vez.

### 5.2 Dashboard del admin
- [ ] Portar `_serieParaFiltro`/`_corretajePorMes`/`_lunesDe` de `codigo.gs` → gráfica de
      corretaje con granularidad dinámica (día en semana, semana en mensual, mes en anual).
- [ ] Detalle de un corte de la gráfica (modal) + exportar a CSV.
- [x] Modal de historial de cliente/operador desde las tarjetas, con ganancias.
- [x] Ganancias agregadas por negocio (operadores/clientes/jugadas/volumen/corretaje).

### 5.3 Puesta en producción
- [x] Crear el proyecto real en Supabase y correr la migración — `pelisstream`
      (ref `ydmtmpmqtnfbixfwbkwf`, us-east-2), separado de HGC.
- [x] Admin — celular `5580323041` (contraseña definitiva, ya no la de prueba).
- [x] `pelisfront/.env.local` con `DATABASE_URL` y `JWT_SECRETO` reales — probado end-to-end.
- [x] Reescritura completa del backend de Python a TypeScript (API routes de Next.js) — un
      solo proyecto, listo para desplegar entero en Vercel. `pelisback` borrado.
- [x] `npm install` en `pelisfront`.
- [x] **`npm run build` de producción — probado y funcionando** (ver bug #7 arriba: estaba roto
      por `next/font/google`, ya corregido; verificado de nuevo tras el rewrite a TypeScript).
- [x] **Suite funcional completa re-probada end-to-end tras el rewrite a TypeScript** (ver
      sección 6 abajo) — login, CRUD de negocios/operadores/clientes, flujo de dinero completo
      con matemática verificada, quinielas, y los 4 candados de seguridad.
- [ ] **No hay repositorio git todavía** (`fatal: not a git repository`) — Vercel necesita
      GitHub/GitLab conectado, o `vercel` CLI directo sin git.
- [ ] Desplegar `pelisfront` en Vercel (un solo proyecto — ya no hace falta un host aparte para
      backend, porque el backend son las mismas API routes de Next.js).
- [ ] Variables de entorno en Vercel: `DATABASE_URL`, `JWT_SECRETO`, `JWT_HORAS_EXPIRACION`.
- [ ] Rotar el `JWT_SECRETO` antes de ir a producción real (el admin ya es el definitivo, no
      hace falta rotarlo).

---

## 6. Resultados de la suite funcional completa (última corrida, contra el backend TypeScript)

Probado con datos reales (creados y luego borrados) contra las API routes de Next.js + Supabase
real, sin mockear nada — mismo suite que se corrió contra el backend en Python, repetido tras el
rewrite completo para confirmar que no se perdió ninguna regla de negocio:

| Prueba | Resultado |
|---|---|
| Login correcto / incorrecto | ✅ 200 / ✅ 401 |
| `GET /api/auth/sesion` no incluye `token` (bug de token-clobbering no regresó) | ✅ |
| Crear negocio / duplicado rechazado / editar | ✅ 201 / ✅ 409 / ✅ 200 |
| Crear operador / editar | ✅ 201 / ✅ 200 |
| Crear cliente / auto-registro público / activar pendiente | ✅ 201 / ✅ 201 / ✅ 200 |
| Columnas numéricas (`saldo`, `corretaje_pct`, `monto`, etc.) llegan como `number`, no string | ✅ (ver bug #9 arriba) |
| Registrar apuesta + saldo exacto | ✅ (5000 → 4000) |
| Reintento con mismo `intento_id` (dedupe respaldado en Postgres) | ✅ no duplica el cobro, regresa el objeto correcto (ver bug #10) |
| Cerrar evento (ganada) + corretaje exacto | ✅ (4000 → 4850, corretaje 150 = 15% de 1000) |
| Re-cerrar el mismo evento | ✅ bloqueado (404, idempotente) |
| Editar apuesta pendiente + ajuste de saldo | ✅ (3850 → 2850 al subir el monto de 1000 a 2000) |
| Cerrar evento como "cancelada" | ✅ regresa monto íntegro, corretaje 0 |
| Quiniela (2 apostadores, 1 gana) | ✅ corretaje exacto (300 × 15% = 45) |
| Resumen de ganancias por negocio | ✅ cuenta operadores/clientes/jugadas/volumen/corretaje bien |
| Operador no puede ver `/negocios` (solo admin) | ✅ 403 |
| Cliente no puede usar rutas de operador | ✅ 403 |
| Sin token / token falso | ✅ 401 / ✅ 401 |
| `npm run build` (producción) | ✅ compila limpio, todas las rutas (páginas + API) generadas correctamente |

### 5.4 Seguridad / robustez (sección 8 de `funcionamiento.txt`)
- [ ] Rate-limiting en login.
- [ ] Tabla de auditoría.
- [x] Dedupe de `intento_id` ya NO depende de memoria de un solo proceso — respaldado en
      Postgres (`intentos_procesados`), funciona correctamente entre invocaciones serverless.
- [ ] Tests automatizados sobre las reglas de saldo/corretaje/empate-cancelada — es la parte
      más sensible a romperse y hoy no hay ni un test (las pruebas de la sección 6 fueron
      manuales con curl, no un suite automatizado que corra en CI).

### 5.5 Mobile / PWA (sección 9-10 de `funcionamiento.txt`)
- [ ] Íconos PWA reales (192px/512px) — el manifest ya los referencia, faltan los PNG.
- [ ] Service worker offline-first (encolar apuestas sin señal en el palenque).
- [ ] WebSocket/SSE para saldo del cliente en tiempo real (hoy es polling cada 5s, que ya
      funciona pero gasta más batería/datos).
- [ ] Presupuesto de performance medido (Lighthouse "Slow 3G") — sección 10-h.

### 5.6 Cosas que v2 nunca tuvo y quedaron solo como propuesta
- [ ] 📌 Bottom navigation en vez de tabs arriba (más alcanzable con el pulgar en operador/cliente).
- [ ] 📌 Feedback optimista al apostar (la apuesta se ve "guardada" al instante, con reversión
      si el backend la rechaza) — hoy se espera la respuesta del servidor.
- [ ] 📌 Ranking multi-negocio en el dashboard del admin (v1 lo tenía, v2 lo sacrificó).
