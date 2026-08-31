# Arquitectura — Entre Caminos

Cliente-servidor por capas. El frontend no accede a Prisma ni a PostgreSQL. El backend no pinta UI.

```
React (páginas → hooks → services/axios)
        HTTPS / JSON + cookies httpOnly
Express (routes → middleware → controllers → services → Prisma)
        SQL
PostgreSQL en Supabase (entre-caminos-db)
```

## Frontend

`src/pages` orquesta pantallas.  
`src/services` habla con la API.  
`src/hooks` conserva sesión.  
`src/layouts` separa público, autenticación y administración.

## Backend

`routes` declaran URLs y middlewares.  
`controllers` traducen HTTP.  
`services` concentran reglas de negocio.  
`validators` (Zod) validan entrada.  
`middleware` cubre JWT, RBAC, CORS, rate limit y errores.

## Autorización (RBAC)

| Rol | Alcance |
| --- | --- |
| USER | Registro, login, explorar catálogo público |
| ADMIN | Dashboard, categorías, experiencias |
| SUPER_ADMIN | Todo lo anterior + administradores, roles y permisos |

## Integraciones preparadas

| Servicio | Uso |
| --- | --- |
| Mapbox | Coordenadas en experiencias; token en entorno |
| OpenAI | `openai.service.ts` para recomendaciones futuras |
| SendGrid | Verificación y recuperación de contraseña |
| Cloudinary / S3 | Imágenes; fallback local en `backend/uploads` |
