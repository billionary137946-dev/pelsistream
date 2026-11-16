# Plan — Peli Streams

## Fase 1 — Reescritura v2 → Next.js + Supabase ✅
- [x] Esquema en Supabase + migraciones
- [x] API routes en TypeScript (lógica de dinero portada 1:1)
- [x] Login propio con bcrypt + JWT
- [x] Paneles admin, operador, cliente y registro público
- [x] Suite funcional manual completa (login, CRUD, flujo de dinero, permisos)
- [x] Repo en GitHub + enlace con Vercel

## Fase 2 — Orden del código + app instalable (ACTUAL)
- [x] Pantalla de Quinielas en `/operador`
- [x] 5 slots (eventos) en paralelo en `/operador`
- [x] Lint funcionando (config de HGC con reglas de capas) + errores corregidos
- [x] PWA como HGC: sw.js, pantalla "Instala la app", aviso "Actualizar", ícono maskable
- [x] Encabezados de seguridad (CSP, HSTS, X-Frame)
- [x] Ayuda guiada (recorridos) — sistema y textos listos; cliente ya marcado
- [x] Capas: shared/ui, shared/lib, features/auth, features/cliente
- [ ] Pasar admin y operador a features/ (+ marcar su recorrido de ayuda)
- [ ] Probar instalación en Android (Chrome, Samsung) y iPhone (Safari)
- [ ] Subir cambios y verificar deploy + variables de entorno en Vercel
- [ ] Rotar `JWT_SECRETO` antes de producción real

## Fase 3 — Seguridad y robustez
- [ ] Rate-limit en `/api/auth/iniciar-sesion`
- [ ] Tabla de auditoría (quién cambió qué)
- [ ] Tests automatizados de saldo / corretaje / empate / cancelada

## Fase 4 — Dashboard del admin
- [ ] Serie de corretaje (día/semana/mes), portada de `_serieParaFiltro` en `v.2/codigo.gs`
- [ ] Modal de detalle de un corte + exportar CSV
- [ ] Ranking multi-negocio

## Fase 5 — Móvil / PWA
- [x] Íconos PWA 192/512 + maskable
- [ ] Service worker offline (encolar apuestas sin señal) — hoy sin caché a propósito
- [ ] Notificaciones push (sw.js ya las soporta; falta suscribir y enviar)
- [ ] Saldo en tiempo real (SSE/WebSocket en vez de polling)
- [ ] Feedback optimista al apostar
- [ ] Medir performance (Lighthouse, Slow 3G)
