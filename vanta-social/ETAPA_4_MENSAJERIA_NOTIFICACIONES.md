# VANTA 4.0 — Etapa 4: mensajería y notificaciones

Esta etapa parte del ZIP de la etapa 3 y conserva las etapas anteriores.

## Cambios
- Mensajes: botón de actualización manual de conversaciones con indicador de carga.
- Mensajes: estado visible de la conexión Realtime y aviso si se interrumpe.
- Mensajes: actualización de la bandeja al recuperar foco y cada 30 segundos mientras la pestaña está visible, como respaldo de Realtime.
- Notificaciones: sincronización al entrar a Actividad o volver a la pestaña.
- No se agregaron tablas, permisos ni migraciones SQL en esta etapa.

## Pendiente de validar
- `npm install`, `npm run lint` y `npm run build` en un entorno con acceso a dependencias.
- Pruebas con dos cuentas, envío de mensajes, solicitudes, lectura, bloqueos y reconexión.
- Revisión de políticas RLS y exposición de eventos Realtime antes del lanzamiento.

No publicar todavía en producción ni ejecutar migraciones pendientes en el Supabase principal.
