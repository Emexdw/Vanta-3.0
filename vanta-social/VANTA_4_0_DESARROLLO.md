# VANTA 4.0 — Rama de desarrollo

Primera integración: personalización avanzada de perfiles (base VANTA 3.2) sobre la rama `vanta-4.0` derivada de VANTA 3.0.1.

## Incluido
- Enlace HTTPS en perfil.
- Diseños clásico, compacto y destacado.
- Fondos aurora, degradado y minimalista.
- Conserva cierre de sesión y cambios existentes en la rama.

## Despliegue seguro
1. Subir cambios SOLO a la rama `vanta-4.0` (no `main`).
2. Usar un proyecto Supabase de pruebas para ejecutar `supabase/005_personalizacion_avanzada.sql`; NO ejecutarlo aún en producción.
3. Probar build, inicio de sesión, perfil propio y ajeno, enlaces y cierre de sesión.
4. No fusionar a `main` hasta terminar pruebas y las restantes etapas de VANTA 4.0.

Este paquete corresponde a la PRIMERA ETAPA, no a una versión 4.0 completa.
