import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSION_MAP, ROLES } from "../../src/config/constants.js";
import { createAdminSchema, updateAdminSchema } from "../../src/validators/admin.validator.js";

describe("Sprint 1 — Admin / seguridad de roles (sin DB)", () => {
  it("CP-S1-015: USER no tiene permisos administrativos", () => {
    expect(ROLE_PERMISSION_MAP[ROLES.USER]).toEqual([]);
    expect(ROLE_PERMISSION_MAP[ROLES.USER]).not.toContain(PERMISSIONS.ADMINS_MANAGE);
    expect(ROLE_PERMISSION_MAP[ROLES.USER]).not.toContain(PERMISSIONS.CATEGORIES_MANAGE);
    expect(ROLE_PERMISSION_MAP[ROLES.USER]).not.toContain(PERMISSIONS.EXPERIENCES_MANAGE);
  });

  it("CP-S1-010/011: ADMIN puede ver panel y gestionar catálogo, no roles/admins", () => {
    const admin = ROLE_PERMISSION_MAP[ROLES.ADMIN];
    expect(admin).toContain(PERMISSIONS.DASHBOARD_VIEW);
    expect(admin).toContain(PERMISSIONS.CATEGORIES_MANAGE);
    expect(admin).toContain(PERMISSIONS.EXPERIENCES_MANAGE);
    expect(admin).not.toContain(PERMISSIONS.ADMINS_MANAGE);
    expect(admin).not.toContain(PERMISSIONS.ROLES_MANAGE);
  });

  it("CP-S1-012/015: SUPER_ADMIN concentra gestión de administradores", () => {
    const superPerms = ROLE_PERMISSION_MAP[ROLES.SUPER_ADMIN];
    expect(superPerms).toContain(PERMISSIONS.ADMINS_MANAGE);
    expect(superPerms).toContain(PERMISSIONS.ROLES_MANAGE);
    expect(superPerms).toEqual(expect.arrayContaining(Object.values(PERMISSIONS)));
  });

  it("CP-S1-012: crear admin exige datos válidos y rol ADMIN/SUPER_ADMIN", () => {
    const ok = createAdminSchema.safeParse({
      name: "Natalia Admin",
      email: "natalia@entrecaminos.test",
      password: "Admin#2026!",
      role: "ADMIN",
    });
    expect(ok.success).toBe(true);

    expect(
      createAdminSchema.safeParse({
        name: "X",
        email: "malo",
        password: "123",
        role: "USER",
      }).success,
    ).toBe(false);
  });

  it("CP-S1-013/014: actualizar admin solo acepta estados y roles administrativos", () => {
    expect(updateAdminSchema.safeParse({ status: "INACTIVE" }).success).toBe(true);
    expect(updateAdminSchema.safeParse({ status: "ACTIVE", role: "ADMIN" }).success).toBe(true);
    expect(updateAdminSchema.safeParse({ role: "USER" }).success).toBe(false);
    expect(updateAdminSchema.safeParse({ status: "DELETED" }).success).toBe(false);
  });
});
