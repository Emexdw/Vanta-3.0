-- VANTA 4.0: auditoría de solo lectura. No modifica tablas, datos ni permisos.
-- Ejecutar exclusivamente en el proyecto Supabase de PRUEBAS.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in
 ('profiles','posts','profile_pins','comments','messages','conversations','notifications','bookmarks')
order by tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in
 ('profiles','posts','profile_pins','comments','messages','conversations','notifications','bookmarks')
order by tablename, policyname;

select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated')
  and table_name in ('profiles','posts','profile_pins','messages','conversations')
order by table_name, grantee, privilege_type;

select bucket_id, name, owner_id
from storage.objects
where bucket_id = 'media'
limit 0; -- Solo comprueba que la vista sea accesible, sin mostrar datos personales.

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'media';

select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('profiles','profile_pins','messages')
order by event_object_table, trigger_name;
