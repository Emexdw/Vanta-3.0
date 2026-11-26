-- VANTA 4.0 etapa 2: publicaciones fijadas. Ejecutar DESPUÉS de las migraciones anteriores.
create table if not exists public.profile_pins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists profile_pins_order_idx on public.profile_pins(user_id, pinned_at desc);
alter table public.profile_pins enable row level security;
drop policy if exists profile_pins_read on public.profile_pins;
create policy profile_pins_read on public.profile_pins for select to authenticated using (true);
drop policy if exists profile_pins_insert_own on public.profile_pins;
create policy profile_pins_insert_own on public.profile_pins for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid())
  ));
drop policy if exists profile_pins_delete_own on public.profile_pins;
create policy profile_pins_delete_own on public.profile_pins for delete to authenticated
  using (user_id = (select auth.uid()));

-- Límite verificado en la base de datos, no solo en la interfaz.
create or replace function public.enforce_profile_pin_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- Serializa las inserciones simultáneas del mismo usuario.
  perform 1 from public.profiles where id = new.user_id for update;
  if (select count(*) from public.profile_pins where user_id = new.user_id) >= 3 then
    raise exception 'pin_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists profile_pin_limit on public.profile_pins;
create trigger profile_pin_limit before insert on public.profile_pins
  for each row execute function public.enforce_profile_pin_limit();
grant select, insert, delete on public.profile_pins to authenticated;
