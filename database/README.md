# Database

Espejo documental de Prisma. La fuente de verdad operativa es `backend/prisma`.

PostgreSQL oficial: **Supabase** (`entre-caminos-db`). No hay instancia local ni Docker.

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run db:verify
```

Ver [docs/database.md](../docs/database.md).
