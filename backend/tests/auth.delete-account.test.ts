import request from "supertest";
import { describe, expect, it } from "vitest";
import { archivedAccountEmail } from "../src/utils/account.js";
import { adminCredentials, api, app, prisma, uniqueEmail } from "./helpers.js";

const password = "Caminos#2026";

async function registerTourist(email = uniqueEmail("delete")) {
  const agent = request.agent(app);
  const registered = await agent.post("/api/auth/register").send({
    name: "Turista Eliminar",
    email,
    password,
    confirmPassword: password,
    termsAccepted: true,
  });
  expect(registered.status).toBe(201);

  const verify = await agent.post("/api/auth/verify-email").send({
    email,
    code: registered.body.data.devCode,
  });
  expect(verify.status).toBe(200);

  return {
    agent,
    email,
    userId: verify.body.data.user.id as string,
    accessToken: verify.body.data.accessToken as string,
  };
}

describe("Eliminar cuenta propia", () => {
  it("elimina la cuenta autenticada, cierra la sesión y conserva experiencias públicas", async () => {
    const tourist = await registerTourist();
    const other = await registerTourist();
    const experienceCount = await prisma.experience.count();
    const experience = await prisma.experience.findFirst({ select: { id: true } });
    if (experience) {
      await prisma.experienceFavorite.create({
        data: { userId: tourist.userId, experienceId: experience.id },
      });
    }

    const deleted = await tourist.agent
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${tourist.accessToken}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.message).toMatch(/eliminada/i);

    const stored = await prisma.user.findUnique({ where: { id: tourist.userId } });
    expect(stored?.deletedAt).toBeTruthy();
    expect(stored?.email).toBe(archivedAccountEmail(tourist.userId));
    expect(stored?.name).toBe("Cuenta eliminada");
    expect(stored?.phone).toBeNull();
    expect(await prisma.userProfile.count({ where: { userId: tourist.userId } })).toBe(0);
    expect(await prisma.experienceFavorite.count({ where: { userId: tourist.userId } })).toBe(0);
    expect(await prisma.experience.count()).toBe(experienceCount);
    if (experience) {
      expect(await prisma.experience.findUnique({ where: { id: experience.id } })).toBeTruthy();
    }

    const otherStored = await prisma.user.findUnique({ where: { id: other.userId } });
    expect(otherStored?.deletedAt).toBeNull();
    expect(await prisma.userProfile.count({ where: { userId: other.userId } })).toBe(1);

    expect((await tourist.agent.get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/auth/me").set("Authorization", `Bearer ${tourist.accessToken}`)).status).toBe(401);

    const login = await api().post("/api/auth/login").send({ email: tourist.email, password });
    expect(login.status).toBe(401);
    expect(login.body.error.message).toBe("Credenciales incorrectas");

    const again = await api().post("/api/auth/register").send({
      name: "Turista Nueva",
      email: tourist.email,
      password,
      confirmPassword: password,
      termsAccepted: true,
    });
    expect(again.status).toBe(201);
    expect(again.body.data.user.id).not.toBe(tourist.userId);
    expect(again.body.data.user.email).toBe(tourist.email);

    const verified = await api().post("/api/auth/verify-email").send({
      email: tourist.email,
      code: again.body.data.devCode,
    });
    expect(verified.status).toBe(200);
    expect(verified.body.data.user.id).toBe(again.body.data.user.id);

    const newLogin = await api().post("/api/auth/login").send({ email: tourist.email, password });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data.user.id).toBe(again.body.data.user.id);
    expect(newLogin.body.data.user.emailVerified).toBe(true);

    const previous = await prisma.user.findUnique({ where: { id: tourist.userId } });
    expect(previous?.deletedAt).toBeTruthy();
    expect(previous?.email).toBe(archivedAccountEmail(tourist.userId));
    expect(await prisma.userProfile.count({ where: { userId: again.body.data.user.id } })).toBe(1);

    await api()
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${newLogin.body.data.accessToken}`);
    await other.agent.delete("/api/auth/me");
  });

  it("rechaza la eliminación sin sesión y no permite que un administrador borre su cuenta por este acceso", async () => {
    expect((await api().delete("/api/auth/me")).status).toBe(401);

    const admin = await api().post("/api/auth/login").send(adminCredentials);
    expect(admin.status).toBe(200);
    const denied = await api()
      .delete("/api/auth/me")
      .set("Authorization", `Bearer ${admin.body.data.accessToken}`);
    expect(denied.status).toBe(403);

    const stillThere = await prisma.user.findUnique({ where: { email: adminCredentials.email } });
    expect(stillThere?.deletedAt).toBeNull();
  });
});
