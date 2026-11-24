# VANTA 4.0 — Etapa 6: auditoría e integración

## Resultado provisional

**NO APROBADO PARA PRODUCCIÓN TODAVÍA.** Se revisaron los archivos de la Etapa 5 y las migraciones SQL; no hubo acceso al proyecto Supabase de pruebas ni se ejecutaron pruebas con dos cuentas.

## Comprobaciones realizadas

- Las tablas `profiles`, `posts`, `messages` y `conversations` tienen políticas RLS definidas en las migraciones.
- La migración `005_personalizacion_avanzada.sql` añade columnas de perfil con restricciones y permisos de actualización.
- La migración `006_publicaciones_fijadas.sql` crea `profile_pins` con RLS, restricción de propietario y trigger de máximo tres fijados.
- El bucket `media` se crea con `public = true`: sus URLs públicas NO deben considerarse privadas.
- Las funciones SQL `security definer` requieren revisión de permisos efectiva y pruebas en una instancia de desarrollo.

## Limitaciones

- La instalación de dependencias con `npm install --no-audit --no-fund --prefer-offline` no terminó dentro del tiempo disponible. No se ha validado `npm run build` ni `npm run lint`.
- La existencia de políticas SQL en archivos no confirma que estén aplicadas a la base de datos real.
- No se han verificado permisos en ejecución ni pruebas con dos cuentas.

## Plan de pruebas seguro

1. Crear un proyecto Supabase de pruebas separado de producción.
2. Aplicar `schema.sql`, `002`, `003`, `004`, `005` y `006` EN ESE ORDEN solamente en la base de pruebas nueva.
3. Ejecutar `007_auditoria_solo_lectura.sql` y revisar las políticas y los permisos efectivos.
4. Configurar las variables de entorno del despliegue preview de Vercel para apuntar al Supabase de pruebas. No copiar claves de servicio al cliente.
5. Ejecutar `npm install`, `npm run lint` y `npm run build` en un entorno con acceso a npm.
6. Probar con dos cuentas: editar perfil propio/ajeno, fijar máximo tres publicaciones propias, leer mensajes solo de participantes, bloqueo, cierre de sesión y URLs públicas de medios.
7. Corregir cualquier error y repetir las pruebas antes de fusionar `vanta-4.0` con `main`.

## Importante

No ejecutar las migraciones pendientes en producción hasta completar la validación. Este paquete conserva la aplicación de Etapa 5 y agrega documentación y una consulta de auditoría de solo lectura; **no afirma que se hayan corregido todos los riesgos**.
