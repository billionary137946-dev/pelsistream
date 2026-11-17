-- intentos_procesados se creó sin RLS (Supabase la marcaba "UNRESTRICTED"): con la llave pública del
-- proyecto se podía leer o borrar por la API REST. Igual que las demás tablas: RLS prendido y SIN policies
-- → solo el backend (se conecta como dueño de la base, que no pasa por RLS) puede usarla.
alter table intentos_procesados enable row level security;
