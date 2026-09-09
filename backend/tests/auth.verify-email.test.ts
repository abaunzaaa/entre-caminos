import { describe, expect, it } from "vitest";
import { EMAIL_UNVERIFIED_LOGIN_MESSAGE } from "../src/config/constants.js";
import { hashToken } from "../src/services/token.service.js";
import { api, prisma, uniqueEmail } from "./helpers.js";

const password = "Caminos#2026";

async function registerUnverified(email = uniqueEmail("verify")) {
  const response = await api().post("/api/auth/register").send({
    name: "Usuario Verificación",
    email,
    password,
    confirmPassword: password,
    termsAccepted: true,
  });
  expect(response.status).toBe(201);
  return { email, response };
}

describe("Verificación de correo", () => {
  it("deja al usuario no verificado y guarda solo el hash del código", async () => {
    const { email, response } = await registerUnverified();
    expect(response.body.data.user.emailVerified).toBe(false);
    expect(response.body.data.devCode).toMatch(/^\d{6}$/);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored?.emailVerified).toBe(false);
    expect(stored?.verificationCode).toBe(hashToken(response.body.data.devCode));
    expect(stored?.verificationCode).not.toBe(response.body.data.devCode);
  });

  it("verifica el código correcto y continúa permitiendo el login", async () => {
    const { email, response } = await registerUnverified();
    const blocked = await api().post("/api/auth/login").send({ email, password });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.message).toBe(EMAIL_UNVERIFIED_LOGIN_MESSAGE);

    const verify = await api().post("/api/auth/verify-email").send({
      email,
      code: response.body.data.devCode,
    });
    expect(verify.status).toBe(200);
    expect(verify.body.data.user.emailVerified).toBe(true);
    expect(verify.body.data.accessToken).toBeTruthy();

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored?.emailVerified).toBe(true);
    expect(stored?.verificationCode).toBeNull();
    expect(stored?.verificationCodeExpires).toBeNull();

    const login = await api().post("/api/auth/login").send({ email, password });
    expect(login.status).toBe(200);
  });

  it("rechaza un código incorrecto", async () => {
    const { email } = await registerUnverified();
    const verify = await api().post("/api/auth/verify-email").send({
      email,
      code: "000000",
    });
    expect(verify.status).toBe(400);
    expect(verify.body.error.message).toMatch(/incorrecto/i);
  });

  it("rechaza un código vencido", async () => {
    const { email, response } = await registerUnverified();
    await prisma.user.update({
      where: { email },
      data: { verificationCodeExpires: new Date(Date.now() - 60_000) },
    });

    const verify = await api().post("/api/auth/verify-email").send({
      email,
      code: response.body.data.devCode,
    });
    expect(verify.status).toBe(400);
    expect(verify.body.error.message).toMatch(/expir/i);
  });

  it("rechaza un correo inexistente", async () => {
    const verify = await api().post("/api/auth/verify-email").send({
      email: uniqueEmail("ausente"),
      code: "123456",
    });
    expect(verify.status).toBe(404);
  });

  it("reenvía un código nuevo e invalida el anterior", async () => {
    const { email, response } = await registerUnverified();
    const firstCode = response.body.data.devCode as string;

    const resend = await api().post("/api/auth/resend-verification-code").send({ email });
    expect(resend.status).toBe(200);
    expect(resend.body.data.devCode).toMatch(/^\d{6}$/);
    expect(resend.body.data.devCode).not.toBe(firstCode);

    const oldCode = await api().post("/api/auth/verify-email").send({ email, code: firstCode });
    expect(oldCode.status).toBe(400);

    const verify = await api().post("/api/auth/verify-email").send({
      email,
      code: resend.body.data.devCode,
    });
    expect(verify.status).toBe(200);
  });
});
