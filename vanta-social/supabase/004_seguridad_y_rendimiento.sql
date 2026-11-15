-- VANTA 2.8 · Seguridad de perfiles y rendimiento de búsquedas
-- Requiere schema.sql, 002_seguridad_y_chat.sql y 003_personalizacion_perfiles.sql.
-- Ejecutar en SQL Editor como propietario de la base de datos.
-- No elimina contenido ni modifica usuarios existentes.

-- Los campos de verificación y contadores son gestionados por el servidor.
-- Evita que un usuario autenticado los cambie con una petición directa a profiles.
create or replace function public.guard_profile_system_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.is_verified is distinct from old.is_verified
       or new.followers_count is distinct from old.followers_count
       or new.following_count is distinct from old.following_count
       or new.posts_count is distinct from old.posts_count then
      raise exception 'profile_system_fields_readonly'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_system_fields on public.profiles;
create trigger profiles_guard_system_fields
before update on public.profiles
for each row execute function public.guard_profile_system_fields();

-- Aceptar solo URL HTTPS para portadas externas y limitar longitud.
-- Nota: una URL externa puede rastrear visitas; se recomienda subir imágenes
-- al bucket propio de Supabase. No se permite javascript:, data: ni http:.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_banner_url_safe'
  ) then
    alter table public.profiles
      add constraint profiles_banner_url_safe
      check (char_length(banner_url) <= 2048
             and (banner_url = '' or banner_url ~ '^https://[^[:space:]]+$'))
      not valid;
  end if;
end;
$$;

-- Índices para consultas de Explorar. pg_trgm permite ILIKE '%texto%'.
create extension if not exists pg_trgm;
create index if not exists profiles_username_trgm_idx
  on public.profiles using gin (username gin_trgm_ops);
create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists posts_caption_trgm_idx
  on public.posts using gin (caption gin_trgm_ops);

-- Orden estable para feed de clips y publicaciones con fechas iguales.
create index if not exists posts_kind_created_id_idx
  on public.posts (kind, created_at desc, id desc);
create index if not exists posts_created_id_idx
  on public.posts (created_at desc, id desc);

-- Listas de mensajes ordenadas por fecha.
create index if not exists messages_conversation_created_id_idx
  on public.messages (conversation_id, created_at desc, id desc);
