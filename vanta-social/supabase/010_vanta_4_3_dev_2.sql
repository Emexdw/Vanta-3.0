begin;
alter table public.profiles add column if not exists background_url text not null default '', add column if not exists music_url text not null default '';
grant update (background_url, music_url) on public.profiles to authenticated;
update storage.buckets set allowed_mime_types = array(select distinct unnest(allowed_mime_types || array['audio/mpeg','audio/mp4','audio/ogg','audio/wav'])) where id='media' and allowed_mime_types is not null;
commit;
