# VANTA — primera ronda de correcciones (14/11/2026)

## Correcciones realizadas

1. **Web:** se recuperó `src/components/BottomNav.tsx`, importado por `src/App.tsx` pero ausente del ZIP. Incluye navegación accesible, indicador de actividad, avatar y acción de crear.
2. **Móvil:** se configuró el almacenamiento persistente de sesión de Supabase usando `expo-sqlite/localStorage`, disponible mediante la dependencia Expo SQLite ya declarada. Se añadió el polyfill de URL de React Native.
3. Se preservaron el diseño, las pantallas y las migraciones SQL existentes. **No se aplicaron migraciones ni cambios a la base de datos remota.**

## Antes de desplegar

- En la raíz: `npm install && npm run lint && npm run build`.
- En `mobile/`: `npm install && npm run typecheck && npx expo-doctor`.
- Configurar `.env` y `mobile/.env` a partir de sus `.env.example`. No publicar secretos ni la `service_role`.
- Probar manualmente registro, login/logout, recuperación de sesión tras reiniciar la app, feed, creación, clips, mensajes y perfiles.
- Revisar las políticas RLS y la migración `supabase/002_seguridad_y_chat.sql` en un proyecto de pruebas antes de ejecutarlas en producción.

## Limitaciones

Esta entrega es una **primera ronda de correcciones**, no una auditoría completa ni una versión de producción certificada. No se instalaron dependencias ni se ejecutó una compilación completa en este entorno. Las versiones declaradas de las dependencias deben verificarse contra los registros oficiales antes de instalar o actualizar.
