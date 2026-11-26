# VANTA 4.0 — Etapa 3: Clips y videos

Esta etapa parte del ZIP de la Etapa 2 y conserva los cambios anteriores.

## Cambios en la web
- El clip activo se pausa cuando la pestaña se oculta o el reproductor sale de la pantalla.
- Control accesible para adelantar o retroceder en el video.
- Indicador de carga mientras el video almacena datos en búfer.
- Mensaje visible cuando falla la reproducción.
- Precarga completa solo del clip activo; los clips adyacentes cargan metadatos.
- Conserva interacciones existentes: me gusta, comentarios, guardados, compartir, seguir y sonido.

## Archivos modificados
- `src/components/TikTokReelView.tsx`

## Instalación futura
No se necesita migración SQL para esta etapa. No publicar todavía en producción.

## Pruebas pendientes
Probar reproducción y pausa en Chrome, Firefox, Safari móvil y Android; cambio de pestaña, scroll, red lenta, barra de progreso y videos inaccesibles. Compilación pendiente.
