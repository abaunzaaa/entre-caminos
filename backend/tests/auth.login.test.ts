import { describe, expect, it } from "vitest";
import { api, adminCredentials } from "./helpers.js";

describe("HU-03 Login", () => {
  it("inicia sesión con credenciales correctas y entrega JWT", async () => {
    const response = await api().post("/api/auth/login").send(adminCredentials);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(adminCredentials.email);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.headers["set-cookie"]).toBeTruthy();
  });

  it("rechaza credenciales incorrectas", async () => {
    const response = await api().post("/api/auth/login").send({
      email: adminCredentials.email,
      password: "ClaveIncorrecta#1",
    });

    expect(response.status).toBe(401);
  });
});
