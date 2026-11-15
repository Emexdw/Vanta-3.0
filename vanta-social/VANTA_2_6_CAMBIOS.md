# VANTA 2.6 — Mensajería móvil

- Búsqueda local de conversaciones por usuario, nombre y vista previa.
- Deslizar para actualizar la lista de conversaciones y los mensajes del chat.
- Avisos de error y reintento al cargar datos.
- Actualización del estado de lectura al recibir mensajes de otros participantes.
- Protección contra mensajes duplicados al combinar inserción y Realtime.
- Mejoras de accesibilidad en los campos de búsqueda y redacción.

## Comprobaciones pendientes

Instalar dependencias en `mobile/` con `npm install`, ejecutar `npm run typecheck` y probar mensajes y Realtime en dos cuentas de prueba. Las funciones RPC de mensajería deben estar desplegadas en Supabase. No se modificó ninguna infraestructura remota.
