-- =====================================================================
-- VANTA · Migración 002: seguridad reforzada + chat
-- Ejecutala DESPUÉS de schema.sql (SQL Editor > New query > Run). Una sola vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Configuración interna. RLS activado y SIN políticas: la app no puede leerla;
--    solo las funciones internas de abajo.
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (key text primary key, value text not null);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

-- >>> IMPORTANTE: al terminar de ejecutar este archivo, corré UNA vez esto con el host de TU proyecto
-- >>> (el que aparece en tu Project URL, sin https://):
-- >>>   insert into public.app_settings (key, value) values ('storage_host', 'TU-PROYECTO.supabase.co')
-- >>>   on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------------
-- 1. Los archivos de una publicación/perfil/historia solo pueden ser archivos
--    que la propia persona subió a NUESTRO almacenamiento (nada de URLs externas).
-- ---------------------------------------------------------------------
create or replace function public.check_media_url(url text, owner uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare host text;
begin
  if url is null or url = '' then return true; end if;
  if url !~ '^[A-Za-z0-9:/._%~-]+$' or position('..' in url) > 0 then return false; end if;
  select value into host from public.app_settings where key = 'storage_host';
  if host is not null then
    return starts_with(url, 'https://' || host || '/storage/v1/object/public/media/' || owner::text || '/');
  end if;
  return url ~ ('^https://[a-z0-9-]+\.supabase\.(co|in)/storage/v1/object/public/media/' || owner::text || '/');
end $$;

create or replace function public.validate_post_media() returns trigger
language plpgsql as $$
declare u text;
begin
  foreach u in array new.media_urls loop
    if not public.check_media_url(u, new.user_id) then raise exception 'invalid_media'; end if;
  end loop;
  if not public.check_media_url(new.poster_url, new.user_id) then raise exception 'invalid_media'; end if;
  return new;
end $$;
create trigger posts_validate_media before insert on public.posts
  for each row execute function public.validate_post_media();

create or replace function public.validate_story_media() returns trigger
language plpgsql as $$
begin
  if not public.check_media_url(new.media_url, new.user_id) then raise exception 'invalid_media'; end if;
  return new;
end $$;
create trigger stories_validate_media before insert on public.stories
  for each row execute function public.validate_story_media();

create or replace function public.validate_avatar() returns trigger
language plpgsql as $$
begin
  if not public.check_media_url(new.avatar_url, new.id) then raise exception 'invalid_media'; end if;
  return new;
end $$;
create trigger profiles_validate_avatar before insert or update of avatar_url on public.profiles
  for each row execute function public.validate_avatar();

-- Límites de formato adicionales
alter table public.posts add constraint posts_tags_max check (cardinality(tags) <= 10);
alter table public.posts add constraint posts_location_len check (location is null or char_length(location) <= 60);
alter table public.posts add constraint posts_sound_len check (
  (sound_title is null or char_length(sound_title) <= 60) and (sound_artist is null or char_length(sound_artist) <= 60));
alter table public.posts add constraint posts_duration_fmt check (duration is null or duration ~ '^[0-9]{1,2}:[0-9]{2}$');
alter table public.stories add constraint stories_sound_len check (sound_title is null or char_length(sound_title) <= 60);

-- ---------------------------------------------------------------------
-- 2. Nombres de usuario reservados (evita suplantar al equipo oficial)
-- ---------------------------------------------------------------------
create or replace function public.is_reserved_username(u text) returns boolean
language sql immutable as $$
  select lower(u) = any (array['admin','administrator','root','support','soporte','help','ayuda','vanta',
    'vantaoficial','official','oficial','moderator','moderador','staff','security','seguridad','system',
    'sistema','null','undefined','api','www','mail','postmaster']);
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if uname !~ '^[a-z0-9_.]{3,24}$' or public.is_reserved_username(uname)
     or exists (select 1 from public.profiles where username = uname) then
    uname := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, coalesce(nullif(left(new.raw_user_meta_data->>'display_name', 50), ''), uname));
  return new;
end $$;

create or replace function public.guard_username_change() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and public.is_reserved_username(new.username) then
    raise exception 'reserved_username';
  end if;
  return new;
end $$;
create trigger profiles_guard_username before update of username on public.profiles
  for each row execute function public.guard_username_change();

create or replace function public.username_available(uname text) returns boolean
language sql stable security definer set search_path = public as $$
  select uname ~ '^[a-z0-9_.]{3,24}$' and not public.is_reserved_username(uname)
         and not exists (select 1 from public.profiles where username = lower(uname));
$$;

-- ---------------------------------------------------------------------
-- 3. Límites de velocidad (anti-spam y anti-abuso)
-- ---------------------------------------------------------------------
create or replace function public.rate_limit_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  col text := tg_argv[0];
  win interval := tg_argv[1]::interval;
  max_rows int := tg_argv[2]::int;
  uid uuid := (to_jsonb(new) ->> col)::uuid;
  n int;
begin
  execute format('select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
                 tg_table_schema, tg_table_name, col) into n using uid, win;
  if n >= max_rows then raise exception 'rate_limit'; end if;
  return new;
end $$;

create trigger rl_posts before insert on public.posts for each row execute function public.rate_limit_check('user_id', '1 hour', '40');
create trigger rl_comments before insert on public.comments for each row execute function public.rate_limit_check('user_id', '1 minute', '10');
create trigger rl_likes before insert on public.post_likes for each row execute function public.rate_limit_check('user_id', '1 minute', '60');
create trigger rl_follows before insert on public.follows for each row execute function public.rate_limit_check('follower_id', '1 hour', '100');
create trigger rl_stories before insert on public.stories for each row execute function public.rate_limit_check('user_id', '1 day', '50');
create trigger rl_reports before insert on public.reports for each row execute function public.rate_limit_check('reporter_id', '1 hour', '20');

-- ---------------------------------------------------------------------
-- 4. Bloqueos
-- ---------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);
alter table public.blocks enable row level security;
create policy "blocks_read_own" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "blocks_insert_own" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks_delete_own" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks
                 where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function public.on_block_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end $$;
