import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, adminCredentials } from "./helpers.js";

describe("Auth refresh", () => {
  it("renueva el access token con la cookie de refresh", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send(adminCredentials);
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTruthy();

    const refresh = await agent.post("/api/auth/refresh");
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.accessToken).toBeTruthy();
    expect(refresh.body.data.user.email).toBe(adminCredentials.email);

    const me = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${refresh.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(adminCredentials.email);
  });

  it("responde 401 si no hay refresh token", async () => {
    const response = await request(app).post("/api/auth/refresh");
    expect(response.status).toBe(401);
  });
});
