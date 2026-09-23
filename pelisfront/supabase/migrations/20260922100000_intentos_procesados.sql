-- Dedupe de "intento_id" para registrar_apuesta/cerrar_quiniela, respaldado
-- en base de datos en vez de memoria del proceso: en Vercel cada invocación
-- de una API route puede correr en una instancia serverless distinta, sin
-- memoria compartida entre ellas -- el diccionario en memoria que usaba el
-- backend en Python (pelisback/app/core/dedupe.py) ya no serviría aquí.
create table if not exists intentos_procesados (
  intento_id text primary key,
  resultado  jsonb not null,
  creado     timestamptz not null default now()
);

-- Limpieza natural: nunca hace falta un intento_id de hace más de un día,
-- así que no se acumula para siempre (se borra bajo demanda en el propio
-- código, no con un cron -- ver lib/server/dedupe.ts).
create index if not exists idx_intentos_creado on intentos_procesados (creado);
