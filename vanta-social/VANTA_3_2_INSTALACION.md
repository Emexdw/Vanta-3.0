# VANTA 3.2 — Instalación

1. En Supabase SQL Editor, ejecutar `supabase/005_personalizacion_avanzada.sql` (una vez). No ejecutar de nuevo las migraciones anteriores.
2. Actualizar el proyecto `vanta-social` en GitHub conservando `Root Directory = vanta-social` en Vercel.
3. Comprobar que el despliegue termine en Ready.
4. Entrar a Editar perfil: elegir diseño, fondo de portada y enlace HTTPS; guardar y abrir el perfil desde otra cuenta.

Funciones nuevas: enlace HTTPS, tres diseños de perfil (clásico, compacto, destacado), tres fondos sin imagen (aurora, degradado, minimalista). Conserva imagen de portada, color y cierre de sesión.

Seguridad: no se desactiva RLS. Los enlaces solo aceptan HTTPS y se abren con noopener/noreferrer/nofollow/ugc.
