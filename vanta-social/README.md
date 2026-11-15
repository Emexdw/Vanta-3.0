# Vanta — red social (React + Supabase)

Feed de fotos, clips verticales, historias de 24 h, comentarios, seguidores,
notificaciones en tiempo real, búsqueda y perfiles. Cuentas y datos reales.

## 1. Crear el backend (≈10 minutos)

1. Creá una cuenta en https://supabase.com y un **New project** (guardá la contraseña de la base).
2. Abrí **SQL Editor → New query** y ejecutá, EN ESTE ORDEN, un archivo por vez:
   1. `supabase/schema.sql` (tablas, permisos, contadores, almacenamiento, tiempo real)
   2. `supabase/002_seguridad_y_chat.sql` (seguridad reforzada + chat + bloqueos)
   3. Esta línea, con el host de TU proyecto (lo ves en Project URL, sin `https://`):
      ```sql
      insert into public.app_settings (key, value) values ('storage_host', 'TU-PROYECTO.supabase.co')
      on conflict (key) do update set value = excluded.value;
      ```
      Sin este paso la app igual funciona, pero la validación de archivos es menos estricta.
3. **Authentication → Providers → Email**: dejalo activado.
   - Para probar rápido: desactivá *Confirm email*.
   - **Para producción: dejá *Confirm email* ACTIVADO** (evita cuentas falsas y que se pueda averiguar qué correos están registrados) y configurá un SMTP propio.
   - **Authentication → Policies/Passwords**: poné longitud mínima 8 o más y activá la protección contra contraseñas filtradas si tu plan la incluye.
   - **Authentication → Rate Limits**: revisá los límites de registro e inicio de sesión.
   - Si el panel te lo ofrece, activá **CAPTCHA** (hCaptcha o Cloudflare Turnstile) contra registros automáticos.
4. **Authentication → URL Configuration**: poné tu dominio en *Site URL* (y `http://localhost:3000` en Redirect URLs para desarrollo).
5. **Project Settings → API**: copiá *Project URL* y la clave *anon public*.

## 2. Correrla en tu computadora

```bash
cp .env.example .env     # pegá tu URL y anon key
npm install
npm run dev              # http://localhost:3000
```
Copiá además, sin cambios, tus `index.html`, `src/index.css` y `src/components/BottomNav.tsx`.
Podés borrar `src/data/mockData.ts`: ya no se usa.

## 3. Publicarla

```bash
npm run build
```
Subí el repo a Vercel, Netlify o Cloudflare Pages con:
- Build command: `npm run build`  ·  Output: `dist`
- **Variables de entorno**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

Luego agregá la URL final en Supabase → Authentication → URL Configuration.
NUNCA pongas la clave `service_role` en el frontend. La `anon` es pública por diseño;
lo que protege los datos son las políticas RLS del esquema.

## Seguridad (resumen; el informe completo está en el documento aparte)
- Los permisos viven en la base de datos (RLS): aunque alguien modifique el código del navegador, no puede leer ni cambiar datos ajenos.
- Cabeceras de seguridad y CSP: `public/_headers` (Netlify / Cloudflare Pages) y `vercel.json` (Vercel).
  Si usás un dominio propio para Supabase, agregalo a `connect-src`, `img-src` y `media-src`.
- Límites de velocidad, bloqueos, reportes y solicitudes de mensaje en la base de datos.
- Nunca subas el archivo `.env` a GitHub (agregalo a `.gitignore`). La clave `service_role` NO va en esta app.

## Qué incluye
- **Chat 1 a 1** con mensajes en tiempo real, solicitudes de mensaje, "visto", bloqueo y reporte (solo texto, sin cifrado de extremo a extremo)
- Registro / login / cierre de sesión, edición de perfil y avatar
- Publicaciones con varias fotos, clips de video (con miniatura automática), historias de 24 h
- Me gusta, guardados, comentarios (con me gusta), seguir / dejar de seguir
- Notificaciones en tiempo real, contador de no leídas
- Explorar: tendencias (#etiquetas), personas sugeridas, búsqueda
- Eliminar tus publicaciones, reportar las de otras personas
- Enlaces compartibles (`/?p=ID`)

## Límites actuales (v1)
- El chat no tiene cifrado de extremo a extremo ni imágenes adjuntas; no hay chats grupales.
- El feed muestra lo más reciente de toda la red (no solo de quienes seguís).
- Los reportes se guardan en la tabla `reports`; revisalos desde el panel de Supabase.
  Para abrirla al público necesitás términos, política de privacidad y un proceso de moderación.
- El contador de reproducciones se puede inflar manualmente (no hay antiabuso).
- Límite de 50 MB por archivo (plan gratuito de Supabase) y 1 GB de almacenamiento total.
- Los videos se reproducen tal como se suben (sin transcodificar): conviene MP4 (H.264).


## VANTA multiplataforma (web + Android + iOS)

El directorio `mobile/` contiene la aplicación móvil Expo/React Native que comparte el mismo proyecto Supabase y los mismos SQL que la web. Para prepararla, seguí `mobile/README.md`. La web existente sigue arrancando desde la raíz con `npm install` y `npm run dev`.

La app móvil ya incluye autenticación, feed, likes, búsqueda y seguimiento, carga de fotos/videos, clips, comentarios, actividad, perfil y chat básico. Algunas funciones todavía requieren completar pruebas, moderación y pulido antes de un lanzamiento público.

## Estado de verificación móvil

Se verificó la sintaxis TypeScript/TSX de los archivos móviles. La instalación de paquetes no terminó dentro del tiempo disponible en el entorno de trabajo, por lo que todavía falta ejecutar `npm install`, `npx expo install --fix` y probar la app en Expo Go/emuladores con credenciales Supabase reales.
