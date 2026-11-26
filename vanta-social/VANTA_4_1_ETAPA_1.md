# VANTA 4.1 — Etapa 1 (web)

Cambios incluidos:
- Registro con pantalla de verificación de correo mediante OTP de 6 dígitos y reenvío.
- Listas de seguidores y seguidos accesibles desde perfiles propios y ajenos.
- Configuración > Cuentas bloqueadas, con listado y desbloqueo.

## Configuración obligatoria en Supabase DEV

En Authentication > Email Templates > Confirm signup, reemplazar el enlace de confirmación por el token de seis dígitos: `{{ .Token }}`. Mantener activada la confirmación por correo en Authentication > Providers > Email. Supabase controla caducidad y límites de intentos; no inventar un control paralelo en el frontend.

Las listas usan las relaciones `follows_follower_id_fkey` y `follows_following_id_fkey`, ya usadas en el proyecto. El listado de bloqueos utiliza la relación `blocks_blocked_id_fkey` existente.

## Publicación

Crear rama `vanta-4.1` a partir de `vanta-4.0` y subir el contenido de `vanta-social` a esa carpeta del repositorio. No fusionar en `main`. Configurar un despliegue de pruebas para la rama nueva. Mantener las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY apuntando a DEV.

## Validación pendiente

No fue posible ejecutar la compilación completa en este entorno porque la instalación de dependencias excedió el tiempo disponible. Ejecutar `npm install`, `npm run lint`, `npm run build` y probar registro OTP, seguidores y bloqueos en DEV antes de continuar.

## Próximas etapas previstas

Perfiles (fondos, tipografías, música con controles de derechos), feed, Clips 2.0, mensajería 2.0, Explorar, rendimiento y auditoría final. Estos módulos **no** están implementados en este paquete de Etapa 1.
