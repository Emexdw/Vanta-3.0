# VANTA Mobile (Android + iOS)

Aplicación móvil nativa de VANTA construida con Expo, React Native y TypeScript. Comparte el backend Supabase y el esquema SQL con la versión web. Expo Router permite mantener rutas coherentes entre Android, iOS y web.

## Requisitos
- Node.js LTS
- npm
- Expo Go para probar en un teléfono (o emulador Android / simulador iOS)
- El mismo proyecto Supabase que usa VANTA Web

## Configuración
1. Desde esta carpeta, copiá `.env.example` como `.env`.
2. Completá `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` con los valores públicos del proyecto Supabase. Nunca uses `service_role` en la app.
3. Instalá dependencias: `npm install`.
4. Alineá los módulos nativos con el SDK instalado: `npx expo install --fix`.
5. Iniciá: `npx expo start`.
6. Escaneá el QR desde Expo Go, o abrí un emulador.

## Funcionalidades implementadas en esta primera base móvil
- Registro e inicio de sesión por Supabase Auth.
- Feed de publicaciones y acción de me gusta.
- Búsqueda de perfiles.
- Exploración y reproducción de clips con controles nativos.
- Comentarios, seguimiento de perfiles y mensajería 1 a 1 básica.
- Selector de fotos y videos, carga al bucket `media` y creación de publicaciones/clips.
- Actividad/notificaciones.
- Perfil propio y cierre de sesión.

## Pendiente antes de publicar
- Completar edición de perfil, guardados, compartir, historias y controles de privacidad/bloqueo/reporte en pantallas móviles.
- Añadir revisión de contenido, moderación, reglas de comunidad y mecanismos de seguridad adecuados a la edad de la audiencia.
- Añadir pruebas automatizadas, accesibilidad, métricas de rendimiento y manejo de errores de red.
- Configurar identificadores de tienda, iconos, splash, privacidad, builds EAS y revisión de políticas de Apple/Google.

## Nota sobre el backend
La app requiere que se hayan ejecutado los SQL de `../supabase/schema.sql` y `../supabase/002_seguridad_y_chat.sql`. El bucket `media` debe existir (lo crea el esquema). Verificá RLS y límites de carga antes de usar con usuarios reales.
