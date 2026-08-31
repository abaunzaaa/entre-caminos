# Mapeo de historias — archivos

## HU-02 Registro

Responsable de entrega: **Natalia**

Creados:

- `backend/src/validators/auth.validator.ts`
- `backend/src/services/auth.service.ts` (register)
- `backend/src/controllers/auth.controller.ts`
- `backend/src/routes/auth.routes.ts`
- `frontend/src/pages/RegisterPage.tsx`
- `backend/tests/auth.register.test.ts`

Commit: `feat(HU-02): implementar registro seguro usuarios`

## HU-03 Autenticación

Responsable de entrega: **Juliana**

Creados:

- `backend/src/utils/jwt.ts`
- `backend/src/utils/password.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/services/token.service.ts`
- `backend/src/services/email.service.ts`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/ForgotPasswordPage.tsx`
- `frontend/src/pages/ResetPasswordPage.tsx`
- `frontend/src/hooks/useAuth.tsx`
- `backend/tests/auth.login.test.ts`

Commit: `feat(HU-03): implementar autenticación JWT`

## HU-21 Administración

Responsable de entrega: **Angie**

Creados:

- `backend/src/config/constants.ts`
- `backend/src/middleware/role.middleware.ts`
- `backend/src/services/admin.service.ts`
- `backend/src/services/role.service.ts`
- `backend/src/routes/admin.routes.ts`
- `frontend/src/layouts/AdminLayout.tsx`
- `frontend/src/pages/admin/DashboardPage.tsx`
- `frontend/src/pages/admin/AdministratorsPage.tsx`
- `frontend/src/pages/admin/RolesPage.tsx`
- `backend/tests/admin.test.ts`

Commit: `feat(HU-21): implementar panel administrativo y roles`

## HU-20 Categorías

Responsable de entrega: **Juliana**

Creados:

- `backend/src/validators/category.validator.ts`
- `backend/src/services/category.service.ts`
- `backend/src/routes/category.routes.ts`
- `frontend/src/pages/admin/CategoriesPage.tsx`
- `backend/tests/categories.test.ts`

Commit: `feat(HU-20): implementar gestión categorías`

## HU-19 Experiencias

Responsable de entrega: **Natalia**

Creados:

- `backend/src/validators/experience.validator.ts`
- `backend/src/services/experience.service.ts`
- `backend/src/services/upload.service.ts`
- `backend/src/routes/experience.routes.ts`
- `frontend/src/pages/admin/ExperiencesPage.tsx`
- `backend/tests/experiences.test.ts`

Commit: `feat(HU-19): implementar gestión experiencias`

## HU-01 Landing

Responsable de entrega: **Angie**

Creados:

- `frontend/src/pages/LandingPage.tsx`
- `frontend/src/components/brand/Logo.tsx`
- `frontend/src/components/experiences/ExperienceCard.tsx`
- `frontend/src/layouts/PublicLayout.tsx`

Commit: `feat(HU-01): implementar landing pública`

## Transversal (commit 0 en `main`)

Responsable de entrega: **Angie** (dueña del repo)

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `docs/database.md`
- `docs/*`
- `README.md`
