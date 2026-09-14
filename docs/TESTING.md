# Pruebas

Vitest + Supertest contra un **PostgreSQL de prueba**, no contra la base compartida ni producción.

Guía Sprint 1 (matriz CP-S1-001…030, trazabilidad y resultados):

- [`documentacion/pruebas/README_PRUEBAS_SPRINT_1.md`](../documentacion/pruebas/README_PRUEBAS_SPRINT_1.md)
- [`documentacion/pruebas/TRAZABILIDAD_CP_S1.md`](../documentacion/pruebas/TRAZABILIDAD_CP_S1.md)

En `backend/.env` (ver `backend/.env.test.example`):

```
TEST_DATABASE_URL=
TEST_DIRECT_URL=
```

Deben ser URIs distintas de `DATABASE_URL`. Si coinciden, los tests abortan.

```bash
cd backend
npx prisma generate
npm test
# o: npm run test:integration
```

El setup aplica `migrate deploy` y un seed mínimo **solo** sobre `TEST_DATABASE_URL`.

## Cobertura Sprint 1 (API)

| HU | Casos matriz | Automatización |
| --- | --- | --- |
| HU-02 | CP-S1-001…004 | API |
| HU-03 | CP-S1-005…009 | API (logout, refresh, reset) |
| HU-21 | CP-S1-010…015 | API |
| HU-20 | CP-S1-016…020 | API |
| HU-19 | CP-S1-021…026 | API |
| HU-01 | CP-S1-027…030 | API parcial; UI manual |

No afirmar 30/30 E2E: CP-S1-027/028 tienen parte visual pendiente.

Responsable sugerida: **Juliana**.
