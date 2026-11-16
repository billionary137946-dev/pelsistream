# Seguridad — Peli Streams

## Reglas que no se rompen
- Secretos solo en `pelisfront/.env.local` (local) y en variables de Vercel. Nunca en código ni en docs.
- Toda ruta `/api/*` (menos login y registro público) valida JWT + rol en el servidor (`src/lib/server/auth.ts`)
  y revalida contra la BD que el usuario siga activo.
- Contraseñas con bcrypt. Mensaje de login genérico; no revelar si un celular existe.
- Movimientos de dinero: transacción + `select ... for update` + `intento_id` idempotente.
- RLS activado sin policies: el navegador nunca habla directo con Supabase.
- `GET /api/auth/sesion` nunca devuelve el token.
- Migraciones: solo archivos nuevos.
- Encabezados (pelisfront/next.config.ts, igual que HGC): CSP (scripts y conexiones solo del mismo sitio,
  fuentes solo de Google Fonts), X-Frame-Options DENY, HSTS, sin source maps ni console.log en producción.
  Si agregas un servicio externo en el navegador, hay que permitirlo en la CSP o se bloqueará.
- `public/sw.js` no guarda caché ni datos: nunca guardar saldos/tokens ahí.
- **Campos:** todo lo que llega del navegador pasa por `lib/server/validar.ts` (celular 10 dígitos, contraseña 8–72,
  textos con largo máximo y sin caracteres de control, montos enteros $500–$1,000,000, dinero finito, listas fijas).
  Los límites viven en `shared/lib/limites.ts` (los usa servidor y pantalla). La pantalla filtra por VALOR
  (`shared/lib/inputs.ts`), no por tecla. Ruta nueva = validar cada campo con `V.*` antes de tocar la base.

## Pendientes
- [ ] Rate-limit en login
- [ ] Tabla de auditoría
- [ ] Rotar `JWT_SECRETO` antes de producción real
- [ ] Tests automatizados de las reglas de dinero

## Checklist antes de deploy
- [ ] `npm run build` y `npm run lint` limpios
- [ ] Probado en celular (390 px) y PC, claro y oscuro
- [ ] Variables en Vercel: `DATABASE_URL`, `JWT_SECRETO`, `JWT_HORAS_EXPIRACION`
- [ ] Ningún `.env*` en el commit (`git status` antes de subir)
- [ ] Si hay migración nueva: aplicada en Supabase ANTES del deploy
- [ ] Probar login + una apuesta + cerrar evento en producción
