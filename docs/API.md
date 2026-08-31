# API Entre Caminos

Base: `http://localhost:4000/api`

Respuesta exitosa:

```json
{ "success": true, "data": {}, "message": "opcional" }
```

Error:

```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "...", "details": [] } }
```

Autenticación: header `Authorization: Bearer <accessToken>` o cookie `ec_access`.  
Refresh: cookie httpOnly `ec_refresh`.

## Salud

| Método | Ruta | Auth |
| --- | --- | --- |
| GET | `/health` | No |

## HU-02 / HU-03 Auth

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/register` | No | Crear cuenta USER |
| POST | `/auth/login` | No | JWT + cookies |
| POST | `/auth/logout` | No | Limpia cookies |
| POST | `/auth/refresh` | Cookie refresh | Nuevo access token |
| GET | `/auth/me` | Sí | Perfil y permisos |
| POST | `/auth/forgot-password` | No | Envío de enlace |
| POST | `/auth/reset-password` | No | Nueva contraseña |
| POST | `/auth/verify-email` | No | Verificar correo |

Registro:

```json
{ "name": "Camila Restrepo", "email": "camila@correo.com", "password": "Caminos#2026" }
```

## HU-21 Administración

Prefijo `/admin`. Requiere rol ADMIN o SUPER_ADMIN. Cada ruta exige permiso.

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/admin/dashboard` | `admin.dashboard.view` |
| GET/POST | `/admin/administrators` | `admins.manage` |
| PUT | `/admin/administrators/:id` | `admins.manage` |
| GET/POST | `/admin/roles` | `roles.manage` |
| PUT | `/admin/roles/:id/permissions` | `roles.manage` |
| GET/POST | `/admin/permissions` | `permissions.manage` |

## HU-20 Categorías

| Método | Ruta | Auth |
| --- | --- | --- |
| GET | `/categories` | Público (solo ACTIVE) |
| GET | `/categories/:id` | Público |
| GET/POST | `/admin/categories` | `categories.manage` |
| PUT/DELETE | `/admin/categories/:id` | `categories.manage` |

DELETE responde **409** si la categoría tiene experiencias.

## HU-19 Experiencias

Estados: `DRAFT` | `PENDING` | `PUBLISHED` | `ARCHIVED`.

| Método | Ruta | Auth |
| --- | --- | --- |
| GET | `/experiences` | Público (PUBLISHED) |
| GET | `/experiences/featured` | Público |
| GET | `/experiences/:id` | Público (PUBLISHED) |
| GET/POST | `/admin/experiences` | `experiences.manage` |
| GET/PUT/DELETE | `/admin/experiences/:id` | `experiences.manage` |
| PATCH | `/admin/experiences/:id/status` | `experiences.manage` |
| POST | `/uploads` | `experiences.manage` (multipart `image`) |

Publicar exige imagen y ubicación.
