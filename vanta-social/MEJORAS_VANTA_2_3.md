# VANTA 2.3 — Personalización de perfiles (web)

## Implementado
- Portadas de perfil subidas al bucket `media` existente (máximo 10 MB antes de comprimir).
- Seis colores de acento predefinidos.
- Vista previa de portada y tema en el editor.
- Portada y color visibles para otros usuarios.
- Validación SQL de color hexadecimal; se conserva RLS existente.

## Instalación
1. Hacé una copia de seguridad de Supabase.
2. Ejecutá `supabase/003_personalizacion_perfiles.sql` en SQL Editor. No ejecutes `schema.sql` de nuevo.
3. Configurá variables de entorno según README y probá `npm install`, `npm run lint`, `npm run build`.
4. Probá crear/editar perfiles y verlos desde otra cuenta.

## Alcance y precauciones
- Esta actualización modifica la **web**; no incorpora todavía el editor en Expo móvil.
- No se ha aplicado la migración a ninguna base de datos real.
- El almacenamiento de portadas usa el bucket público `media` y por tanto las portadas son públicas.
- Si ya existe la restricción `profiles_theme_color_valid`, omití la sentencia ADD CONSTRAINT al repetir la migración.
