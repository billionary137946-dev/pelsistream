-- Recuperar contraseña sin correo (docs/decisiones/0003-recuperar-contrasena-con-admin.md):
-- 1) El usuario pide ayuda desde el login → se marca solicitud_contrasena.
-- 2) El admin le da una contraseña temporal → debe_cambiar_contrasena = true.
-- 3) Al entrar con la temporal, el servidor no deja usar nada hasta que ponga una nueva suya.
alter table usuarios add column if not exists solicitud_contrasena timestamptz;
alter table usuarios add column if not exists debe_cambiar_contrasena boolean not null default false;
-- País del celular: el login usa los 10 dígitos; esto solo sirve para que WhatsApp marque a la lada correcta
-- (hay clientes de México +52 y de Estados Unidos/Canadá +1).
alter table usuarios add column if not exists pais text not null default '52';
alter table usuarios drop constraint if exists usuarios_pais_check;
alter table usuarios add constraint usuarios_pais_check check (pais in ('52', '1'));
