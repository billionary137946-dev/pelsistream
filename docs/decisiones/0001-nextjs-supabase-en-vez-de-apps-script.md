# 0001 — Next.js + Supabase en un solo proyecto, en vez de Apps Script

Fecha: 2026-09-22 · Estado: aceptada

## Contexto
v2 corría en Google Apps Script + Sheets: sin ids reales, contraseñas en texto plano,
`LockService` como candado y límites de cuota. Hubo un paso intermedio con backend FastAPI (`pelisback`).

## Opciones
1. Seguir en Apps Script — gratis y conocido / lento, inseguro, difícil de escalar.
2. Next.js + FastAPI aparte — separación clara / dos despliegues y dos lenguajes.
3. Next.js con API routes + Supabase Postgres — un solo despliegue en Vercel / hay que portar la lógica a TS.

## Decisión
Opción 3. Lógica de dinero portada 1:1 desde Python; login propio (celular, no email) con bcrypt + JWT.

## Consecuencias
- Un repo, un deploy (Vercel). `pelisback` borrado.
- Serverless sin memoria compartida → idempotencia en tabla `intentos_procesados`.
- postgres.js obliga a `::float8` en numéricos y `prepare: false` con el pooler.
