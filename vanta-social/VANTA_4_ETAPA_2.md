# VANTA 4.0 — Etapa 2: publicaciones y feed

## Cambios
- Se incorporó la opción de fijar/desfijar hasta 3 publicaciones propias desde el perfil.
- Las publicaciones fijadas aparecen primero en la pestaña Posts, también para visitantes.
- El límite de 3 y la propiedad del post se verifican en Supabase (RLS y trigger).
- El feed «Para ti»/«Siguiendo» y los guardados ya existían; se conservaron sin duplicarlos.

## Instalación de desarrollo
1. Trabajar exclusivamente en la rama `vanta-4.0`.
2. Para probar, ejecutar `supabase/006_publicaciones_fijadas.sql` en un proyecto Supabase de desarrollo, después de las migraciones previas.
3. No ejecutar la migración en producción todavía.
4. Compilar con `npm install` y `npm run build` en la carpeta `vanta-social`.

## Pruebas sugeridas
- A fija 3 publicaciones; B las ve arriba en el perfil de A.
- A no puede fijar una cuarta.
- B no puede fijar ni desfijar publicaciones de A.
- A desfija una y puede fijar otra.
- Los guardados y las pestañas de feed siguen funcionando.
