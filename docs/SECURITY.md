# Seguridad

Implementado desde el Sprint 1.

- Contraseñas con bcrypt (nunca texto plano).
- JWT de acceso corto + refresh en cookie httpOnly.
- RBAC: `authMiddleware` + `roleMiddleware` + permisos.
- Validación de entrada con Zod.
- Helmet, CORS con credenciales, rate limit en auth.
- Errores sin filtrar stack al cliente en producción.
- Variables de entorno; secretos fuera del repositorio.
- Auditoría (`audit_logs`) en registro, login, CRUD admin y catálogo.
- Recuperación de contraseña con token hasheado y caducidad.

Roles de administración: `SUPER_ADMIN`, `ADMIN`.  
El usuario registrado recibe rol `USER` y no entra al panel.
