# VANTA 3.0 — Beta técnica (candidata, no certificada)

## Cambios de esta versión
- Paginación estable en Clips móvil usando `created_at` + `id` para no omitir vídeos publicados en el mismo instante.
- Migración 003 de perfil repetible: no falla por la restricción de color si ya existe.
- `scripts/check_beta.py`: comprobaciones estáticas de estructura y manifiestos, sin dependencias externas.
- Guía de validación antes de invitar usuarios reales.

## Preparación
1. Hacé copia de seguridad de Supabase y del proyecto anterior.
2. En un proyecto de pruebas vacío, ejecutá `supabase/schema.sql`, `002_seguridad_y_chat.sql`, `003_personalizacion_perfiles.sql` y `004_seguridad_y_rendimiento.sql` **en ese orden**. Si tu base ya existe, aplicá solo migraciones pendientes.
3. Configurá variables de entorno con la URL y clave **anon/publishable** de Supabase; jamás incluyas `service_role` en el cliente.
4. Ejecutá `python3 scripts/check_beta.py`.
5. En la raíz: `npm install`, `npm run lint`, `npm run build`, `npm run dev`.
6. En `mobile/`: `npm install`, `npm run typecheck`, `npx expo start`.
7. Si alguna comprobación falla, no publiques la beta todavía.

## Pruebas manuales con dos cuentas
- Registro, login, logout, recuperación de sesión.
- Crear post y clip; subir imagen/vídeo; comprobar límites de tamaño y tipo.
- Explorar personas/publicaciones, seguir/dejar de seguir, feed Siguiendo.
- Enviar mensajes y comprobar que un tercero no puede leerlos.
- Notificaciones: eventos, lectura, actualización.
- Editar perfil: nombre, biografía, portada, color; comprobar políticas RLS.
- Clips: pausar, silenciar, cambiar de pestaña, scroll, 2 clips con misma fecha.
- Comprobar pantallas vacías, conexión perdida y errores de red.
- Comprobar accesibilidad y permisos en Android/iOS.

## Pendiente antes de un lanzamiento público
- Compilaciones reales web/Android/iOS, pruebas SQL/RLS con usuarios y dispositivos.
- Revisión de privacidad, moderación, bloqueo/reporte, límites de subida y protección de datos.
- Políticas de retención, eliminación de cuenta y contenido.

No se aplicaron migraciones a Supabase ni se publicó en GitHub o tiendas.
