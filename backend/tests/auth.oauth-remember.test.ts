import { describe, expect, it } from "vitest";
import { loginOrRegisterOAuth } from "../src/services/oauth.service.js";
import { api, adminCredentials, prisma, uniqueEmail } from "./helpers.js";

function cookieByName(response: { headers: { "set-cookie"?: string[] } }, name: string) {
  return (response.headers["set-cookie"] ?? []).find((cookie) => cookie.startsWith(`${name}=`)) ?? "";
}

describe("Recordarme y OAuth", () => {
  it("con remember guarda cookies persistentes", async () => {
    const response = await api().post("/api/auth/login").send({
      ...adminCredentials,
      remember: true,
    });

    expect(response.status).toBe(200);
    expect(cookieByName(response, "ec_refresh")).toMatch(/Max-Age=/i);
    expect(cookieByName(response, "ec_access")).toMatch(/Max-Age=/i);
  });

  it("sin remember usa cookies de sesión", async () => {
    const response = await api().post("/api/auth/login").send({
      ...adminCredentials,
      remember: false,
    });

    expect(response.status).toBe(200);
    expect(cookieByName(response, "ec_refresh")).not.toMatch(/Max-Age=/i);
    expect(cookieByName(response, "ec_access")).not.toMatch(/Max-Age=/i);
  });

  it("redirige si Google no está configurado", async () => {
    const response = await api().get("/api/auth/google?remember=1").redirects(0);

    expect(response.status).toBe(302);
    expect(String(response.headers.location)).toMatch(/\/login/);
    expect(String(response.headers.location)).toMatch(/oauthError=/);
  });

  it("ya no expone Apple ni Microsoft", async () => {
    const apple = await api().get("/api/auth/apple").redirects(0);
    const microsoft = await api().get("/api/auth/microsoft").redirects(0);

    expect(apple.status).toBe(404);
    expect(microsoft.status).toBe(404);
  });

  it("crea un usuario nuevo con proveedor externo y reutiliza el existente", async () => {
    const email = uniqueEmail("oauth");
    const first = await loginOrRegisterOAuth({
      provider: "GOOGLE",
      providerAccountId: `google-${email}`,
      email,
      name: "Ana Google",
    });

    expect(first.created).toBe(true);
    expect(first.user.email).toBe(email);
    expect(first.user.emailVerified).toBe(true);
    expect(first.user.role).toBe("USER");

    const second = await loginOrRegisterOAuth({
      provider: "GOOGLE",
      providerAccountId: `google-${email}`,
      email,
      name: "Ana Google",
    });

    expect(second.created).toBe(false);
    expect(second.user.id).toBe(first.user.id);

    const stored = await prisma.oAuthAccount.findMany({ where: { userId: first.user.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.provider).toBe("GOOGLE");
  });

  it("vincula Google a una cuenta local existente y conserva el rol", async () => {
    const login = await api().post("/api/auth/login").send(adminCredentials);
    expect(login.status).toBe(200);
    const adminEmail = adminCredentials.email;

    const linked = await loginOrRegisterOAuth({
      provider: "GOOGLE",
      providerAccountId: `google-${adminEmail}`,
      email: adminEmail,
      name: "Admin Entre Caminos",
    });

    expect(linked.created).toBe(false);
    expect(linked.user.email).toBe(adminEmail);
    expect(["ADMIN", "SUPER_ADMIN"]).toContain(linked.user.role);
  });
});
