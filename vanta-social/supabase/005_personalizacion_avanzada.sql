-- VANTA 3.2 — Personalización avanzada (ejecutar UNA VEZ en Supabase SQL Editor)
-- Conserva datos existentes y políticas RLS de public.profiles.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_style text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS banner_style text NOT NULL DEFAULT 'aurora';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_website_url_valid') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_website_url_valid CHECK (website_url = '' OR (length(website_url) <= 200 AND website_url ~* '^https://[^[:space:]]+$'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_profile_style_valid') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_profile_style_valid CHECK (profile_style IN ('classic', 'compact', 'spotlight'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_banner_style_valid') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_banner_style_valid CHECK (banner_style IN ('aurora', 'gradient', 'minimal'));
  END IF;
END $$;

GRANT UPDATE (website_url, profile_style, banner_style) ON public.profiles TO authenticated;
-- La política RLS profiles_update_own existente sigue protegiendo cada fila.
