import { describe, expect, it } from "vitest";
import { api, createAndLoginStaffAdmin, loginAsAdmin, sampleExperienceImages } from "./helpers.js";

describe("HU-20 Categorías", () => {
  it("deja pendiente la categoría de un administrador y no la muestra en el catálogo público", async () => {
    const { adminToken } = await createAndLoginStaffAdmin();
    const name = `Gastronomía ${Date.now()}`;
    const response = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name,
        description: "Sabores de origen y mesas locales.",
        status: "APPROVED",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.category.name).toContain("Gastronomía");
    expect(response.body.data.category.icon).toBe("tags");
    expect(response.body.data.category.status).toBe("PENDING");

    const publicList = await api().get("/api/categories");
    const visible = (publicList.body.data.categories as Array<{ id: string }>).some(
      (item) => item.id === response.body.data.category.id,
    );
    expect(visible).toBe(false);

    const experience = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Ruta con categoría pendiente",
        description: "Descripción suficientemente larga para validar el formulario de experiencia.",
        categoryId: response.body.data.category.id,
        price: 50000,
        location: "Bogotá",
        imageUrl: sampleExperienceImages()[0],
        imageUrls: sampleExperienceImages(),
      });
    expect(experience.status).toBe(400);
  });

  it("notifica a los super administradores cuando un administrador crea una categoría pendiente", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const name = `Aventuras naturales ${Date.now()}`;
    const created = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, description: "Pendiente de revisión." });

    expect(created.status).toBe(201);
    const id = created.body.data.category.id as string;

    const notifications = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${superToken}`);
    const pendingNote = (
      notifications.body.data.items as Array<{ type: string; title: string; body: string; entityId?: string | null }>
    ).find((item) => item.type === "CATEGORY_PENDING" && item.entityId === id);
    expect(pendingNote).toBeTruthy();
    expect(pendingNote?.title).toBe("Nueva categoría pendiente");
    expect(pendingNote?.body).toBe(`La categoría "${name}" requiere revisión.`);

    const adminNotes = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${adminToken}`);
    expect(
      (adminNotes.body.data.items as Array<{ type: string; entityId?: string | null }>).some(
        (item) => item.type === "CATEGORY_PENDING" && item.entityId === id,
      ),
    ).toBe(false);
  });

  it("aprueba una categoría pendiente y la deja disponible para usuarios", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const created = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Aprobar cat ${Date.now()}`, description: "Pendiente de revisión." });

    expect(created.body.data.category.status).toBe("PENDING");
    const id = created.body.data.category.id as string;

    const blocked = await api().post(`/api/admin/categories/${id}/approve`).set("Authorization", `Bearer ${adminToken}`);
    expect(blocked.status).toBe(403);

    const approved = await api().post(`/api/admin/categories/${id}/approve`).set("Authorization", `Bearer ${superToken}`);
    expect(approved.status).toBe(200);
    expect(approved.body.data.category.status).toBe("APPROVED");

    const adminNotes = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${adminToken}`);
    const approvedNote = (
      adminNotes.body.data.items as Array<{ type: string; title: string; body: string; entityId?: string | null }>
    ).find((item) => item.type === "CATEGORY_APPROVED" && item.entityId === id);
    expect(approvedNote).toBeTruthy();
    expect(approvedNote?.title).toBe("Categoría aprobada");
    expect(approvedNote?.body).toBe(
      `Tu categoría "${created.body.data.category.name}" fue aprobada y ya está disponible.`,
    );

    const publicList = await api().get("/api/categories");
    const visible = (publicList.body.data.categories as Array<{ id: string }>).some((item) => item.id === id);
    expect(visible).toBe(true);
  });

  it("rechaza una categoría pendiente con motivo", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const created = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Rechazar cat ${Date.now()}` });
    const id = created.body.data.category.id as string;

    const emptyReason = await api()
      .post(`/api/admin/categories/${id}/reject`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ reason: "   " });
    expect(emptyReason.status).toBe(422);
    expect(
      ((emptyReason.body.error.details ?? []) as Array<{ message: string }>).some((item) =>
        /motivo para rechazar/i.test(item.message),
      ),
    ).toBe(true);

    const rejected = await api()
      .post(`/api/admin/categories/${id}/reject`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ reason: "El nombre no describe una categoría del catálogo." });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.category.status).toBe("REJECTED");
    expect(rejected.body.data.category.rejectionReason).toContain("nombre");

    const adminNotes = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${adminToken}`);
    const rejectedNote = (
      adminNotes.body.data.items as Array<{ type: string; title: string; body: string; entityId?: string | null }>
    ).find((item) => item.type === "CATEGORY_REJECTED" && item.entityId === id);
    expect(rejectedNote).toBeTruthy();
    expect(rejectedNote?.title).toBe("Categoría rechazada");
    expect(rejectedNote?.body).toContain(`Tu categoría "${created.body.data.category.name}" fue rechazada.`);
    expect(rejectedNote?.body).toMatch(/Motivo:\s*El nombre no describe una categoría del catálogo\./);

    const publicList = await api().get("/api/categories");
    const visible = (publicList.body.data.categories as Array<{ id: string }>).some((item) => item.id === id);
    expect(visible).toBe(false);
  });

  it("aprueba de inmediato las categorías creadas por un Super Administrador", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const response = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `Directa ${Date.now()}`,
        description: "Lista para el catálogo.",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.category.status).toBe("APPROVED");

    const notifications = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${token}`);
    expect(
      (notifications.body.data.items as Array<{ type: string; entityId?: string | null }>).some(
        (item) => item.type === "CATEGORY_PENDING" && item.entityId === response.body.data.category.id,
      ),
    ).toBe(false);
  });

  it("guarda el icono seleccionado al crear una categoría", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const response = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `Café ${Date.now()}`,
        description: "Experiencias relacionadas con café",
        icon: "coffee",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.category.icon).toBe("coffee");
  });

  it("edita una categoría", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const created = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Patrimonio ${Date.now()}`, description: "Inicial" });

    const id = created.body.data.category.id as string;
    const updated = await api()
      .put(`/api/admin/categories/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Memoria viva de un territorio." });

    expect(updated.status).toBe(200);
    expect(updated.body.data.category.description).toContain("Memoria");
  });

  it("permite que un administrador vea sus categorías pendientes sin editarlas", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const created = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Pendiente lista ${Date.now()}`, description: "No debe editarse." });
    const id = created.body.data.category.id as string;
    expect(created.body.data.category.status).toBe("PENDING");

    const edited = await api()
      .put(`/api/admin/categories/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ description: "Intento de edición" });
    expect(edited.status).toBe(403);

    const adminList = await api().get("/api/admin/categories").set("Authorization", `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(
      (adminList.body.data.categories as Array<{ id: string; status: string }>).some(
        (item) => item.id === id && item.status === "PENDING",
      ),
    ).toBe(true);

    const publicList = await api().get("/api/categories");
    expect(
      (publicList.body.data.categories as Array<{ id: string }>).some((item) => item.id === id),
    ).toBe(false);

    const dashboard = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${adminToken}`);
    expect(
      ((dashboard.body.data.recentCategories ?? []) as Array<{ id: string; status: string }>).every(
        (item) => item.status === "APPROVED",
      ),
    ).toBe(true);

    const reviewList = await api().get("/api/admin/categories").set("Authorization", `Bearer ${superToken}`);
    expect(
      (reviewList.body.data.categories as Array<{ id: string }>).some((item) => item.id === id),
    ).toBe(true);
  });

  it("oculta categorías pendientes y rechazadas a administradores que no las crearon", async () => {
    const owner = await createAndLoginStaffAdmin();
    const other = await createAndLoginStaffAdmin();
    const created = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${owner.adminToken}`)
      .send({ name: `Turismo extremo ${Date.now()}`, description: "Solo el creador debe verla pendiente." });
    const id = created.body.data.category.id as string;
    expect(created.body.data.category.status).toBe("PENDING");

    const otherPending = await api().get("/api/admin/categories").set("Authorization", `Bearer ${other.adminToken}`);
    expect(
      (otherPending.body.data.categories as Array<{ id: string }>).some((item) => item.id === id),
    ).toBe(false);

    const rejected = await api()
      .post(`/api/admin/categories/${id}/reject`)
      .set("Authorization", `Bearer ${owner.superToken}`)
      .send({ reason: "Categoría duplicada y fuera del catálogo." });
    expect(rejected.status).toBe(200);

    const ownerList = await api().get("/api/admin/categories").set("Authorization", `Bearer ${owner.adminToken}`);
    const owned = (ownerList.body.data.categories as Array<{
      id: string;
      status: string;
      rejectionReason?: string | null;
    }>).find((item) => item.id === id);
    expect(owned?.status).toBe("REJECTED");
    expect(owned?.rejectionReason).toMatch(/duplicada/i);

    const otherRejected = await api().get("/api/admin/categories").set("Authorization", `Bearer ${other.adminToken}`);
    expect(
      (otherRejected.body.data.categories as Array<{ id: string; rejectionReason?: string | null }>).some(
        (item) => item.id === id || Boolean(item.rejectionReason?.match(/duplicada/i)),
      ),
    ).toBe(false);

    const superList = await api().get("/api/admin/categories").set("Authorization", `Bearer ${owner.superToken}`);
    expect(
      (superList.body.data.categories as Array<{ id: string; status: string }>).some(
        (item) => item.id === id && item.status === "REJECTED",
      ),
    ).toBe(true);
  });

  it("impide que un administrador elimine categorías", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const created = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ name: `No borrar ${Date.now()}` });
    const categoryId = created.body.data.category.id as string;

    const deleted = await api()
      .delete(`/api/admin/categories/${categoryId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(deleted.status).toBe(403);
  });

  it("impide eliminar una categoría asociada a experiencias", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Asociada ${Date.now()}` });

    const categoryId = category.body.data.category.id as string;

    await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Ruta de prueba",
        description: "Descripción suficientemente larga para validar el formulario.",
        categoryId,
        price: 50000,
        location: "Bogotá",
        imageUrl: sampleExperienceImages()[0],
        imageUrls: sampleExperienceImages(),
      });

    const deleted = await api()
      .delete(`/api/admin/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleted.status).toBe(403);
    expect(deleted.body.error.message).toMatch(/experiencias asociadas/i);
  });

  it("permite consultar solo las últimas categorías para el resumen", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const recent = await api()
      .get("/api/admin/categories")
      .query({ limit: 3 })
      .set("Authorization", `Bearer ${token}`);

    expect(recent.status).toBe(200);
    expect(recent.body.data.categories.length).toBeLessThanOrEqual(3);
  });
});
