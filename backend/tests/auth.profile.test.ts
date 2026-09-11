import { describe, expect, it } from "vitest";
import { api, adminCredentials, createAndLoginStaffAdmin, loginAsAdmin, prisma } from "./helpers.js";

describe("PATCH /api/auth/me", () => {
  it("exige autenticación", async () => {
    const response = await api().patch("/api/auth/me").send({ name: "Nombre Nuevo" });
    expect(response.status).toBe(401);
  });

  it("actualiza solo el nombre del usuario autenticado", async () => {
    const { adminToken, email } = await createAndLoginStaffAdmin({ name: "Admin Original" });
    const otherName = (await loginAsAdmin()).body.data.user.name as string;

    const response = await api()
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "  Camila Editor  ",
        role: "USER",
        email: "otro@entrecaminos.test",
        id: "00000000-0000-0000-0000-000000000000",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.name).toBe("Camila Editor");
    expect(response.body.data.user.role).toBe("ADMIN");
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.phone).toBeNull();

    const withDetails = await api()
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Camila Editor",
        phone: "300 123 4567",
        country: "Colombia",
        department: "Antioquia",
        city: "Medellín",
        address: "El Poblado",
      });

    expect(withDetails.status).toBe(200);
    expect(withDetails.body.data.user.phone).toBe("300 123 4567");
    expect(withDetails.body.data.user.city).toBe("Medellín");
    expect(withDetails.body.data.user.role).toBe("ADMIN");

    const me = await api().get("/api/auth/me").set("Authorization", `Bearer ${adminToken}`);
    expect(me.body.data.user.name).toBe("Camila Editor");

    const seedAdmin = await prisma.user.findUnique({ where: { email: adminCredentials.email } });
    expect(seedAdmin?.name).toBe(otherName);
  });

  it("rechaza un nombre vacío o de solo espacios", async () => {
    const login = await loginAsAdmin();
    const token = login.body.data.accessToken as string;

    const empty = await api()
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "   " });

    expect(empty.status).toBe(422);
    expect(login.body.data.user.name).toBeTruthy();
  });

  it("guarda la foto de perfil en la base de datos", async () => {
    const { adminToken } = await createAndLoginStaffAdmin({ name: "Admin Foto" });
    const avatarUrl =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAD/wb//2wAAAAD/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAG/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AfwD/2Q==";

    const saved = await api()
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Admin Foto", avatarUrl });

    expect(saved.status).toBe(200);
    expect(saved.body.data.user.avatarUrl).toMatch(/^data:image\/|^https:\/\//);

    const me = await api().get("/api/auth/me").set("Authorization", `Bearer ${adminToken}`);
    expect(me.body.data.user.avatarUrl).toBe(saved.body.data.user.avatarUrl);

    const cleared = await api()
      .patch("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Admin Foto", avatarUrl: null });

    expect(cleared.status).toBe(200);
    expect(cleared.body.data.user.avatarUrl).toBeNull();
  });
});