create trigger blocks_cleanup after insert on public.blocks for each row execute function public.on_block_created();

create or replace function public.prevent_follow_if_blocked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_blocked_between(new.follower_id, new.following_id) then raise exception 'blocked'; end if;
  return new;
end $$;
create trigger follows_block_check before insert on public.follows
  for each row execute function public.prevent_follow_if_blocked();

-- El contenido de una persona bloqueada (o que te bloqueó) deja de ser visible
drop policy if exists "posts_read" on public.posts;
create policy "posts_read_visible" on public.posts for select to authenticated
  using (not public.is_blocked_between(auth.uid(), user_id));

drop policy if exists "comments_read" on public.comments;
create policy "comments_read_visible" on public.comments for select to authenticated
  using (not public.is_blocked_between(auth.uid(), user_id));

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists "stories_read_active" on public.stories;
create policy "stories_read_active" on public.stories for select to authenticated
  using ((expires_at > now() or user_id = auth.uid()) and not public.is_blocked_between(auth.uid(), user_id));

-- ---------------------------------------------------------------------
-- 5. Perfiles: ya no son legibles sin iniciar sesión
-- ---------------------------------------------------------------------
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 6. Almacenamiento: nadie puede listar archivos ajenos; solo extensiones permitidas
-- ---------------------------------------------------------------------
drop policy if exists "media_read" on storage.objects;
create policy "media_list_own" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media_insert_own" on storage.objects;
create policy "media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
              and lower(name) ~ '\.(jpg|jpeg|png|webp|mp4|webm|mov)$');

-- ---------------------------------------------------------------------
-- 7. Reproducciones: una por persona y publicación (antes se podían inflar sin límite)
-- ---------------------------------------------------------------------
create table public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);
alter table public.post_views enable row level security;
revoke all on public.post_views from anon, authenticated;

create or replace function public.increment_views(target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); inserted int;
begin
  if me is null then return; end if;
  insert into public.post_views (post_id, user_id) values (target, me) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then update public.posts set views_count = views_count + 1 where id = target; end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. Búsqueda segura (reemplaza el filtro armado con texto del usuario)
