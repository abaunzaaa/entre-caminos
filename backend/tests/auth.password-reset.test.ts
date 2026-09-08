import { describe, expect, it } from "vitest";
import { PASSWORD_RESET_GENERIC_MESSAGE } from "../src/config/constants.js";
import { hashToken } from "../src/services/token.service.js";
import { api, prisma, uniqueEmail } from "./helpers.js";

const currentPassword = "Caminos#2026";
const nextPassword = "NuevaClave#2026";

async function registerForReset(email = uniqueEmail("reset")) {
  const response = await api().post("/api/auth/register").send({
    name: "Usuario Recuperación",
    email,
    password: currentPassword,
    confirmPassword: currentPassword,
    termsAccepted: true,
  });
  expect(response.status).toBe(201);
  return email;
}

describe("Recuperación de contraseña", () => {
  it("acepta un correo registrado con el mensaje genérico y guarda solo el hash del token", async () => {
    const email = await registerForReset();
    const forgot = await api().post("/api/auth/forgot-password").send({ email: ` ${email.toUpperCase()} ` });

    expect(forgot.status).toBe(200);
    expect(forgot.body.message).toBe(PASSWORD_RESET_GENERIC_MESSAGE);
    expect(forgot.body.data.accepted).toBe(true);
    expect(forgot.body.data.devToken).toBeTruthy();
    expect(JSON.stringify(forgot.body)).not.toContain(currentPassword);

    const user = await prisma.user.findUnique({ where: { email } });
    const stored = await prisma.passwordResetToken.findMany({ where: { userId: user!.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).toBe(hashToken(forgot.body.data.devToken));
    expect(stored[0].tokenHash).not.toBe(forgot.body.data.devToken);
    expect(stored[0].usedAt).toBeNull();
    expect(stored[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("acepta un correo no registrado con el mismo mensaje genérico", async () => {
    const before = await prisma.passwordResetToken.count();
    const forgot = await api()
      .post("/api/auth/forgot-password")
      .send({ email: uniqueEmail("ausente") });

    expect(forgot.status).toBe(200);
    expect(forgot.body.message).toBe(PASSWORD_RESET_GENERIC_MESSAGE);
    expect(forgot.body.data.accepted).toBe(true);
    expect(forgot.body.data.devToken).toBeUndefined();
    expect(await prisma.passwordResetToken.count()).toBe(before);
  });

  it("rechaza un correo con formato incorrecto", async () => {
    const forgot = await api().post("/api/auth/forgot-password").send({ email: "no-es-un-correo" });
    expect(forgot.status).toBe(422);
  });

  it("invalida tokens anteriores cuando se solicita uno nuevo", async () => {
    const email = await registerForReset();
    const first = await api().post("/api/auth/forgot-password").send({ email });
    const second = await api().post("/api/auth/forgot-password").send({ email });

    expect(first.body.data.devToken).toBeTruthy();
    expect(second.body.data.devToken).toBeTruthy();
    expect(second.body.data.devToken).not.toBe(first.body.data.devToken);

    const reused = await api().post("/api/auth/reset-password").send({
      token: first.body.data.devToken,
      password: nextPassword,
      confirmPassword: nextPassword,
    });
    expect(reused.status).toBe(400);
    expect(reused.body.error.message).toMatch(/utilizado|válido/i);

    const reset = await api().post("/api/auth/reset-password").send({
      token: second.body.data.devToken,
      password: nextPassword,
      confirmPassword: nextPassword,
    });
    expect(reset.status).toBe(200);
  });

  it("restablece la contraseña con un enlace válido y deja de aceptar la anterior", async () => {
    const email = await registerForReset();
    const forgot = await api().post("/api/auth/forgot-password").send({ email });

    const reset = await api().post("/api/auth/reset-password").send({
      token: forgot.body.data.devToken,
      password: nextPassword,
      confirmPassword: nextPassword,
    });
    expect(reset.status).toBe(200);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored?.passwordHash).not.toBe(nextPassword);
    expect(stored?.passwordHash.startsWith("$2")).toBe(true);

    const oldLogin = await api().post("/api/auth/login").send({ email, password: currentPassword });
    expect(oldLogin.status).toBe(401);

    const newLogin = await api().post("/api/auth/login").send({ email, password: nextPassword });
    expect(newLogin.status).toBe(200);
  });

  it("rechaza un token inválido", async () => {
    const reset = await api().post("/api/auth/reset-password").send({
      token: "a".repeat(40),
      password: nextPassword,
      confirmPassword: nextPassword,
    });
    expect(reset.status).toBe(400);
    expect(reset.body.error.message).toMatch(/no es válido/i);
  });

  it("rechaza un token vencido", async () => {
    const email = await registerForReset();
    const forgot = await api().post("/api/auth/forgot-password").send({ email });
    const token = forgot.body.data.devToken as string;

    await prisma.passwordResetToken.update({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const reset = await api().post("/api/auth/reset-password").send({
      token,
      password: nextPassword,
      confirmPassword: nextPassword,
    });
    expect(reset.status).toBe(400);
    expect(reset.body.error.message).toMatch(/expir/i);
  });

  it("rechaza el segundo uso del mismo token", async () => {
    const email = await registerForReset();
    const forgot = await api().post("/api/auth/forgot-password").send({ email });
    const payload = {
      token: forgot.body.data.devToken,
      password: nextPassword,
      confirmPassword: nextPassword,
    };

    expect((await api().post("/api/auth/reset-password").send(payload)).status).toBe(200);
    const second = await api().post("/api/auth/reset-password").send({
      ...payload,
      password: "OtraClave#2026",
      confirmPassword: "OtraClave#2026",
    });
    expect(second.status).toBe(400);
    expect(second.body.error.message).toMatch(/utilizado/i);
  });

  it("rechaza contraseñas distintas", async () => {
    const email = await registerForReset();
    const forgot = await api().post("/api/auth/forgot-password").send({ email });
    const reset = await api().post("/api/auth/reset-password").send({
      token: forgot.body.data.devToken,
      password: nextPassword,
      confirmPassword: "OtraClave#2026",
    });
    expect(reset.status).toBe(422);
  });

  it("rechaza una contraseña que no cumple las reglas de registro", async () => {
    const email = await registerForReset();
    const forgot = await api().post("/api/auth/forgot-password").send({ email });
    const reset = await api().post("/api/auth/reset-password").send({
      token: forgot.body.data.devToken,
      password: "123456",
      confirmPassword: "123456",
    });
    expect(reset.status).toBe(422);
  });
});
