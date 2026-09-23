-- Nombres de equipo (rojo/verde) por jugada -- antes solo vivían en memoria
-- del navegador (se perdían al recargar o en otra sesión/dispositivo).
-- Cosméticos: no afectan saldo/corretaje, solo identifican el palenque.
alter table jugadas add column if not exists equipo_rojo text;
alter table jugadas add column if not exists equipo_verde text;
