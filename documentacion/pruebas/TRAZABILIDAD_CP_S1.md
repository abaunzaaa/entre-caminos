# Trazabilidad CP-S1 → tests

| ID | HU | Título (matriz) | Automatización | Archivo / evidencia |
| --- | --- | --- | --- | --- |
| CP-S1-001 | HU-02 | Registro exitoso de cuenta | API | `backend/tests/auth.register.test.ts` |
| CP-S1-002 | HU-02 | Validación de campos obligatorios | API | `backend/tests/auth.register.test.ts` |
| CP-S1-003 | HU-02 | Correo ya registrado | API | `backend/tests/auth.register.test.ts` |
| CP-S1-004 | HU-02 | Validación de contraseña | API | `backend/tests/auth.register.test.ts` |
| CP-S1-005 | HU-03 | Inicio de sesión exitoso | API | `backend/tests/auth.login.test.ts` |
| CP-S1-006 | HU-03 | Credenciales incorrectas | API | `backend/tests/auth.login.test.ts` |
| CP-S1-007 | HU-03 | Cierre de sesión | API | `backend/tests/auth.logout.test.ts` |
| CP-S1-008 | HU-03 | Mantenimiento de sesión | API | `backend/tests/auth.refresh.test.ts` |
| CP-S1-009 | HU-03 | Recuperación de contraseña | API | `backend/tests/auth.password-reset.test.ts` |
| CP-S1-010 | HU-21 | Inicio de sesión administrativo | API | `backend/tests/admin.test.ts` |
| CP-S1-011 | HU-21 | Acceso al panel administrativo | API | `backend/tests/admin.test.ts` |
| CP-S1-012 | HU-21 | Crear cuenta administrativa | API | `backend/tests/admin.test.ts` |
| CP-S1-013 | HU-21 | Consultar y actualizar administradores | API | `backend/tests/admin.test.ts` |
| CP-S1-014 | HU-21 | Desactivar o eliminar acceso administrativo | API | `backend/tests/admin.test.ts` |
| CP-S1-015 | HU-21 | Control de permisos | API | `backend/tests/admin.test.ts` |
| CP-S1-016 | HU-20 | Crear categoría | API | `backend/tests/categories.test.ts` |
| CP-S1-017 | HU-20 | Consultar categorías | API | `backend/tests/categories.test.ts` |
| CP-S1-018 | HU-20 | Actualizar categoría | API | `backend/tests/categories.test.ts` |
| CP-S1-019 | HU-20 | Eliminar categoría sin asociaciones | API | `backend/tests/categories.test.ts` |
| CP-S1-020 | HU-20 | Categoría asociada a experiencias | API | `backend/tests/categories.test.ts` |
| CP-S1-021 | HU-19 | Crear publicación de experiencia | API | `backend/tests/experiences.test.ts` |
| CP-S1-022 | HU-19 | Consultar publicaciones | API | `backend/tests/experiences.test.ts` |
| CP-S1-023 | HU-19 | Actualizar publicación | API | `backend/tests/experiences.test.ts` |
| CP-S1-024 | HU-19 | Cambiar estado de publicación | API | `backend/tests/experiences.test.ts` |
| CP-S1-025 | HU-19 | Eliminar publicación | API | `backend/tests/experiences.test.ts` |
| CP-S1-026 | HU-19 | Validación de datos de experiencia | API | `backend/tests/experiences.test.ts` |
| CP-S1-027 | HU-01 | Exploración pública de la plataforma | API parcial + manual UI | `backend/tests/public.exploration.test.ts` |
| CP-S1-028 | HU-01 | Acceso a registro e inicio de sesión | API parcial + manual UI | `backend/tests/public.exploration.test.ts` |
| CP-S1-029 | HU-01 | Restricción de funcionalidades personalizadas | API | `backend/tests/public.exploration.test.ts` |
| CP-S1-030 | HU-01 | Separación del entorno administrativo | API | `backend/tests/public.exploration.test.ts` |

Convención: el título del `it` incluye el ID, por ejemplo `CP-S1-001: …`.
