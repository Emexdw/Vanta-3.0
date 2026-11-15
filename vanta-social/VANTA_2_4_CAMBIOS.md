# VANTA 2.4 — Personalización móvil

## Cambios reales
- `mobile/app/edit-profile.tsx`: nueva pantalla para editar nombre, biografía, URL HTTPS de portada y color del perfil.
- `mobile/app/(tabs)/profile.tsx`: muestra la portada y el color configurados; el botón de edición abre la nueva pantalla.
- `mobile/src/auth/AuthProvider.tsx`: tipado del perfil actualizado con `banner_url`, `theme_color` y `location`.

## Instalación
1. Realizar una copia de seguridad de Supabase.
2. Ejecutar `supabase/003_personalizacion_perfiles.sql` si todavía no se ejecutó. No ejecutar la migración dos veces sin revisar la restricción CHECK.
3. En `mobile/`, instalar dependencias y ejecutar `npm run typecheck` y `npx expo start`.
4. Comprobar en Android e iOS la edición, el guardado y la recarga del perfil.

## Limitaciones
- En móvil, la portada se configura con una URL HTTPS. La carga directa desde galería sigue pendiente; la versión web dispone de subida.
- No se modificó la base de datos remota, el repositorio ni las credenciales.
- Esta entrega no ha superado pruebas completas de compilación o ejecución en dispositivos.
