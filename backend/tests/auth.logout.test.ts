import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, adminCredentials } from "./helpers.js";

describe("HU-03 Cierre de sesión (CP-S1-007)", () => {
  it("CP-S1-007: cierra sesión, limpia cookies y restringe acceso autenticado por cookie", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send(adminCredentials);
    expect(login.status).toBe(200);

    const meBefore = await agent.get("/api/auth/me");
    expect(meBefore.status).toBe(200);
    expect(meBefore.body.data.user.email).toBe(adminCredentials.email);

    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(200);
    expect(logout.body.message).toMatch(/cerrada/i);

    const meAfter = await agent.get("/api/auth/me");
    expect(meAfter.status).toBe(401);

    const refresh = await agent.post("/api/auth/refresh");
    expect(refresh.status).toBe(401);

    const dashboard = await agent.get("/api/admin/dashboard");
    expect(dashboard.status).toBe(401);
  });
});
