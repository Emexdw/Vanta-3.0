# VANTA 2.9 — Actividad móvil

- Pantalla Actividad con carga inicial, refresco manual y reintento ante errores.
- Suscripción a inserciones de notificaciones mediante Supabase Realtime, filtrada por usuario.
- Marcado como leído de las notificaciones consultadas; no marca todas las notificaciones indiscriminadamente.
- Indicador visual de notificaciones leídas y no leídas.
- Limpieza de la suscripción al salir o cambiar de sesión.

## Para probar

1. Instalar dependencias en `mobile` con `npm install`.
2. Ejecutar `npm run typecheck` y `npx expo start`.
3. Probar con dos cuentas: seguir, dar me gusta y comentar; comprobar que aparece la notificación, se actualiza y se marca como leída.
4. Revisar que `notifications` esté habilitada en Supabase Realtime y que sus políticas RLS sean las esperadas.

No se ha ejecutado compilación completa ni pruebas en dispositivos. No se alteró la base de datos remota.
