-- VANTA 2.3: ejecutar una sola vez en Supabase SQL Editor antes de usar el editor de portada.
-- Las políticas RLS existentes de public.profiles siguen aplicando.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme_color text NOT NULL DEFAULT '#8b5cf6';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_theme_color_valid'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_theme_color_valid CHECK (theme_color ~ '^#[0-9a-fA-F]{6}$');
  END IF;
END $$;
