# Pruebas

Vitest + Supertest contra un **PostgreSQL de prueba en Supabase**, no contra la base compartida `entre-caminos-db` y no contra Docker.

En `backend/.env`:

```
TEST_DATABASE_URL=
TEST_DIRECT_URL=
```

Deben ser URIs de **otro** proyecto (o otra base). Si coinciden con `DATABASE_URL`, los tests se abortan para no borrar datos del equipo.

```bash
cd backend
npx prisma generate
npm test
```

El setup aplica `migrate deploy` y un seed mínimo (sin catálogo) **solo** sobre `TEST_DATABASE_URL`.

## Cobertura Sprint 1

| Área | Casos |
| --- | --- |
| Registro | Usuario válido, correo repetido, contraseña inválida |
| Login | Credenciales correctas e incorrectas, reset de contraseña |
| Administración | Usuario sin permisos, SUPER_ADMIN autorizado |
| Categorías | Crear, editar, no eliminar con relaciones |
| Experiencias | Validaciones y transiciones de estado |

Responsable sugerida: **Juliana**.
