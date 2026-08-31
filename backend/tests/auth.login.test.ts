import { describe, expect, it } from "vitest";
import { api, adminCredentials, uniqueEmail } from "./helpers.js";

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

  it("permite recuperar y restablecer la contraseña", async () => {
    const email = uniqueEmail("reset");
    await api().post("/api/auth/register").send({
      name: "Usuario Recuperación",
      email,
      password: "Caminos#2026",
      confirmPassword: "Caminos#2026",
      termsAccepted: true,
    });

    const forgot = await api().post("/api/auth/forgot-password").send({ email });
    expect(forgot.status).toBe(200);
    expect(forgot.body.data.devToken).toBeTruthy();

    const reset = await api().post("/api/auth/reset-password").send({
      token: forgot.body.data.devToken,
      password: "NuevaClave#2026",
    });
    expect(reset.status).toBe(200);

    const oldLogin = await api().post("/api/auth/login").send({
      email,
      password: "Caminos#2026",
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await api().post("/api/auth/login").send({
      email,
      password: "NuevaClave#2026",
    });
    expect(newLogin.status).toBe(200);
  });
});
