# Resultados Sprint 1 (ejecución real)

## Última ejecución — suite local (sin DB)

| Campo | Valor |
| --- | --- |
| Fecha | 2026-09-13 |
| Comando | `cd backend && npm run test:local` |
| Ambiente | Sin `TEST_DATABASE_URL` (unitario) |
| Resultado global | **18/18 passed** |

Cubre validación, reglas de seguridad y criterios de aceptación mapeados a CP-S1 (schemas + permisos). No sustituye la suite de integración con base de datos.

## Integración (API + DB)

| Campo | Valor |
| --- | --- |
| Comando | `npm run test:integration` |
| Resultado | No ejecutada — requiere `TEST_DATABASE_URL` |
