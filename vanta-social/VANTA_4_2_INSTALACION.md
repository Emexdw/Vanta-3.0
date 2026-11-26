# VANTA 4.2 — entrega incremental (beta parcial)

Base: ZIP VANTA 4.1. No se eliminaron funciones deliberadamente. No se actualizan dependencias. No es una versión lista para producción.

## Cambios
- Logo provisional SVG y PNG, favicon, cabecera y acceso web/móvil. Sustituir por el original oficial cuando esté disponible.
- OTP web: tipo email, recuperación de pantalla de verificación, mensaje de código vencido. Móvil: verificación y reenvío, consulta de disponibilidad de usuario mediante RPC. El envío real depende de Supabase.
- Feed web: intereses explícitos separados por comas, ordenación de publicaciones ya cargadas; vacío mantiene orden cronológico. No es un recomendador global ni persiste preferencias.
- Colección privada de republicaciones de fotos y clips en web, con atribución. No es una republicación pública en el feed de seguidores.
- Guardado móvil de publicaciones y reversión de lista de guardados web en caso de error.
- Reintento de registro de vistas web; SQL impide registrar vistas de publicaciones bloqueadas.
- Se conservan portadas, temas, estilos, fijados, buscador, precarga de clips, estadísticas, solicitudes de mensajes y denuncias existentes de 4.1 donde ya estaban implementados.

## Instalación
1. Hacer copia de GitHub y de la base de datos. Crear rama y proyecto Supabase de pruebas. No usar producción para ensayos.
2. Si el proyecto ya tiene schema.sql y migraciones 002–006, ejecutar únicamente `supabase/008_vanta_4_2.sql` en SQL Editor de pruebas. 007 es una auditoría de lectura, no una migración. En una base nueva ejecutar schema y 002–006 en orden antes de 008. No repetir scripts antiguos en una base existente.
3. En Authentication > Email Templates > Confirm signup, usar `{{ .Token }}` en el cuerpo del correo. Mantener confirmación de correo habilitada. Configurar SMTP autorizado para destinatarios reales y revisar logs de Auth y límites si aparece 403. No exponer service_role ni desactivar confirmación para resolver errores. Revisar Site URL y configuración de correo. No se ha verificado el envío real.
4. En `vanta-social`, copiar `.env.example` a `.env.local` y completar URL y clave pública anon. Ejecutar `npm install`, `npm run lint`, `npm run build`, `npm run dev`. En Vercel usar Root Directory `vanta-social`, variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY y salida dist. No subir archivos .env con secretos.
5. En `vanta-social/mobile`, copiar `.env.example` a `.env`, completar variables públicas, ejecutar `npm install`, `npx expo install --check`, `npm run typecheck`, `npx expo start`. Probar en Android y iOS compatibles con el SDK; no se han validado versiones ni dispositivos. Si hay incompatibilidades resolver en rama de pruebas antes de desplegar.

## Pruebas pendientes obligatorias
- Dos cuentas de prueba: alta, OTP incorrecto/vencido, reenvío, sesión, cierre y reinicio de app.
- Guardar/quitar guardado en ambos clientes, recargar; comprobar que otra cuenta no lee guardados ni republicaciones privadas.
- Bloquear cuenta B desde A; comprobar feed, búsqueda, comentarios, historias, vistas y acceso directo a objetos Storage. El bucket existente es público: NO garantiza privacidad de archivos. No habilitar cuentas privadas hasta diseñar migración de almacenamiento y políticas completas.
- Verificar que un tercero no puede leer/escribir mensajes de A y B ni cambiar contadores o campos de verificación. Ejecutar 007 y revisar permisos efectivos.
- Comprobar colección de republicaciones, clips, perfiles, mensajes y denuncias existentes. Probar carga lenta y errores de red.
- Compilar web y ejecutar Android/iOS en dispositivos. No publicar hasta superar estas pruebas.

## Alcance pendiente
Fondos/tipografías nuevos y orden libre de galería; recomendaciones globales y buscador avanzado; republicación pública; nuevas estadísticas y optimización profunda de clips; respuestas/reacciones/fotos privadas/indicador de escritura en chat; cuentas privadas y auditoría integral RLS/Storage; paridad completa móvil. No se implementan como controles ficticios. Las fotos de chat requieren bucket privado y autorización de participantes.

## Validación de esta entrega
Transpilación sintáctica TypeScript local de archivos TS/TSX (no equivale a comprobación de tipos ni build). Instalación offline falló por falta de dependencias en caché. No se ejecutó SQL ni se conectó a Supabase. No se realizaron pruebas Android/iOS.