-- ---------------------------------------------------------------------
create or replace function public.search_profiles(term text, max_rows int default 12)
returns setof public.profiles
language sql stable set search_path = public as $$
  select p.* from public.profiles p
  where (p.username ilike '%' || replace(replace(replace(left(term, 50), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or p.display_name ilike '%' || replace(replace(replace(left(term, 50), '\', '\\'), '%', '\%'), '_', '\_') || '%')
    and not public.is_blocked_between(auth.uid(), p.id)
  order by p.followers_count desc limit least(max_rows, 25);
$$;

create or replace function public.suggested_profiles(max_rows int default 8)
returns setof public.profiles
language sql stable set search_path = public as $$
  select * from public.profiles p
  where p.id <> auth.uid()
    and not public.is_blocked_between(auth.uid(), p.id)
    and not exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.id)
  order by p.followers_count desc, p.created_at desc limit least(max_rows, 25);
$$;

-- ---------------------------------------------------------------------
-- 9. Reportes de personas
-- ---------------------------------------------------------------------
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'other' check (char_length(reason) <= 40),
  created_at timestamptz not null default now(),
  unique (reporter_id, reported_id),
  check (reporter_id <> reported_id)
);
alter table public.user_reports enable row level security;
create policy "user_reports_insert_own" on public.user_reports for insert to authenticated with check (reporter_id = auth.uid());
create trigger rl_user_reports before insert on public.user_reports
  for each row execute function public.rate_limit_check('reporter_id', '1 hour', '20');

-- ---------------------------------------------------------------------
-- 10. CHAT 1 a 1
-- ---------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_a_idx on public.conversations (user_a, last_message_at desc);
create index conversations_b_idx on public.conversations (user_b, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conv_idx on public.messages (conversation_id, created_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c
                 where c.id = cid and auth.uid() in (c.user_a, c.user_b));
$$;

-- Las conversaciones solo se crean con la función get_or_create_conversation (no hay política de insert)
create policy "conversations_read_member" on public.conversations for select to authenticated
  using (auth.uid() in (user_a, user_b));
revoke insert, update, delete on public.conversations from anon, authenticated;

create policy "messages_read_member" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "messages_insert_member" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "messages_delete_own" on public.messages for delete to authenticated using (sender_id = auth.uid());
revoke update on public.messages from anon, authenticated;

create or replace function public.check_message_allowed() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; other uuid;
begin
  select * into c from public.conversations where id = new.conversation_id;
  other := case when c.user_a = new.sender_id then c.user_b else c.user_a end;

  if public.is_blocked_between(new.sender_id, other) then raise exception 'blocked'; end if;

  -- Solicitud de mensaje: a quien no te sigue ni te respondió, solo podés enviarle 1 mensaje
  if not exists (select 1 from public.follows where follower_id = other and following_id = new.sender_id)
     and not exists (select 1 from public.messages where conversation_id = new.conversation_id and sender_id = other)
     and (select count(*) from public.messages where conversation_id = new.conversation_id and sender_id = new.sender_id) >= 1
  then
    raise exception 'message_request_limit';
  end if;
  return new;
end $$;
create trigger messages_check before insert on public.messages
  for each row execute function public.check_message_allowed();
create trigger rl_messages before insert on public.messages
  for each row execute function public.rate_limit_check('sender_id', '1 minute', '20');
create trigger rl_conversations before insert on public.conversations
  for each row execute function public.rate_limit_check('created_by', '1 hour', '20');

create or replace function public.on_message_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return null;
end $$;
create trigger messages_touch after insert on public.messages
  for each row execute function public.on_message_created();

create or replace function public.get_or_create_conversation(other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; cid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if other is null or other = me or not exists (select 1 from public.profiles where id = other) then
    raise exception 'invalid_target';
  end if;
  if public.is_blocked_between(me, other) then raise exception 'blocked'; end if;
  a := least(me, other); b := greatest(me, other);
  select id into cid from public.conversations where user_a = a and user_b = b;
  if cid is null then
    insert into public.conversations (user_a, user_b, created_by) values (a, b, me) returning id into cid;
  end if;
  return cid;
end $$;

create or replace function public.my_conversations()
returns table (id uuid, other_user uuid, last_body text, last_sender uuid, last_at timestamptz,
               unread bigint, is_request boolean)
language sql stable security definer set search_path = public as $$
  with mine as (
    select c.id as cid, c.last_message_at as last_at,
           case when c.user_a = auth.uid() then c.user_b else c.user_a end as other_id
    from public.conversations c where auth.uid() in (c.user_a, c.user_b)
  )
  select m.cid, m.other_id, lm.body, lm.sender_id, m.last_at,
         (select count(*) from public.messages x
           where x.conversation_id = m.cid and x.sender_id <> auth.uid() and x.read_at is null),
         (not exists (select 1 from public.messages y where y.conversation_id = m.cid and y.sender_id = auth.uid())
          and not exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = m.other_id))
  from mine m
  join lateral (select z.body, z.sender_id from public.messages z
                where z.conversation_id = m.cid order by z.created_at desc limit 1) lm on true
  where not public.is_blocked_between(auth.uid(), m.other_id)
  order by m.last_at desc limit 100;
$$;

create or replace function public.mark_conversation_read(cid uuid) returns void
language sql security definer set search_path = public as $$
  update public.messages set read_at = now()
  where conversation_id = cid and sender_id <> auth.uid() and read_at is null
    and public.is_conversation_member(cid);
$$;

create or replace function public.my_unread_messages() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() in (c.user_a, c.user_b) and m.sender_id <> auth.uid() and m.read_at is null
    and not public.is_blocked_between(auth.uid(), m.sender_id);
$$;

alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------
-- 11. Eliminar la propia cuenta y todos sus datos
--     (los archivos los borra la app antes, desde la API de almacenamiento)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = me;
end $$;

-- ---------------------------------------------------------------------
-- 12. Permisos de las funciones: por defecto cualquiera (incluso sin cuenta) podía llamarlas
-- ---------------------------------------------------------------------
revoke all on function public.increment_views(uuid) from public, anon;
revoke all on function public.my_activity() from public, anon;
revoke all on function public.trending_tags(int) from public, anon;
revoke all on function public.suggested_profiles(int) from public, anon;
revoke all on function public.search_profiles(text, int) from public, anon;
revoke all on function public.get_or_create_conversation(uuid) from public, anon;
revoke all on function public.my_conversations() from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.my_unread_messages() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke all on function public.is_conversation_member(uuid) from public, anon;
revoke all on function public.check_media_url(text, uuid) from public, anon;
grant execute on function public.increment_views(uuid) to authenticated;
grant execute on function public.my_activity() to authenticated;
grant execute on function public.trending_tags(int) to authenticated;
grant execute on function public.suggested_profiles(int) to authenticated;
grant execute on function public.search_profiles(text, int) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_unread_messages() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;
-- username_available debe poder llamarse antes de crear la cuenta (anon): es lo único público
grant execute on function public.username_available(text) to anon, authenticated;
