-- =====================================================================
-- VANTA · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutalo COMPLETO en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- Perfiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name text not null default '' check (char_length(display_name) <= 50),
  avatar_url text not null default '',
  bio text not null default '' check (char_length(bio) <= 160),
  location text not null default '' check (char_length(location) <= 60),
  is_verified boolean not null default false,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  posts_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Publicaciones y clips (misma tabla, distinto "kind") ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('post', 'clip')),
  media_urls text[] not null check (array_length(media_urls, 1) between 1 and 10),
  poster_url text,
  duration text,
  caption text not null default '' check (char_length(caption) <= 500),
  tags text[] not null default '{}',
  location text,
  sound_title text,
  sound_artist text,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  shares_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index posts_kind_created_idx on public.posts (kind, created_at desc);
create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index posts_tags_idx on public.posts using gin (tags);

-- ---------- Interacciones ----------
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at desc);

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id, created_at desc);

-- ---------- Historias (duran 24 h) ----------
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  caption text check (char_length(caption) <= 200),
  sound_title text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index stories_expires_idx on public.stories (expires_at);

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (story_id, user_id)
);

-- ---------- Notificaciones y reportes ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow')),
  post_id uuid references public.posts(id) on delete cascade,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reason text not null default 'other',
  created_at timestamptz not null default now(),
  unique (reporter_id, post_id)
);

-- =====================================================================
-- Triggers: crean el perfil, mantienen contadores y generan notificaciones
-- =====================================================================

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if uname !~ '^[a-z0-9_.]{3,24}$' or exists (select 1 from public.profiles where username = uname) then
    uname := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, coalesce(nullif(left(new.raw_user_meta_data->>'display_name', 50), ''), uname));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.on_post_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = new.user_id;
  else
    update public.profiles set posts_count = greatest(posts_count - 1, 0) where id = old.user_id;
  end if;
  return null;
end $$;
create trigger posts_counter after insert or delete on public.posts
  for each row execute function public.on_post_change();

create function public.on_like_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id returning user_id into owner;
    if owner is not null and owner <> new.user_id
       and not exists (select 1 from public.notifications
                       where user_id = owner and actor_id = new.user_id and type = 'like' and post_id = new.post_id) then
      insert into public.notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'like', new.post_id);
    end if;
  else
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger post_likes_counter after insert or delete on public.post_likes
  for each row execute function public.on_like_change();

create function public.on_comment_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id returning user_id into owner;
    if owner is not null and owner <> new.user_id then
      insert into public.notifications (user_id, actor_id, type, post_id, body)
      values (owner, new.user_id, 'comment', new.post_id, left(new.text, 80));
    end if;
  else
    update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger comments_counter after insert or delete on public.comments
  for each row execute function public.on_comment_change();

create function public.on_comment_like_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set likes_count = likes_count + 1 where id = new.comment_id;
  else
    update public.comments set likes_count = greatest(likes_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end $$;
create trigger comment_likes_counter after insert or delete on public.comment_likes
  for each row execute function public.on_comment_like_change();

create function public.on_follow_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    if not exists (select 1 from public.notifications
                   where user_id = new.following_id and actor_id = new.follower_id and type = 'follow') then
      insert into public.notifications (user_id, actor_id, type) values (new.following_id, new.follower_id, 'follow');
    end if;
  else
    update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  end if;
  return null;
end $$;
create trigger follows_counter after insert or delete on public.follows
  for each row execute function public.on_follow_change();

-- =====================================================================
-- Funciones (RPC) que usa la app
-- =====================================================================

create function public.trending_tags(max_rows int default 10)
returns table (tag text, uses bigint, thumb text)
language sql stable set search_path = public as $$
  select t.tag, count(*) as uses,
         (array_agg(coalesce(p.poster_url, p.media_urls[1]) order by p.likes_count desc))[1] as thumb
  from public.posts p cross join lateral unnest(p.tags) as t(tag)
  where p.created_at > now() - interval '30 days'
  group by t.tag order by uses desc, t.tag limit max_rows;
$$;

create function public.suggested_profiles(max_rows int default 8)
returns setof public.profiles
language sql stable set search_path = public as $$
  select * from public.profiles p
  where p.id <> auth.uid()
    and not exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.id)
  order by p.followers_count desc, p.created_at desc limit max_rows;
