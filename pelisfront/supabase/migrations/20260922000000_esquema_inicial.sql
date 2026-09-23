-- Esquema inicial de Peli Streams (reescritura de v2, sale de Google Sheets).
-- 4 tablas, mismo modelo de datos que codigo.gs (ver v.2/funcionamiento.txt,
-- seccion 11.1), ahora con relaciones e indices reales de Postgres.

create table if not exists negocios (
  nombre           text primary key,
  activo           boolean not null default true,
  max_operadores   integer not null default 3,
  corretaje_pct    numeric(5,2) not null default 10 check (corretaje_pct >= 0 and corretaje_pct <= 100),
  fecha_creacion   timestamptz not null default now(),
  creado_por       text
);

create table if not exists usuarios (
  celular          text primary key,
  contrasena_hash  text not null,
  rol              text not null check (rol in ('admin', 'operador', 'cliente')),
  alias            text not null default '',
  saldo            numeric(14,2) not null default 0,
  limite_credito   numeric(14,2) not null default 0,
  negocio_id       text references negocios(nombre),
  estatus          text not null default 'activo' check (estatus in ('activo', 'inactivo', 'pendiente')),
  fecha_registro   timestamptz not null default now()
);
create index if not exists idx_usuarios_negocio on usuarios (negocio_id);
create index if not exists idx_usuarios_rol on usuarios (rol);

create table if not exists jugadas (
  id               bigint generated always as identity primary key,
  tipo             text not null,
  evento           text not null,
  cliente_celular  text not null references usuarios(celular),
  color            text not null,
  monto            numeric(14,2) not null,
  corretaje        numeric(14,2),
  resultado        text not null default '',
  neto             numeric(14,2),
  operador_celular text not null references usuarios(celular),
  fecha            timestamptz not null default now()
);
create index if not exists idx_jugadas_evento on jugadas (evento);
create index if not exists idx_jugadas_cliente on jugadas (cliente_celular);
create index if not exists idx_jugadas_operador on jugadas (operador_celular);
create index if not exists idx_jugadas_pendientes on jugadas (evento) where resultado = '';

create table if not exists movimientos (
  id               bigint generated always as identity primary key,
  cliente_celular  text not null references usuarios(celular),
  tipo             text not null,
  evento           text not null default '',
  monto            numeric(14,2) not null,
  saldo_antes      numeric(14,2) not null,
  saldo_despues    numeric(14,2) not null,
  fecha            timestamptz not null default now(),
  operador_celular text
);
create index if not exists idx_movimientos_cliente on movimientos (cliente_celular);

-- RLS: candado de ultima linea a nivel de base de datos, ademas de lo que ya
-- valida el backend en FastAPI (ver funcionamiento.txt seccion 8-a). El
-- backend usa la llave de servicio (SUPABASE_SERVICE_ROLE_KEY / conexion
-- directa via DATABASE_URL) y esa llave se salta RLS por diseno de Supabase
-- -- estas politicas importan sobre todo si en el futuro el frontend llega a
-- leer datos directo desde Supabase con la llave publica.
alter table negocios enable row level security;
alter table usuarios enable row level security;
alter table jugadas enable row level security;
alter table movimientos enable row level security;
