import { describe, expect, it } from "vitest";
import { ROLES } from "../src/config/constants.js";
import { api, loginAsAdmin, prisma, registerUser } from "./helpers.js";

async function countActiveAdministratorsInDb() {
  return prisma.user.count({
    where: {
      status: "ACTIVE",
      role: { name: { in: [ROLES.SUPER_ADMIN, ROLES.ADMIN] } },
    },
  });
}

describe("HU-21 Administración", () => {
  it("bloquea a un usuario sin permisos", async () => {
    const { payload } = await registerUser();
    const login = await api().post("/api/auth/login").send({
      email: payload.email,
      password: payload.password,
    });

    const token = login.body.data.accessToken as string;
    const response = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("permite al SUPER_ADMIN gestionar administradores", async () => {
    const adminLogin = await loginAsAdmin();
    const token = adminLogin.body.data.accessToken as string;

    const dashboard = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.admins).toBe(await countActiveAdministratorsInDb());
    expect(Array.isArray(dashboard.body.data.administrators)).toBe(true);
    expect(dashboard.body.data.administrators.length).toBeLessThanOrEqual(3);

    const created = await api()
      .post("/api/admin/administrators")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Natalia Admin",
        email: `natalia.${Date.now()}@entrecaminos.com`,
        password: "Admin#2026!",
        role: "ADMIN",
      });

    expect(created.status).toBe(201);
    expect(created.body.data.admin.role).toBe("ADMIN");

    const afterCreate = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(afterCreate.status).toBe(200);
    expect(afterCreate.body.data.admins).toBe(dashboard.body.data.admins + 1);
    expect(afterCreate.body.data.admins).toBe(await countActiveAdministratorsInDb());

    const { payload } = await registerUser();
    expect(payload.email).toContain("@entrecaminos.test");
    const afterResident = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(afterResident.status).toBe(200);
    expect(afterResident.body.data.admins).toBe(afterCreate.body.data.admins);

    const deactivated = await api()
      .put(`/api/admin/administrators/${created.body.data.admin.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "INACTIVE" });
    expect(deactivated.status).toBe(200);

    const afterDeactivate = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(afterDeactivate.status).toBe(200);
    expect(afterDeactivate.body.data.admins).toBe(dashboard.body.data.admins);
    expect(afterDeactivate.body.data.admins).toBe(await countActiveAdministratorsInDb());

    const list = await api()
      .get("/api/admin/administrators")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.admins.length).toBeGreaterThan(0);
    const activeListed = list.body.data.admins.filter(
      (admin: { status: string; role: string }) =>
        admin.status === "ACTIVE" && (admin.role === "SUPER_ADMIN" || admin.role === "ADMIN"),
    );
    const uniqueActiveIds = new Set(activeListed.map((admin: { id: string }) => admin.id));
    expect(uniqueActiveIds.size).toBe(afterDeactivate.body.data.admins);
    expect(list.body.data.admins.every((admin: { role: string }) => admin.role === "SUPER_ADMIN" || admin.role === "ADMIN")).toBe(
      true,
    );

    const recent = await api()
      .get("/api/admin/administrators")
      .query({ limit: 3 })
      .set("Authorization", `Bearer ${token}`);
    expect(recent.status).toBe(200);
    expect(recent.body.data.admins.length).toBeLessThanOrEqual(3);
  });
});
