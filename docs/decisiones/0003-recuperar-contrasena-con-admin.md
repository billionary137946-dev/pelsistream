# 0003 — Recuperar contraseña con el admin (sin correo)

Fecha: 2026-11-16

## Contexto
Las cuentas son por celular; nadie da correo. Hoy, si alguien olvida su contraseña, solo se arregla a mano en Supabase.

## Opciones
1. Correo con enlace: hay que pedir y verificar correo a todos + servicio de envío (Resend). Si roban el correo, roban el saldo.
2. Código por SMS/WhatsApp (Twilio): cuesta por mensaje.
3. Solicitud al admin + contraseña temporal + cambio obligatorio. Gratis, sin servicios externos; el admin conoce a cada usuario.

## Decisión
Opción 3 (el usuario la aprobó). Detalles:
- /olvide responde siempre lo mismo (no revela si el celular existe); no repite la marca si se pidió hace < 10 min.
- La temporal se genera en el servidor (crypto, 8 caracteres sin 0/O/1/I/L), se muestra UNA vez al admin; en BD solo el hash.
- Con temporal, el servidor responde 428 en todas las rutas salvo /api/auth/cambiar-contrasena.
- Cada usuario puede cambiar la suya con la 🔑 del encabezado (pide la actual).
- Columna `pais` (52/1) solo para el enlace de WhatsApp; el login sigue siendo 10 dígitos.

## Consecuencias
- Un admin que olvide la suya depende de otro admin (o SQL). Pendiente: correo solo para admins.
- Sesiones abiertas en otros dispositivos siguen vivas tras cambiar la contraseña (el JWT no tiene versión).
- Sin rate-limit en /olvide (solo marca una fecha; no envía nada).
