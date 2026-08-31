import { describe, expect, it } from "vitest";
import { api, loginAsAdmin, registerUser } from "./helpers.js";

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

    const list = await api()
      .get("/api/admin/administrators")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.admins.length).toBeGreaterThan(0);
  });
});
