import { describe, expect, it } from "vitest";
import { COOKIE_NAMES, PASSWORD_RESET_GENERIC_MESSAGE, ROLE_PERMISSION_MAP, ROLES } from "../../src/config/constants.js";

describe("Sprint 1 — Seguridad / integridad de reglas (sin DB)", () => {
  it("CP-S1-007/008: cookies de sesión usan nombres httpOnly dedicados", () => {
    expect(COOKIE_NAMES.ACCESS).toBe("ec_access");
    expect(COOKIE_NAMES.REFRESH).toBe("ec_refresh");
  });

  it("CP-S1-009: mensaje de recuperación es genérico (no filtra existencia de cuenta)", () => {
    expect(PASSWORD_RESET_GENERIC_MESSAGE.toLowerCase()).toMatch(/correo|instrucciones/);
    expect(PASSWORD_RESET_GENERIC_MESSAGE.toLowerCase()).not.toMatch(/no existe|no registrado/);
  });

  it("CP-S1-029/030: rol USER queda separado del entorno administrativo", () => {
    expect(ROLES.USER).toBe("USER");
    expect(ROLE_PERMISSION_MAP[ROLES.USER].length).toBe(0);
    expect(ROLE_PERMISSION_MAP[ROLES.ADMIN].length).toBeGreaterThan(0);
    expect(ROLE_PERMISSION_MAP[ROLES.SUPER_ADMIN].length).toBeGreaterThan(
      ROLE_PERMISSION_MAP[ROLES.ADMIN].length,
    );
  });
});
