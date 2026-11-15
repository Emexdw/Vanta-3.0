# VANTA 2.1 — segunda ronda de mejoras

## Cambios realizados

- `src/components/ErrorBoundary.tsx`: pantalla de recuperación ante errores de renderizado de React. No se registran datos privados de usuarios.
- `src/components/ConnectionBanner.tsx`: aviso accesible cuando el navegador detecta ausencia de conexión, con limpieza correcta de eventos. No se confunde `navigator.onLine` con disponibilidad del backend.
- `src/Root.tsx`: integración de ambos componentes en la aplicación web autenticada.
- `src/components/PostCard.tsx`: carga diferida y decodificación asíncrona de imágenes del feed y avatares, con descripción alternativa para publicaciones sin texto.
- `src/index.css`: preferencia de movimiento reducido y espacio seguro para el indicador inferior del móvil.
- `src/components/BottomNav.tsx`: etiquetas `title` en accesos de navegación.

## Validación pendiente

- Ejecutar `npm install`, `npm run lint` y `npm run build` en la raíz con Node compatible con Vite 8.
- Verificar el funcionamiento real con credenciales de Supabase de prueba; **no** se incluyen credenciales.
- Verificar el cliente Expo con `cd mobile && npm install && npm run typecheck`.
- Confirmar RLS y migraciones en una base de datos de desarrollo antes de tocar producción.

## Cómo usar

Descomprimir, comparar los cambios con el repositorio y hacer commit en una rama de pruebas. No ejecutar migraciones SQL a ciegas. Nunca subir `.env`.
