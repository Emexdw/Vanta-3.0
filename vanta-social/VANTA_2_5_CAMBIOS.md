# VANTA 2.5 — Explorar móvil

## Cambios implementados
- La pantalla móvil Explorar incorpora pestañas «Personas» y «Publicaciones».
- Búsqueda por nombre/usuario, y búsqueda por texto de descripción de publicaciones.
- Resultados limitados a 30 y ordenados por popularidad de perfil o fecha de publicación.
- Estados de carga, error y resultados vacíos.
- Seguimiento y apertura de mensajes desde los resultados de personas.
- Apertura de publicaciones desde los resultados.

## Limitaciones y validación
- Se necesita una sesión autenticada y las políticas RLS existentes deben permitir la lectura.
- La búsqueda de publicaciones es por texto de caption, no búsqueda semántica ni hashtags completos.
- Las búsquedas se ejecutan al pulsar Buscar o cambiar de pestaña, no en cada tecla.
- `npm run typecheck` no pudo completarse: faltan dependencias de Expo/React Native en este entorno. Instalar dependencias en mobile antes de repetir.
- No se cambiaron credenciales, repositorios ni la base de datos remota.
