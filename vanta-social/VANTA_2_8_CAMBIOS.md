# VANTA 2.8 — Seguridad y rendimiento

## Mejoras
- `supabase/004_seguridad_y_rendimiento.sql`: nueva migración incremental.
- Impide que clientes autenticados alteren directamente `is_verified` y contadores del perfil; las funciones privilegiadas del servidor conservan su funcionamiento.
- Restringe las URL de portada a HTTPS (o vacías) y longitud máxima de 2048 caracteres.
- Índices trigram para búsqueda por nombre de usuario, nombre público y descripción de publicaciones.
- Índices con orden estable para feeds y mensajes.

## Antes de ejecutar
1. Realizá copia de seguridad de la base de datos.
2. Verificá que las migraciones 001, 002 y 003 se hayan ejecutado.
3. Revisá las URL de portada existentes que no sean HTTPS; la restricción se crea `NOT VALID` para no bloquear datos antiguos, pero sí se aplica a nuevas filas y actualizaciones.
4. Ejecutá `supabase/004_seguridad_y_rendimiento.sql` en Supabase SQL Editor.
5. Probá con una cuenta normal que se pueda editar la biografía pero no `is_verified`.
6. Probá que seguidores y publicaciones actualicen sus contadores desde los triggers del servidor.

## Limitaciones
- La migración SQL no se ejecutó en un proyecto Supabase real.
- No se ejecutaron pruebas de integración con dos cuentas ni compilación móvil.
- Las URL de portada externas pueden rastrear visitas; se recomienda usar el almacenamiento propio.
- Los índices ocupan espacio adicional en PostgreSQL.
