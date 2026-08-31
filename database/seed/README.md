# Semilla

La semilla ejecutable está en `backend/prisma/seed.ts`.

Crea (upsert, no borra el catálogo ya existente):

- Roles: SUPER_ADMIN, ADMIN, USER
- Permisos RBAC del Sprint 1
- SUPER_ADMIN: Angie Diaz, Natalia Florez y Juliana Casas
- Categorías Cultural, Deportivo, Recreativo, Turístico
- Experiencias de ejemplo (varias PUBLISHED para la landing)

La contraseña de las fundadoras se hashea con bcrypt y se toma de `SEED_ADMIN_PASSWORD` en `backend/.env` (no se versiona).
