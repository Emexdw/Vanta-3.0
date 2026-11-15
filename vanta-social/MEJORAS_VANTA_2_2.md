# VANTA 2.2 — Feed «Para ti» y «Siguiendo»

Esta versión continúa desde VANTA 2.1.

## Cambios
- Selector «Para ti» / «Siguiendo» en la versión web.
- Feed «Siguiendo» consultado directamente a Supabase por los ID de las cuentas seguidas, en lugar de filtrar solo las publicaciones de la primera página global.
- Paginación separada para ambos feeds y botón para actualizar.
- Estados de carga y vacíos específicos.
- Los cambios al seguir o dejar de seguir una cuenta actualizan el feed «Siguiendo».

## Comprobaciones pendientes
No se logró completar `npm install` dentro del tiempo disponible, así que **no se verificó el build ni se ejecutaron pruebas automatizadas**. Antes de desplegar: `npm install`, `npm run lint`, `npm run build` desde la carpeta raíz. Probar el feed con 0, 1 y varias cuentas seguidas, y paginación con más de 15 publicaciones. La aplicación móvil conserva el código de 2.1, sin esta nueva pantalla.

No se realizaron cambios remotos en GitHub ni Supabase.
