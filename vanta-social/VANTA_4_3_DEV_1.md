# VANTA 4.3 DEV 1
Cambios: logo web y móvil, pausa de Clips web al abrir mensajes, recuperación web por OTP.
Supabase: Authentication > Email Templates > Reset password: incluir {{ .Token }} (código de seis dígitos si esa es la longitud configurada). No cambiar Confirm signup. Mantener SMTP existente. No requiere SQL.
Probar en entorno de prueba: recuperación con cuenta propia, código incorrecto/vencido, confirmación distinta, inicio con contraseña nueva, Clips con sonido al abrir/cerrar mensajes, navegación, pestaña oculta, logo y favicon. Recuperación móvil pendiente. No se ha validado compilación ni conexión real a Supabase.
