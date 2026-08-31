# Subir Sprint 1 a GitHub

Repo: [https://github.com/abaunzaaa/entre-caminos.git](https://github.com/abaunzaaa/entre-caminos.git)

Se hace **en esta PC**, en este orden, desde `C:\Users\julia\entre-caminos`.  
Cada HU va en **su rama** y la dueña la sube con **su usuario de GitHub** (o `--author` con el correo de esa cuenta).

**No se suben** `.env`, `backend/.env`, `frontend/.env`, `node_modules` ni contraseñas.

Dueñas:

| Orden | Rama | Commit | Quién |
| --- | --- | --- | --- |
| 0 | `main` | `chore: cimientos del repositorio` | Angie (dueña del repo) |
| 1 | `feature/HU-02-registro` | `feat(HU-02): implementar registro seguro usuarios` | Natalia |
| 2 | `feature/HU-03-autenticacion` | `feat(HU-03): implementar autenticación JWT` | Juliana |
| 3 | `feature/HU-21-administracion` | `feat(HU-21): implementar panel administrativo y roles` | Angie |
| 4 | `feature/HU-20-categorias` | `feat(HU-20): implementar gestión categorías` | Juliana |
| 5 | `feature/HU-19-experiencias` | `feat(HU-19): implementar gestión experiencias` | Natalia |
| 6 | `feature/HU-01-landing` | `feat(HU-01): implementar landing pública` | Angie |

---

## Antes de todo

1. En GitHub, Angie invita a Natalia y Juliana: **Settings → Collaborators**.
2. Instalen [Git](https://git-scm.com) y, si pueden, [GitHub CLI](https://cli.github.com).
3. Cada una, en **su** sesión, configura nombre y correo de GitHub (esto lo hace cada persona en su usuario de Windows, no lo automatizamos):

```powershell
git config --global user.name "Nombre Apellido"
git config --global user.email "el-correo-de-su-cuenta-github@..."
```

4. Abrir PowerShell:

```powershell
cd C:\Users\julia\entre-caminos
git check-ignore -v backend/.env
git check-ignore -v .env
```

Tiene que salir una línea de `.gitignore`. Si no sale nada, **no sigan**: el `.env` se subiría.

---

## 0. Angie — `main` (README, ignore, env.example)

```powershell
cd C:\Users\julia\entre-caminos

git checkout -B main

git remote remove origin 2>$null
git remote add origin https://github.com/abaunzaaa/entre-caminos.git

git add .gitignore
git add .env.example backend/.env.example frontend/.env.example
git add README.md package.json package-lock.json
git add docs/GITHUB.md docs/ENV.md docs/ARCHITECTURE.md docs/database.md docs/HU-MAPPING.md docs/TESTING.md docs/SECURITY.md docs/API.md
git add database/README.md database/seed/README.md database/migrations/README.md
git add backend/uploads/.gitkeep

git status
# Revisar: NO debe aparecer .env ni backend/.env ni frontend/.env

git commit -m "chore: cimientos del repositorio"
git push -u origin main
```

Si GitHub creó el repo **con README**, en vez del push:

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 1. Natalia — HU-02 registro

```powershell
cd C:\Users\julia\entre-caminos
git checkout main
git pull origin main
git checkout -b feature/HU-02-registro

git add backend/package.json backend/package-lock.json backend/tsconfig.json backend/tsconfig.build.json backend/vitest.config.ts
git add backend/prisma
git add backend/src/index.ts backend/src/app.ts
git add backend/src/config/env.ts backend/src/config/constants.ts
git add backend/src/database/prisma.ts
git add backend/src/models/auth-user.ts backend/src/models/entities.ts
git add backend/src/utils/api-error.ts backend/src/utils/async-handler.ts backend/src/utils/logger.ts backend/src/utils/password.ts backend/src/utils/serializers.ts
git add backend/src/middleware/error.middleware.ts backend/src/middleware/validate.middleware.ts backend/src/middleware/rate-limit.middleware.ts
git add backend/src/validators/auth.validator.ts
git add backend/src/services/auth.service.ts backend/src/services/email.service.ts
git add backend/src/controllers/auth.controller.ts backend/src/controllers/health.controller.ts
git add backend/src/routes/auth.routes.ts backend/src/routes/index.ts
git add backend/tests/auth.register.test.ts backend/tests/helpers.ts backend/tests/setup.ts backend/tests/teardown.ts backend/tests/env.ts
git add backend/scripts/verify-db.ts backend/scripts/check-founders.ts

git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/vite.config.ts frontend/tailwind.config.js frontend/postcss.config.js frontend/index.html
git add frontend/src/main.tsx frontend/src/App.tsx frontend/src/index.css frontend/src/vite-env.d.ts frontend/src/types/index.ts
git add frontend/src/pages/RegisterPage.tsx frontend/src/pages/VerifyEmailPage.tsx
git add frontend/src/pages/onboarding
git add frontend/src/utils/register-validation.ts frontend/src/utils/onboarding.ts frontend/src/utils/api-error.ts frontend/src/utils/cn.ts frontend/src/utils/constants.ts
git add frontend/src/components/auth
git add frontend/src/assets
git add frontend/src/components/ui
git add frontend/src/components/brand
git add frontend/src/layouts/AuthLayout.tsx
git add frontend/src/services/api.ts frontend/src/services/auth.service.ts
git add frontend/src/hooks/useAuth.tsx
git add frontend/src/routes/AppRoutes.tsx frontend/src/routes/index.tsx frontend/src/routes/ProtectedRoute.tsx

git status
git commit -m "feat(HU-02): implementar registro seguro usuarios"
git push -u origin feature/HU-02-registro
```

En GitHub: **Pull request** → `feature/HU-02-registro` → `main` → Merge.  
Luego en la PC:

```powershell
git checkout main
git pull origin main
```

---

## 2. Juliana — HU-03 sesión

```powershell
cd C:\Users\julia\entre-caminos
git checkout main
git pull origin main
git checkout -b feature/HU-03-autenticacion

git add backend/src/utils/jwt.ts
git add backend/src/services/token.service.ts
git add backend/src/middleware/auth.middleware.ts
git add backend/src/config/cors.ts
git add backend/src/services/auth.service.ts backend/src/controllers/auth.controller.ts backend/src/routes/auth.routes.ts
git add backend/tests/auth.login.test.ts
git add frontend/src/pages/LoginPage.tsx frontend/src/pages/ForgotPasswordPage.tsx frontend/src/pages/ResetPasswordPage.tsx
git add frontend/src/hooks/useAuth.tsx frontend/src/services/auth.service.ts frontend/src/routes/ProtectedRoute.tsx

git status
git commit -m "feat(HU-03): implementar autenticación JWT"
git push -u origin feature/HU-03-autenticacion
```

PR → merge → `git checkout main; git pull origin main`

---

## 3. Angie — HU-21 panel

```powershell
cd C:\Users\julia\entre-caminos
git checkout main
git pull origin main
git checkout -b feature/HU-21-administracion

git add backend/src/middleware/role.middleware.ts
git add backend/src/services/admin.service.ts backend/src/services/role.service.ts backend/src/services/audit.service.ts
git add backend/src/controllers/admin.controller.ts backend/src/controllers/role.controller.ts
git add backend/src/validators/admin.validator.ts
git add backend/src/routes/admin.routes.ts
git add backend/prisma/seed.ts
git add backend/tests/admin.test.ts
git add frontend/src/layouts/AdminLayout.tsx
git add frontend/src/pages/admin/DashboardPage.tsx frontend/src/pages/admin/AdministratorsPage.tsx frontend/src/pages/admin/RolesPage.tsx frontend/src/pages/admin/PermissionsPage.tsx
git add frontend/src/components/admin/Panel.tsx
git add frontend/src/services/catalog.service.ts
git add frontend/src/routes/ProtectedRoute.tsx frontend/src/routes/AppRoutes.tsx

git status
git commit -m "feat(HU-21): implementar panel administrativo y roles"
git push -u origin feature/HU-21-administracion
```

PR → merge → `git checkout main; git pull origin main`

---

## 4. Juliana — HU-20 categorías (en el enunciado aparecía como HU-10)

```powershell
cd C:\Users\julia\entre-caminos
git checkout main
git pull origin main
git checkout -b feature/HU-20-categorias

git add backend/src/validators/category.validator.ts
git add backend/src/services/category.service.ts
git add backend/src/controllers/category.controller.ts
git add backend/src/routes/category.routes.ts backend/src/routes/admin.routes.ts
git add backend/prisma/seed.ts
git add backend/tests/categories.test.ts
git add frontend/src/pages/admin/CategoriesPage.tsx
git add frontend/src/services/catalog.service.ts

git status
git commit -m "feat(HU-20): implementar gestión categorías"
git push -u origin feature/HU-20-categorias
```

PR → merge → `git checkout main; git pull origin main`

---

## 5. Natalia — HU-19 publicaciones

```powershell
cd C:\Users\julia\entre-caminos
git checkout main
git pull origin main
git checkout -b feature/HU-19-experiencias

git add backend/src/validators/experience.validator.ts
git add backend/src/services/experience.service.ts backend/src/services/upload.service.ts
git add backend/src/controllers/experience.controller.ts backend/src/controllers/upload.controller.ts
git add backend/src/routes/experience.routes.ts backend/src/routes/upload.routes.ts backend/src/routes/index.ts
git add backend/prisma/seed.ts
git add backend/tests/experiences.test.ts
git add frontend/src/pages/admin/ExperiencesPage.tsx frontend/src/pages/admin/ExperienceFormPage.tsx
git add frontend/src/services/catalog.service.ts frontend/src/utils/media.ts

git status
git commit -m "feat(HU-19): implementar gestión experiencias"
git push -u origin feature/HU-19-experiencias
```

PR → merge → `git checkout main; git pull origin main`

---

## 6. Angie — HU-01 explorar (landing pública)

```powershell
cd C:\Users\julia\entre-caminos
git checkout main
git pull origin main
git checkout -b feature/HU-01-landing

git add frontend/src/pages/LandingPage.tsx frontend/src/pages/ExplorePage.tsx frontend/src/pages/ExperienceDetailPage.tsx
git add frontend/src/layouts/PublicLayout.tsx
git add frontend/src/components/experiences
git add frontend/src/routes/AppRoutes.tsx
git add backend/src/services/openai.service.ts

git status
git commit -m "feat(HU-01): implementar landing pública"
git push -u origin feature/HU-01-landing
```

PR → merge → `git checkout main; git pull origin main`

---

## 7. Cierre — lo que haya quedado

Después del paso 6, en `main`:

```powershell
git checkout main
git pull origin main
git status
```

Si aún hay archivos **sin** `.env`:

```powershell
git add -A
git status
# Otra vez: que NO aparezca .env
git commit -m "chore: archivos restantes del sprint 1"
git push origin main
```

---

## Si `git add` se queja de un archivo que no existe

Saltar esa línea y seguir. Algunos nombres (`tsconfig.node.json`, `src/assets`) pueden no estar. Al final el paso 7 los recoge.

---

## Checklist de PR (cada HU)

1. Backend y frontend de esa HU (si aplica).
2. Validación Zod y errores.
3. Prueba en `backend/tests` (excepto HU-01, que es QA manual de la landing).
4. **Cero secretos.**
5. El título del PR es el mensaje de commit de la tabla.

## Equipo

| Persona | Rol | HUs que sube |
| --- | --- | --- |
| Natalia Flórez | Frontend / integración | HU-02, HU-19 |
| Juliana Casas | QA / autenticación / categorías | HU-03, HU-20 |
| Angie Díaz | Backend / panel / landing | cimientos, HU-21, HU-01 |
