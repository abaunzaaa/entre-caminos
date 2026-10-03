/**
 * ANTIGUO setup de integración con resetDatabase().
 * Deshabilitado: borraba usuarios/experiencias de la base compartida
 * porque dotenv override en src/config/env.ts restauraba DATABASE_URL.
 *
 * No volver a habilitar sin:
 * 1) BD de prueba 100% aislada
 * 2) comparación de host/project ref contra DATABASE_URL compartida
 * 3) comando explícito distinto de `npm test`
 */
throw new Error(
  "tests/setup.ts está deshabilitado. No ejecuta resetDatabase sobre ninguna base. Usa: npm run test:unit",
);
