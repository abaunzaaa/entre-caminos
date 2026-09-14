# Pruebas Sprint 1 — Entre Caminos

Matriz oficial: [`Matriz_Pruebas_Sprint_1_Entre_Caminos.xlsx`](./Matriz_Pruebas_Sprint_1_Entre_Caminos.xlsx) (30 casos `CP-S1-001` … `CP-S1-030`).

## Alcance

| HU | Historia | Casos |
| --- | --- | --- |
| HU-02 | Crear cuenta | CP-S1-001 … 004 |
| HU-03 | Inicio, cierre y recuperación | CP-S1-005 … 009 |
| HU-21 | Panel y cuentas administrativas | CP-S1-010 … 015 |
| HU-20 | Gestión de categorías | CP-S1-016 … 020 |
| HU-19 | Gestión de experiencias | CP-S1-021 … 026 |
| HU-01 | Exploración pública | CP-S1-027 … 030 |

## Qué se automatiza y qué no

- **Automatizados (API / integración, Vitest + Supertest):** la mayoría de CP de HU-02, HU-03 (API), HU-19, HU-20 y HU-21. Cada `it(...)` referencia el ID `CP-S1-xxx` en el título.
- **Parciales / UI:** CP-S1-027 y CP-S1-028 incluyen pasos de UI (propuesta de valor, botones de registro/login). La API cubre catálogo público y rutas de auth; la verificación visual queda **manual** o E2E pendiente.
- **Manual recomendados:** flujos visuales del frontend (mensajes en pantalla, navegación del layout público) cuando no hay Playwright/RTL.

No se afirma 30/30 automatizados. El estado en la matriz Excel permanece “No ejecutada” hasta registrar resultado real y evidencia.

## Ambiente

- **Local (`npm run test:local`)**: sin DB. Valida reglas, schemas y criterios de aceptación.
- **Integración (`npm run test:integration`)**: requiere `TEST_DATABASE_URL` ≠ `DATABASE_URL` (ver `backend/.env.test.example`).

Datos dinámicos en integración: emails `*@entrecaminos.test`. No hay secretos de producción en el código de tests.

## Cómo ejecutar (sin configurar nada)

Desde la raíz del repo o desde `backend`:

```bash
cd backend
npm run test:local
```

Eso corre la suite **unitaria** (`tests/unit/`): validación, reglas de seguridad y criterios de aceptación mapeados a `CP-S1-xxx`. **No** necesita `TEST_DATABASE_URL`.

La suite de integración con base de datos (`npm run test:integration`) es opcional y sí requiere URI de prueba.

## Trazabilidad

Ver [`TRAZABILIDAD_CP_S1.md`](./TRAZABILIDAD_CP_S1.md).

## Resultados

Ver [`RESULTADOS_SPRINT_1.md`](./RESULTADOS_SPRINT_1.md) tras cada ejecución real. No inventar aprobados.

## Restricciones respetadas

- Sin `prisma migrate reset` destructivo sobre prod.
- Setup de tests: migrate deploy + seed mínimo solo sobre `TEST_DATABASE_URL`.
- Sin commits automáticos; el equipo hace `add` / `commit` / `push` a mano.
