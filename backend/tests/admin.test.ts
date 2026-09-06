import { describe, expect, it } from "vitest";
import { ROLES } from "../src/config/constants.js";
import { api, loginAsAdmin, prisma, registerUser } from "./helpers.js";

async function countActiveAdministratorsInDb() {
  return prisma.user.count({
    where: {
      status: "ACTIVE",
      role: { name: { in: [ROLES.SUPER_ADMIN, ROLES.ADMIN] } },
    },
  });
}

describe("HU-21 Administración", () => {
  it("bloquea a un usuario sin permisos", async () => {
    const { payload } = await registerUser();
    const login = await api().post("/api/auth/login").send({
      email: payload.email,
      password: payload.password,
    });

    const token = login.body.data.accessToken as string;
    const response = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("permite al SUPER_ADMIN gestionar administradores", async () => {
    const adminLogin = await loginAsAdmin();
    const token = adminLogin.body.data.accessToken as string;

    const dashboard = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.admins).toBe(await countActiveAdministratorsInDb());
    expect(Array.isArray(dashboard.body.data.administrators)).toBe(true);
    expect(dashboard.body.data.administrators.length).toBeLessThanOrEqual(3);

    const created = await api()
      .post("/api/admin/administrators")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Natalia Admin",
        email: `natalia.${Date.now()}@entrecaminos.com`,
        password: "Admin#2026!",
        role: "ADMIN",
      });

    expect(created.status).toBe(201);
    expect(created.body.data.admin.role).toBe("ADMIN");

    const afterCreate = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(afterCreate.status).toBe(200);
    expect(afterCreate.body.data.admins).toBe(dashboard.body.data.admins + 1);
    expect(afterCreate.body.data.admins).toBe(await countActiveAdministratorsInDb());

    const { payload } = await registerUser();
    expect(payload.email).toContain("@entrecaminos.test");
    const afterResident = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(afterResident.status).toBe(200);
    expect(afterResident.body.data.admins).toBe(afterCreate.body.data.admins);

    const deactivated = await api()
      .put(`/api/admin/administrators/${created.body.data.admin.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "INACTIVE" });
    expect(deactivated.status).toBe(200);

    const afterDeactivate = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(afterDeactivate.status).toBe(200);
    expect(afterDeactivate.body.data.admins).toBe(dashboard.body.data.admins);
    expect(afterDeactivate.body.data.admins).toBe(await countActiveAdministratorsInDb());

    const list = await api()
      .get("/api/admin/administrators")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.admins.length).toBeGreaterThan(0);
    const activeListed = list.body.data.admins.filter(
      (admin: { status: string; role: string }) =>
        admin.status === "ACTIVE" && (admin.role === "SUPER_ADMIN" || admin.role === "ADMIN"),
    );
    const uniqueActiveIds = new Set(activeListed.map((admin: { id: string }) => admin.id));
    expect(uniqueActiveIds.size).toBe(afterDeactivate.body.data.admins);
    expect(list.body.data.admins.every((admin: { role: string }) => admin.role === "SUPER_ADMIN" || admin.role === "ADMIN")).toBe(
      true,
    );

    const recent = await api()
      .get("/api/admin/administrators")
      .query({ limit: 3 })
      .set("Authorization", `Bearer ${token}`);
    expect(recent.status).toBe(200);
    expect(recent.body.data.admins.length).toBeLessThanOrEqual(3);
  });

  it("cuenta solo categorías y experiencias vigentes del administrador", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const stamp = Date.now();

    const baseline = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(baseline.status).toBe(200);
    const cats0 = baseline.body.data.createdCategories as number;
    const exps0 = baseline.body.data.createdExperiences as number;

    const activeCat = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Dash activa ${stamp}`, status: "ACTIVE" });
    const inactiveCat = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Dash inactiva ${stamp}`, status: "INACTIVE" });
    const deletedCat = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Dash eliminada ${stamp}`, status: "ACTIVE" });

    expect(activeCat.status).toBe(201);
    expect(inactiveCat.status).toBe(201);
    expect(deletedCat.status).toBe(201);

    const afterCreateCats = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(afterCreateCats.body.data.createdCategories).toBe(cats0 + 3);

    await api()
      .delete(`/api/admin/categories/${deletedCat.body.data.category.id}`)
      .set("Authorization", `Bearer ${token}`);

    const afterDeleteCat = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(afterDeleteCat.body.data.createdCategories).toBe(cats0 + 2);

    const draft = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: `Borrador dashboard ${stamp}`,
        description: "Borrador de prueba para el conteo del panel de inicio del administrador.",
        categoryId: activeCat.body.data.category.id,
        price: 10000,
        location: "Medellín",
        status: "DRAFT",
      });
    expect(draft.status).toBe(201);

    const afterDraft = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(afterDraft.body.data.createdExperiences).toBe(exps0);

    const published = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: `Publicada dashboard ${stamp}`,
        description: "Experiencia publicada de prueba para el conteo del panel de inicio.",
        categoryId: activeCat.body.data.category.id,
        price: 20000,
        location: "Guatapé",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
        status: "PUBLISHED",
      });
    expect(published.status).toBe(201);
    const publishedId = published.body.data.experience.id as string;

    const afterPublish = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(afterPublish.body.data.createdExperiences).toBe(exps0 + 1);

    await api()
      .patch(`/api/admin/experiences/${publishedId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ARCHIVED" });

    const afterArchive = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(afterArchive.body.data.createdExperiences).toBe(exps0 + 1);

    await api().delete(`/api/admin/experiences/${publishedId}`).set("Authorization", `Bearer ${token}`);
    await api()
      .delete(`/api/admin/experiences/${draft.body.data.experience.id}`)
      .set("Authorization", `Bearer ${token}`);

    const afterDeleteExp = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(afterDeleteExp.body.data.createdExperiences).toBe(exps0);

    await api()
      .delete(`/api/admin/categories/${activeCat.body.data.category.id}`)
      .set("Authorization", `Bearer ${token}`);
    await api()
      .delete(`/api/admin/categories/${inactiveCat.body.data.category.id}`)
      .set("Authorization", `Bearer ${token}`);

    const restored = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(restored.body.data.createdCategories).toBe(cats0);
  });
});