$$;

create function public.my_activity() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'likes', (select count(*) from public.post_likes l join public.posts p on p.id = l.post_id
              where p.user_id = auth.uid() and l.created_at > now() - interval '7 days'),
    'comments', (select count(*) from public.comments c join public.posts p on p.id = c.post_id
                 where p.user_id = auth.uid() and c.user_id <> auth.uid() and c.created_at > now() - interval '7 days'),
    'followers', (select count(*) from public.follows where following_id = auth.uid() and created_at > now() - interval '7 days'),
    'views', (select coalesce(sum(views_count), 0) from public.posts where user_id = auth.uid())
  );
$$;

create function public.increment_views(target uuid) returns void
language sql security definer set search_path = public as $$
  update public.posts set views_count = views_count + 1 where id = target;
$$;

-- =====================================================================
-- Seguridad (Row Level Security): nadie puede tocar datos ajenos
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

-- Perfiles: públicos; cada persona edita solo el suyo y solo ciertas columnas
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, bio, location) on public.profiles to authenticated;

-- Publicaciones
create policy "posts_read" on public.posts for select to authenticated using (true);
create policy "posts_insert_own" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "posts_delete_own" on public.posts for delete to authenticated using (user_id = auth.uid());

-- Me gusta y guardados: solo ves los tuyos
create policy "likes_read_own" on public.post_likes for select to authenticated using (user_id = auth.uid());
create policy "likes_insert_own" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "likes_delete_own" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create policy "bookmarks_read_own" on public.bookmarks for select to authenticated using (user_id = auth.uid());
create policy "bookmarks_insert_own" on public.bookmarks for insert to authenticated with check (user_id = auth.uid());
create policy "bookmarks_delete_own" on public.bookmarks for delete to authenticated using (user_id = auth.uid());

-- Comentarios
create policy "comments_read" on public.comments for select to authenticated using (true);
create policy "comments_insert_own" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "comments_delete_own" on public.comments for delete to authenticated using (user_id = auth.uid());

create policy "comment_likes_read_own" on public.comment_likes for select to authenticated using (user_id = auth.uid());
create policy "comment_likes_insert_own" on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
create policy "comment_likes_delete_own" on public.comment_likes for delete to authenticated using (user_id = auth.uid());

-- Seguidores
create policy "follows_read" on public.follows for select to authenticated using (true);
create policy "follows_insert_own" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "follows_delete_own" on public.follows for delete to authenticated using (follower_id = auth.uid());

-- Historias: solo las vigentes
create policy "stories_read_active" on public.stories for select to authenticated
  using (expires_at > now() or user_id = auth.uid());
create policy "stories_insert_own" on public.stories for insert to authenticated with check (user_id = auth.uid());
create policy "stories_delete_own" on public.stories for delete to authenticated using (user_id = auth.uid());

create policy "story_views_read_own" on public.story_views for select to authenticated using (user_id = auth.uid());
create policy "story_views_insert_own" on public.story_views for insert to authenticated with check (user_id = auth.uid());

-- Notificaciones: solo las tuyas; solo podés marcarlas como leídas
create policy "notifications_read_own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- Reportes: cualquiera puede reportar; solo el equipo los lee (desde el panel de Supabase)
create policy "reports_insert_own" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- =====================================================================
-- Almacenamiento de imágenes y videos
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "media_read" on storage.objects for select using (bucket_id = 'media');
create policy "media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Tiempo real para las notificaciones
-- =====================================================================
alter publication supabase_realtime add table public.notifications;
