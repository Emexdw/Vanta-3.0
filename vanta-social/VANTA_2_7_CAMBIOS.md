# VANTA 2.7 — Clips en Android y iOS

## Cambios
- Un solo clip activo a la vez; se pausa al salir de la pestaña o al pasar a otro vídeo.
- Toque para pausar/reproducir, botón de silenciar y activar sonido.
- Carga paginada de clips (12 por consulta), actualización manual y reintento tras errores.
- Renderizado acotado a pocos clips para reducir memoria y uso de red.
- Estados vacíos y mensajes de error accesibles.

## Comprobaciones pendientes
- Ejecutar `npm install` y `npm run typecheck` desde `mobile/`.
- Probar en Android e iOS que la reproducción se pausa al salir de la pestaña.
- Comprobar que los vídeos de Storage usan URL accesibles y que la paginación no omite elementos con la misma fecha.
- No se han modificado repositorios, dependencias ni bases de datos remotas.
