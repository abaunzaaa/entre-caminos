# Semilla

La semilla ejecutable está en `backend/prisma/seed.ts`.

Crea (upsert, no borra datos ya existentes):

- Roles: SUPER_ADMIN, ADMIN, USER
- Permisos RBAC del Sprint 1
- SUPER_ADMIN: Angie Diaz, Natalia Florez y Juliana Casas

El catálogo (categorías y experiencias) se crea desde el panel administrativo, no desde la semilla.

La contraseña de las fundadoras se hashea con bcrypt y se toma de `SEED_ADMIN_PASSWORD` en `backend/.env` (no se versiona).
