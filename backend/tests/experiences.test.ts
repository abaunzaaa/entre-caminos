import { describe, expect, it } from "vitest";
import { api, createAndLoginStaffAdmin, loginAsAdmin } from "./helpers.js";

function experiencePayload(categoryId: string, title: string, extra?: Record<string, unknown>) {
  return {
    title,
    description: "Una experiencia creativa para aprender a elaborar velas con aroma local.",
    categoryId,
    price: 90000,
    location: "Cadmiel, Envigado, Antioquia",
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
    ...extra,
  };
}

describe("Revisión de experiencias", () => {
  it("deja pendiente la experiencia de un administrador e ignora un intento de publicar directo", async () => {
    const { adminToken } = await createAndLoginStaffAdmin();
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Revisión ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(experiencePayload(category.body.data.category.id, "Taller de velas artesanales", { status: "PUBLISHED" }));

    expect(created.status).toBe(201);
    expect(created.body.data.experience.status).toBe("PENDING");
    expect(created.body.message).toBe("Experiencia enviada a revisión");

    const publicList = await api().get("/api/experiences");
    const visible = (publicList.body.data.experiences as Array<{ id: string }>).some(
      (item) => item.id === created.body.data.experience.id,
    );
    expect(visible).toBe(false);

    const publishedDirect = await api()
      .patch(`/api/admin/experiences/${created.body.data.experience.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "PUBLISHED" });
    expect(publishedDirect.status).toBe(403);

    const forcedUpdate = await api()
      .put(`/api/admin/experiences/${created.body.data.experience.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "PUBLISHED", title: "Taller de velas artesanales" });
    expect(forcedUpdate.status).toBe(200);
    expect(forcedUpdate.body.data.experience.status).toBe("PENDING");
  });

  it("publica de inmediato las experiencias creadas por un Super Administrador", async () => {
    const superToken = (await loginAsAdmin()).body.data.accessToken as string;
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ name: `Directa ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${superToken}`)
      .send(experiencePayload(category.body.data.category.id, "Ruta publicada por super admin", { status: "PENDING" }));

    expect(created.status).toBe(201);
    expect(created.body.data.experience.status).toBe("PUBLISHED");
    expect(created.body.message).toBe("Experiencia publicada");

    const id = created.body.data.experience.id as string;
    const publicItem = await api().get(`/api/experiences/${id}`);
    expect(publicItem.status).toBe(200);

    const pending = await api()
      .get("/api/admin/experiences")
      .query({ status: "PENDING" })
      .set("Authorization", `Bearer ${superToken}`);
    expect(pending.status).toBe(200);
    expect((pending.body.data.experiences as Array<{ id: string }>).some((item) => item.id === id)).toBe(false);

    const notifications = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${superToken}`);
    expect(
      (notifications.body.data.items as Array<{ type: string; entityId?: string | null }>).some(
        (item) => item.type === "EXPERIENCE_PENDING" && item.entityId === id,
      ),
    ).toBe(false);
  });

  it("aprueba, publica y permite rechazar con motivo", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Aprobar ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(experiencePayload(category.body.data.category.id, "Camino de niebla"));

    const id = created.body.data.experience.id as string;
    const rejectedEmpty = await api()
      .post(`/api/admin/experiences/${id}/reject`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ reason: "No" });
    expect(rejectedEmpty.status).toBe(422);

    const approved = await api()
      .post(`/api/admin/experiences/${id}/approve`)
      .set("Authorization", `Bearer ${superToken}`);
    expect(approved.status).toBe(200);
    expect(approved.body.data.experience.status).toBe("PUBLISHED");

    const publicItem = await api().get(`/api/experiences/${id}`);
    expect(publicItem.status).toBe(200);

    const second = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(experiencePayload(category.body.data.category.id, "Ruta para rechazar", { price: 50000 }));
    const rejectedId = second.body.data.experience.id as string;
    const rejected = await api()
      .post(`/api/admin/experiences/${rejectedId}/reject`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ reason: "Falta aclarar el punto de encuentro y el cupo máximo." });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.experience.status).toBe("REJECTED");
    expect(rejected.body.data.experience.rejectionReason).toContain("punto de encuentro");

    const publicRejected = await api().get(`/api/experiences/${rejectedId}`);
    expect(publicRejected.status).toBe(404);

    const adminNotes = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${adminToken}`);
    const rejectedNote = (adminNotes.body.data.items as Array<{ type: string; entityId?: string | null }>).find(
      (item) => item.type === "EXPERIENCE_REJECTED" && item.entityId === rejectedId,
    );
    expect(rejectedNote).toBeTruthy();

    const resubmitted = await api()
      .post(`/api/admin/experiences/${rejectedId}/submit`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(resubmitted.body.data.experience.status).toBe("PENDING");
  });

  it("notifica al super admin y bloquea que un administrador publique o apruebe", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin({ name: "Admin Revisor" });
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Notificar ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(experiencePayload(category.body.data.category.id, "Taller de velas artesanales en Cadmiel"));
    expect(created.status).toBe(201);
    const experienceId = created.body.data.experience.id as string;

    const blockedApprove = await api()
      .post(`/api/admin/experiences/${experienceId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(blockedApprove.status).toBe(403);

    const notifications = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${superToken}`);
    expect(notifications.status).toBe(200);
    const pendingNote = (notifications.body.data.items as Array<{ type: string; entityId?: string | null; link?: string | null }>).find(
      (item) => item.type === "EXPERIENCE_PENDING" && item.entityId === experienceId,
    );
    expect(pendingNote).toBeTruthy();
    expect(pendingNote?.link).toContain("vista=pendientes");

    const reread = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${superToken}`);
    expect(
      (reread.body.data.items as Array<{ entityId?: string | null }>).some((item) => item.entityId === experienceId),
    ).toBe(true);

    const approved = await api()
      .post(`/api/admin/experiences/${experienceId}/approve`)
      .set("Authorization", `Bearer ${superToken}`);
    expect(approved.status).toBe(200);

    const adminNotes = await api().get("/api/admin/notifications").set("Authorization", `Bearer ${adminToken}`);
    const approvedNote = (adminNotes.body.data.items as Array<{ type: string; entityId?: string | null }>).find(
      (item) => item.type === "EXPERIENCE_APPROVED" && item.entityId === experienceId,
    );
    expect(approvedNote).toBeTruthy();
  });
});
