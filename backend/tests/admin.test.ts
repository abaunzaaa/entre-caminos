import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLES } from "../src/config/constants.js";
import { ACCOUNT_REMOVED_MESSAGE } from "../src/utils/account.js";
import { api, createAndLoginStaffAdmin, loginAs, loginAsAdmin, prisma, registerUser, uniqueEmail, sampleExperienceImages } from "./helpers.js";

async function countActiveAdministratorsInDb() {
  return prisma.user.count({
    where: {
      deletedAt: null,
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
      .send({ name: `Dash activa ${stamp}` });
    const inactiveCat = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Dash inactiva ${stamp}` });
    const deletedCat = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Dash eliminada ${stamp}` });

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

    const pending = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: `Pendiente dashboard ${stamp}`,
        description: "Experiencia pendiente de prueba para el conteo del panel de inicio del administrador.",
        categoryId: activeCat.body.data.category.id,
        price: 10000,
        location: "Medellín, Antioquia",
        imageUrl: sampleExperienceImages()[0],
        imageUrls: sampleExperienceImages(),
      });
    expect(pending.status).toBe(201);

    const afterPending = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(afterPending.body.data.createdExperiences).toBe(exps0);

    const published = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: `Publicada dashboard ${stamp}`,
        description: "Experiencia publicada de prueba para el conteo del panel de inicio.",
        categoryId: activeCat.body.data.category.id,
        price: 20000,
        location: "Guatapé, Antioquia",
        imageUrl: sampleExperienceImages()[0],
        imageUrls: sampleExperienceImages(),
      });
    expect(published.status).toBe(201);
    const publishedId = published.body.data.experience.id as string;
    const approved = await api()
      .post(`/api/admin/experiences/${publishedId}/approve`)
      .set("Authorization", `Bearer ${token}`);
    expect(approved.status).toBe(200);

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
      .delete(`/api/admin/experiences/${pending.body.data.experience.id}`)
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

  it("elimina un administrador de forma persistente e invalida su sesión", async () => {
    const superLogin = await loginAsAdmin();
    const superToken = superLogin.body.data.accessToken as string;
    const superId = superLogin.body.data.user.id as string;
    const password = "Admin#2026!";
    const email = uniqueEmail("admin.delete");

    const created = await api()
      .post("/api/admin/administrators")
      .set("Authorization", `Bearer ${superToken}`)
      .send({
        name: "Admin Eliminar",
        email,
        password,
        role: "ADMIN",
      });
    expect(created.status).toBe(201);
    const adminId = created.body.data.admin.id as string;

    const adminLogin = await loginAs(email, password);
    expect(adminLogin.status).toBe(200);
    const adminToken = adminLogin.body.data.accessToken as string;

    const forbidden = await api()
      .delete(`/api/admin/administrators/${superId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(forbidden.status).toBe(403);

    const self = await api()
      .delete(`/api/admin/administrators/${superId}`)
      .set("Authorization", `Bearer ${superToken}`);
    expect(self.status).toBe(400);
    expect(self.body.error.message).toMatch(/propia cuenta/i);

    const removed = await api()
      .delete(`/api/admin/administrators/${adminId}`)
      .set("Authorization", `Bearer ${superToken}`);
    expect(removed.status).toBe(200);

    const listed = await api()
      .get("/api/admin/administrators")
      .set("Authorization", `Bearer ${superToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.admins.some((admin: { id: string }) => admin.id === adminId)).toBe(false);

    const persisted = await prisma.user.findUnique({ where: { id: adminId } });
    expect(persisted?.deletedAt).toBeTruthy();

    const loginAgain = await loginAs(email, password);
    expect(loginAgain.status).toBe(403);
    expect(loginAgain.body.error.message).toBe(ACCOUNT_REMOVED_MESSAGE);

    const staleSession = await api()
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(staleSession.status).toBe(401);
    expect(staleSession.body.error.message).toBe(ACCOUNT_REMOVED_MESSAGE);

    const reactivate = await api()
      .put(`/api/admin/administrators/${adminId}`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ status: "ACTIVE" });
    expect(reactivate.status).toBe(404);
  });

  it("impide eliminar al último super administrador activo", async () => {
    const superLogin = await loginAsAdmin();
    const superToken = superLogin.body.data.accessToken as string;
    const superId = superLogin.body.data.user.id as string;
    const password = "Admin#2026!";
    const email = uniqueEmail("admin.lastsuper");

    const created = await api()
      .post("/api/admin/administrators")
      .set("Authorization", `Bearer ${superToken}`)
      .send({
        name: "Admin Último Super",
        email,
        password,
        role: "ADMIN",
      });
    expect(created.status).toBe(201);
    const adminId = created.body.data.admin.id as string;
    const adminToken = (await loginAs(email, password)).body.data.accessToken as string;

    const permission = await prisma.permission.findUnique({
      where: { name: PERMISSIONS.ADMINS_MANAGE },
    });
    const adminRole = await prisma.role.findUnique({
      where: { name: ROLES.ADMIN },
    });
    expect(permission).toBeTruthy();
    expect(adminRole).toBeTruthy();

    const otherSupers = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { name: ROLES.SUPER_ADMIN },
        NOT: { id: superId },
      },
      select: { id: true },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole!.id,
          permissionId: permission!.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole!.id,
        permissionId: permission!.id,
      },
    });
    await prisma.user.updateMany({
      where: { id: { in: otherSupers.map((item) => item.id) } },
      data: { status: "INACTIVE" },
    });

    try {
      const attempt = await api()
        .delete(`/api/admin/administrators/${superId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(attempt.status).toBe(403);
    } finally {
      await prisma.user.updateMany({
        where: { id: { in: otherSupers.map((item) => item.id) } },
        data: { status: "ACTIVE" },
      });
      await prisma.rolePermission.deleteMany({
        where: { roleId: adminRole!.id, permissionId: permission!.id },
      });
      await prisma.user.update({
        where: { id: adminId },
        data: { deletedAt: new Date() },
      });
    }
  });

  it("impide que un administrador cree cuentas administrativas o gestione roles", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const email = uniqueEmail("admin.blocked");

    const created = await api()
      .post("/api/admin/administrators")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Admin no autorizado",
        email,
        password: "Admin#2026x",
        role: "ADMIN",
      });
    expect(created.status).toBe(403);

    const team = await api().get("/api/admin/administrators").set("Authorization", `Bearer ${adminToken}`);
    expect(team.status).toBe(200);
    expect(
      (team.body.data.admins as Array<{ role: string }>).every((item) => item.role === "SUPER_ADMIN"),
    ).toBe(true);

    const roles = await api().get("/api/admin/roles").set("Authorization", `Bearer ${adminToken}`);
    expect(roles.status).toBe(403);

    const newRole = await api()
      .post("/api/admin/roles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Rol ${Date.now()}` });
    expect(newRole.status).toBe(403);

    const target = await api()
      .post("/api/admin/administrators")
      .set("Authorization", `Bearer ${superToken}`)
      .send({
        name: "Admin objetivo",
        email: uniqueEmail("admin.target"),
        password: "Admin#2026x",
        role: "ADMIN",
      });
    expect(target.status).toBe(201);

    const permission = await prisma.permission.findUnique({ where: { name: PERMISSIONS.ADMINS_MANAGE } });
    const adminRole = await prisma.role.findUnique({ where: { name: ROLES.ADMIN } });
    expect(permission).toBeTruthy();
    expect(adminRole).toBeTruthy();

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole!.id,
          permissionId: permission!.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole!.id,
        permissionId: permission!.id,
      },
    });

    try {
      const roleChange = await api()
        .put(`/api/admin/administrators/${target.body.data.admin.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "SUPER_ADMIN" });
      expect(roleChange.status).toBe(403);
    } finally {
      await prisma.rolePermission.deleteMany({
        where: { roleId: adminRole!.id, permissionId: permission!.id },
      });
    }
  });

  it("devuelve la cantidad real de usuarios activos por rol", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    await createAndLoginStaffAdmin();
    await registerUser();

    const response = await api().get("/api/admin/roles").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);

    const roles = response.body.data.roles as Array<{ name: string; _count?: { users: number } }>;
    for (const name of [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER]) {
      const expected = await prisma.user.count({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          role: { name },
        },
      });
      expect(roles.find((role) => role.name === name)?._count?.users).toBe(expected);
    }
  });
});
