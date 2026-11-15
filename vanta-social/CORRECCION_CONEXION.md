# VANTA 3.0 — corrección de relaciones Supabase

Se corrigieron cinco consultas de `src/lib/api.ts` que usaban relaciones ambiguas `profiles(*)`:
- Publicaciones y guardados: `profiles!posts_user_id_fkey`
- Comentarios: `profiles!comments_user_id_fkey`
- Historias: `profiles!stories_user_id_fkey`

No es necesario ejecutar SQL nuevo ni borrar tablas. Subí la carpeta `vanta-social` actualizada al mismo repositorio de GitHub y dejá Root Directory = `vanta-social` en Vercel. Vercel debería generar un nuevo despliegue con el commit.

**Nota:** Esto corrige la causa de PGRST201 identificada en el código. El error HTTP 522 de la función `my_unread_messages` es independiente y puede requerir revisar la salud de Supabase y la pestaña Network del navegador. La compilación no se pudo verificar en este entorno porque la instalación de dependencias agotó el tiempo disponible.
