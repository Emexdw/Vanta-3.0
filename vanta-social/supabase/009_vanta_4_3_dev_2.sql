begin;
revoke update on public.posts from authenticated, anon;
grant update (caption, location, tags) on public.posts to authenticated;
drop policy if exists posts_edit_own on public.posts;
create policy posts_edit_own on public.posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
commit;
