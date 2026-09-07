import { describe, expect, it } from "vitest";
import { api, loginAs, loginAsAdmin } from "./helpers.js";

describe("Revisión de experiencias", () => {
  it("crea en pendiente e ignora un intento de publicar directo", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Revisión ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Taller de velas artesanales",
        description: "Una experiencia creativa para aprender a elaborar velas con aroma local.",
        categoryId: category.body.data.category.id,
        price: 90000,
        location: "Cadmiel, Envigado, Antioquia",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
        status: "PUBLISHED",
      });

    expect(created.status).toBe(201);
    expect(created.body.data.experience.status).toBe("PENDING");

    const publicList = await api().get("/api/experiences");
    const visible = (publicList.body.data.experiences as Array<{ id: string }>).some(
      (item) => item.id === created.body.data.experience.id,
    );
    expect(visible).toBe(false);

    const publishedDirect = await api()
      .patch(`/api/admin/experiences/${created.body.data.experience.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PUBLISHED" });
    expect(publishedDirect.status).toBe(403);
  });

  it("aprueba, publica y permite rechazar con motivo", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Aprobar ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Camino de niebla",
        description: "Una travesía corta entre bosque de niebla y miradores silenciosos.",
        categoryId: category.body.data.category.id,
        price: 90000,
        location: "Chingaza, Cundinamarca",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
      });

    const id = created.body.data.experience.id as string;
    const rejectedEmpty = await api()
      .post(`/api/admin/experiences/${id}/reject`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "No" });
    expect(rejectedEmpty.status).toBe(422);

    const approved = await api()
      .post(`/api/admin/experiences/${id}/approve`)
      .set("Authorization", `Bearer ${token}`);
    expect(approved.status).toBe(200);
    expect(approved.body.data.experience.status).toBe("PUBLISHED");

    const publicItem = await api().get(`/api/experiences/${id}`);
    expect(publicItem.status).toBe(200);

    const second = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Ruta para rechazar",
        description: "Una experiencia de prueba que será rechazada por falta de detalle operativo.",
        categoryId: category.body.data.category.id,
        price: 50000,
        location: "Envigado, Antioquia",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
      });
    const rejectedId = second.body.data.experience.id as string;
    const rejected = await api()
      .post(`/api/admin/experiences/${rejectedId}/reject`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "Falta aclarar el punto de encuentro y el cupo máximo." });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.experience.status).toBe("REJECTED");
    expect(rejected.body.data.experience.rejectionReason).toContain("punto de encuentro");

    const resubmitted = await api()
      .post(`/api/admin/experiences/${rejectedId}/submit`)
      .set("Authorization", `Bearer ${token}`);
    expect(resubmitted.body.data.experience.status).toBe("PENDING");
  });

  it("notifica al super admin y bloquea que un administrador publique o apruebe", async () => {
    const superLogin = await loginAsAdmin();
    const superToken = superLogin.body.data.accessToken as string;
    const adminEmail = `revisor.${Date.now()}@entrecaminos.test`;
    const createdAdmin = await api()
      .post("/api/admin/administrators")
      .set("Authorization", `Bearer ${superToken}`)
      .send({
        name: "Admin Revisor",
        email: adminEmail,
        password: "Admin#2026x",
        role: "ADMIN",
      });
    expect(createdAdmin.status).toBe(201);

    const adminLogin = await loginAs(adminEmail, "Admin#2026x");
    const adminToken = adminLogin.body.data.accessToken as string;
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Notificar ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Taller de velas artesanales en Cadmiel",
        description: "Una experiencia creativa para aprender a elaborar velas con aroma local.",
        categoryId: category.body.data.category.id,
        price: 90000,
        location: "Cadmiel, Envigado, Antioquia",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
      });
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
