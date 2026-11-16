# 0002 — App instalable con la configuración de HGC (obligatoria en celular)

Fecha: 2026-11-16 · Estado: aceptada

## Contexto
Operador y cliente usan la app desde el celular en el palenque. Abrirla desde el navegador es lento
(buscar el link, barra del navegador, sesión perdida). HGC ya resolvió esto y funciona.

## Opciones
1. Solo manifest (instalar desde el menú si alguien sabe) — sin esfuerzo / casi nadie la instala.
2. Copiar la PWA de HGC — pantalla obligatoria en celular con guía por navegador / un paso más al entrar.

## Decisión
Opción 2, copiada tal cual (lógica de `pwa.ts` e `InstalarApp`), solo lo visual en navy + dorado:
- operador y cliente: pantalla obligatoria en celular; admin: tarjeta con "Ahora no" (14 días).
- `sw.js` sin caché: saldos y apuestas siempre frescos. Aviso "Actualizar" vía `/api/version`.

## Consecuencias
- En iPhone no se puede saber si ya la instaló: se confía en "Ya la agregué" (solo vale esa sesión).
- No se obliga en computadora, http local ni localhost (`?instalar=1` la muestra para probar).
- Offline real (encolar apuestas) queda pendiente: requiere caché y cola, es otra decisión.
