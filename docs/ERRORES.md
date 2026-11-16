# Errores — Peli Streams

## Protocolo
1. Reproducir. 2. Hipótesis de causa raíz. 3. Comprobarla. 4. Arreglo mínimo. 5. Registrar aquí.

## Errores conocidos
Formato: Síntoma · Causa · Arreglo · Fecha

| # | Síntoma | Causa | Arreglo | Fecha |
|---|---|---|---|---|
| 1 | Empate/cancelada no devolvían el dinero (v2) | `declararGanador` no aplicaba delta | Delta = +monto en empate/cancelada | 2026-07 |
| 2 | "Perdió" descontaba dos veces (v2) | Se restaba otra vez lo ya descontado al apostar | Perdió = delta 0 | 2026-07 |
| 3 | Login/lecturas fallaban al azar | Pooler Supabase (6543) choca con sentencias preparadas | `{ prepare: false }` en `db.ts` | 2026-09 |
| 4 | Token real se borraba en el navegador | `/auth/sesion` devolvía `token:""` y pisaba el guardado | La respuesta ya no incluye `token` | 2026-09 |
| 5 | Ruta `/operadors` | Plural armado con `` `${rol}s` `` | Rutas fijas `/operadores`, `/clientes` | 2026-09 |
| 6 | Toast de éxito tapado por error de recarga | Recarga silenciosa mostraba errores | `cargarTodo(true)` | 2026-09 |
| 7 | `npm run build` roto | `next/font/google` + Turbopack | `<link>` de Google Fonts en `layout.tsx` | 2026-09 |
| 8 | `currentTarget` null tras `await` | React libera el evento | Guardar el form antes del `await` | 2026-09 |
| 9 | Saldos como texto (`"0150.00"`) | postgres.js regresa numeric como string | `::float8` en cada columna numérica | 2026-09 |
| 10 | Respuesta de reintento con JSON escapado | postgres.js no parsea `jsonb` | `JSON.parse()` en `dedupe.ts` | 2026-09 |
| 11 | En Android y al pegar, los campos aceptaban letras/signos | Filtro solo por tecla (`onKeyDown`): Gboard no manda la tecla y pegar no tiene teclas | Filtros por valor en `shared/lib/inputs.ts` (`limpiarDigitos/Decimal/Texto/Celular`) en cada campo | 2026-11-16 |
| 12 | Pegar "+52 (55) 1234-5678" dejaba "52551" | `maxLength` corta el texto crudo ANTES de limpiarlo | Sin `maxLength` en campos numéricos (el filtro pone el tope); `limpiarCelular` quita lada +52/+521 | 2026-11-16 |
| 13 | `creado_por` de un negocio se podía falsear | `POST /api/negocios` aceptaba ese campo del navegador | Siempre el celular del admin de la sesión | 2026-11-16 |
| 14 | "Activar cliente" podía cambiar saldo de un operador/admin | El `update` no filtraba por rol | `where ... and rol = 'cliente'` | 2026-11-16 |
| 15 | Saldo/límite/máx. operadores aceptaban texto, NaN, infinito, negativos | `Number()` sin validar | `lib/server/validar.ts` en todas las rutas | 2026-11-16 |
| 16 | Deploy desde GitHub falla: "No Next.js version detected" | Vercel (proyecto pelistreams) con Root Directory "." y la app vive en pelisfront/ (antes se subía con la CLI desde la carpeta) | Settings → Build and Deployment → Root Directory = `pelisfront` | 2026-11-16 |
