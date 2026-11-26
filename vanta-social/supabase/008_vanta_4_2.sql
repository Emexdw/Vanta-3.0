-- Incremental; run after schema and migrations 002–006, in staging first.
begin;
create table if not exists public.reposts (
 user_id uuid not null references public.profiles(id) on delete cascade,
 post_id uuid not null references public.posts(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,post_id)
);
alter table public.reposts enable row level security;
revoke all on public.reposts from anon, authenticated;
grant select, insert, delete on public.reposts to authenticated;
drop policy if exists repost_read_own on public.reposts;
create policy repost_read_own on public.reposts for select to authenticated using (user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists repost_insert_own on public.reposts;
create policy repost_insert_own on public.reposts for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id));
drop policy if exists repost_delete_own on public.reposts;
create policy repost_delete_own on public.reposts for delete to authenticated using (user_id=auth.uid());
create index if not exists reposts_user_created_idx on public.reposts(user_id,created_at desc);
-- Prevent counting views on blocked posts through the security-definer RPC.
create or replace function public.increment_views(target uuid) returns void
language plpgsql security definer set search_path=public as $$
declare me uuid := auth.uid(); inserted int;
begin
 if me is null then return; end if;
 if not exists(select 1 from public.posts p where p.id=target and not public.is_blocked_between(me,p.user_id)) then return; end if;
 insert into public.post_views(post_id,user_id) values(target,me) on conflict do nothing;
 get diagnostics inserted = row_count;
 if inserted > 0 then update public.posts set views_count=views_count+1 where id=target; end if;
end $$;
revoke all on function public.increment_views(uuid) from public, anon;
grant execute on function public.increment_views(uuid) to authenticated;
commit;
