import { describe, expect, it } from "vitest";
import { api, prisma, uniqueEmail } from "./helpers.js";

const validPassword = "Caminos#2026";

function registerPayload(overrides?: Record<string, unknown>) {
  return {
    name: "Andrés Camino",
    email: uniqueEmail("registro"),
    password: validPassword,
    confirmPassword: validPassword,
    termsAccepted: true,
    ...overrides,
  };
}

describe("HU-02 Registro", () => {
  it("crea un usuario USER y nunca guarda la contraseña en texto plano", async () => {
    const payload = registerPayload();
    const response = await api().post("/api/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(payload.email);
    expect(response.body.data.user.role).toBe("USER");
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(validPassword);

    const stored = await prisma.user.findUnique({ where: { email: payload.email } });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe(validPassword);
    expect(stored?.passwordHash.startsWith("$2")).toBe(true);
  });

  it("rechaza un correo repetido", async () => {
    const email = uniqueEmail("duplicado");
    await api().post("/api/auth/register").send(registerPayload({ email }));

    const response = await api().post("/api/auth/register").send(registerPayload({ email }));

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/correo electrónico/i);
  });

  it("rechaza un correo inválido", async () => {
    const response = await api().post("/api/auth/register").send(
      registerPayload({ email: "no-es-un-correo" }),
    );
    expect(response.status).toBe(422);
  });

  it("rechaza una contraseña inválida", async () => {
    const response = await api().post("/api/auth/register").send(
      registerPayload({ password: "123456", confirmPassword: "123456" }),
    );
    expect(response.status).toBe(422);
  });

  it("rechaza si la confirmación no coincide", async () => {
    const response = await api().post("/api/auth/register").send(
      registerPayload({ confirmPassword: "OtraClave#2026" }),
    );
    expect(response.status).toBe(422);
  });

  it("rechaza si no acepta términos", async () => {
    const response = await api().post("/api/auth/register").send(
      registerPayload({ termsAccepted: false }),
    );
    expect(response.status).toBe(422);
  });

  it("ignora role=ADMIN y crea USER", async () => {
    const payload = registerPayload({ role: "ADMIN" });
    const response = await api().post("/api/auth/register").send(payload);
    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe("USER");
  });
});
