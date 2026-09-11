import { describe, expect, it } from "vitest";
import { MIN_EXPERIENCE_IMAGES_MESSAGE } from "../src/config/constants.js";
import { api, createAndLoginStaffAdmin, loginAsAdmin, prisma, sampleExperienceImages } from "./helpers.js";

function experiencePayload(categoryId: string, title: string, extra?: Record<string, unknown>) {
  const imageUrls = sampleExperienceImages();
  return {
    title,
    description: "Una experiencia creativa para aprender a elaborar velas con aroma local.",
    categoryId,
    price: 90000,
    location: "Cadmiel, Envigado, Antioquia",
    imageUrl: imageUrls[0],
    imageUrls,
    ...extra,
  };
}

describe("Revisión de experiencias", () => {
  it("impide crear o enviar una experiencia con menos de 5 imágenes", async () => {
    const { adminToken, superToken, email } = await createAndLoginStaffAdmin();
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ name: `Mínimo fotos ${Date.now()}` });
    const categoryId = category.body.data.category.id as string;

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(experiencePayload(categoryId, "Ruta con pocas fotos", { imageUrls: sampleExperienceImages(2) }));

    expect(created.status).toBe(422);
    expect(
      (created.body.error.details as Array<{ message?: string }>).some(
        (item) => item.message === MIN_EXPERIENCE_IMAGES_MESSAGE,
      ),
    ).toBe(true);

    const actor = await prisma.user.findUnique({ where: { email } });
    expect(actor).toBeTruthy();
    const draft = await prisma.experience.create({
      data: {
        title: "Borrador con una foto",
        description: "Descripción suficientemente larga para validar el envío a revisión.",
        categoryId,
        price: 45000,
        location: "Medellín, Antioquia",
        imageUrl: sampleExperienceImages(1)[0],
        imageUrls: sampleExperienceImages(1),
        status: "DRAFT",
        createdBy: actor!.id,
      },
    });

    const submitted = await api()
      .post(`/api/admin/experiences/${draft.id}/submit`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(submitted.status).toBe(422);
    expect(submitted.body.error.message).toBe(MIN_EXPERIENCE_IMAGES_MESSAGE);

    const valid = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(experiencePayload(categoryId, "Ruta con galería completa"));
    expect(valid.status).toBe(201);

    const reduced = await api()
      .put(`/api/admin/experiences/${valid.body.data.experience.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ imageUrls: sampleExperienceImages(4) });
    expect(reduced.status).toBe(422);
    expect(
      (reduced.body.error.details as Array<{ message?: string }>).some(
        (item) => item.message === MIN_EXPERIENCE_IMAGES_MESSAGE,
      ),
    ).toBe(true);
  });

  it("deja pendiente la experiencia de un administrador e ignora un intento de publicar directo", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${superToken}`)
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
      .set("Authorization", `Bearer ${superToken}`)
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
      .set("Authorization", `Bearer ${superToken}`)
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

describe("Listado admin de experiencias publicadas", () => {
  it("filtra PUBLICADAS, ordena por fecha descendente y limita en la consulta", async () => {
    const superToken = (await loginAsAdmin()).body.data.accessToken as string;
    const { adminToken } = await createAndLoginStaffAdmin();
    const stamp = Date.now();
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ name: `Publicadas preview ${stamp}` });
    const categoryId = category.body.data.category.id as string;

    const createdIds: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      const created = await api()
        .post("/api/admin/experiences")
        .set("Authorization", `Bearer ${superToken}`)
        .send(experiencePayload(categoryId, `Publicada ${stamp} ${index}`));
      expect(created.status).toBe(201);
      expect(created.body.data.experience.status).toBe("PUBLISHED");
      createdIds.push(created.body.data.experience.id as string);
    }

    const pending = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(experiencePayload(categoryId, `Pendiente ${stamp}`));
    expect(pending.body.data.experience.status).toBe("PENDING");
    const pendingId = pending.body.data.experience.id as string;

    const listed = await api()
      .get("/api/admin/experiences")
      .query({ status: "PUBLISHED", limit: 3 })
      .set("Authorization", `Bearer ${superToken}`);

    expect(listed.status).toBe(200);
    const experiences = listed.body.data.experiences as Array<{
      id: string;
      status: string;
      createdAt: string;
    }>;
    expect(experiences.length).toBeLessThanOrEqual(3);
    expect(experiences.every((item) => item.status === "PUBLISHED")).toBe(true);
    expect(experiences.some((item) => item.id === pendingId)).toBe(false);
    expect(experiences.some((item) => item.id === createdIds[createdIds.length - 1])).toBe(true);
    expect(experiences.some((item) => item.id === createdIds[0])).toBe(false);

    const times = experiences.map((item) => new Date(item.createdAt).getTime());
    expect(times).toEqual([...times].sort((left, right) => right - left));

    const pendingListed = await api()
      .get("/api/admin/experiences")
      .query({ status: "PENDING", limit: 3 })
      .set("Authorization", `Bearer ${superToken}`);
    expect(pendingListed.status).toBe(200);
    const pendingExperiences = pendingListed.body.data.experiences as Array<{ id: string; status: string }>;
    expect(pendingExperiences.length).toBeLessThanOrEqual(3);
    expect(pendingExperiences.every((item) => item.status === "PENDING")).toBe(true);
    expect(pendingExperiences.some((item) => item.id === pendingId)).toBe(true);
    expect(pendingExperiences.some((item) => createdIds.includes(item.id))).toBe(false);
  });
});

describe("Disponibilidad activa/inactiva", () => {
  it("oculta una experiencia inactiva del catálogo público y la restaura al activarla", async () => {
    const superToken = (await loginAsAdmin()).body.data.accessToken as string;
    const stamp = Date.now();
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ name: `Disponibilidad ${stamp}` });
    const categoryId = category.body.data.category.id as string;

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${superToken}`)
      .send(experiencePayload(categoryId, `Activa pública ${stamp}`));
    expect(created.status).toBe(201);
    expect(created.body.data.experience.status).toBe("PUBLISHED");
    const id = created.body.data.experience.id as string;

    const publicBefore = await api().get("/api/experiences");
    expect((publicBefore.body.data.experiences as Array<{ id: string }>).some((item) => item.id === id)).toBe(true);
    const featuredBefore = await api().get("/api/experiences/featured");
    expect((featuredBefore.body.data.experiences as Array<{ id: string }>).some((item) => item.id === id)).toBe(true);
    expect((await api().get(`/api/experiences/${id}`)).status).toBe(200);

    const deactivated = await api()
      .patch(`/api/admin/experiences/${id}/status`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ status: "ARCHIVED" });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.experience.status).toBe("ARCHIVED");
    expect(deactivated.body.data.experience.id).toBe(id);

    const publicAfter = await api().get("/api/experiences");
    expect((publicAfter.body.data.experiences as Array<{ id: string }>).some((item) => item.id === id)).toBe(false);
    const featuredAfter = await api().get("/api/experiences/featured");
    expect((featuredAfter.body.data.experiences as Array<{ id: string }>).some((item) => item.id === id)).toBe(false);
    expect((await api().get(`/api/experiences/${id}`)).status).toBe(404);

    const adminList = await api().get("/api/admin/experiences").set("Authorization", `Bearer ${superToken}`);
    expect((adminList.body.data.experiences as Array<{ id: string; status: string }>).some((item) => item.id === id && item.status === "ARCHIVED")).toBe(true);

    const publicCategory = await api().get("/api/categories");
    const publicCat = (publicCategory.body.data.categories as Array<{ id: string; _count?: { experiences: number } }>).find(
      (item) => item.id === categoryId,
    );
    expect(publicCat?._count?.experiences ?? 0).toBe(0);

    const restored = await api()
      .patch(`/api/admin/experiences/${id}/status`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ status: "PUBLISHED" });
    expect(restored.status).toBe(200);
    expect(restored.body.data.experience.status).toBe("PUBLISHED");
    expect((await api().get(`/api/experiences/${id}`)).status).toBe(200);
    expect(
      ((await api().get("/api/experiences")).body.data.experiences as Array<{ id: string }>).some((item) => item.id === id),
    ).toBe(true);
  });

  it("no permite desactivar una experiencia en revisión y sí permite que el administrador desactive la suya ya publicada", async () => {
    const { adminToken, superToken } = await createAndLoginStaffAdmin();
    const stamp = Date.now();
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ name: `Revisión disponibilidad ${stamp}` });
    const categoryId = category.body.data.category.id as string;

    const pending = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(experiencePayload(categoryId, `Pendiente disponibilidad ${stamp}`));
    expect(pending.body.data.experience.status).toBe("PENDING");
    const pendingId = pending.body.data.experience.id as string;

    const blockedArchive = await api()
      .patch(`/api/admin/experiences/${pendingId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ARCHIVED" });
    expect(blockedArchive.status).toBe(400);

    const blockedPublish = await api()
      .patch(`/api/admin/experiences/${pendingId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "PUBLISHED" });
    expect(blockedPublish.status).toBe(403);

    const approved = await api()
      .post(`/api/admin/experiences/${pendingId}/approve`)
      .set("Authorization", `Bearer ${superToken}`);
    expect(approved.body.data.experience.status).toBe("PUBLISHED");

    const deactivated = await api()
      .patch(`/api/admin/experiences/${pendingId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ARCHIVED" });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.experience.status).toBe("ARCHIVED");
    expect((await api().get(`/api/experiences/${pendingId}`)).status).toBe(404);

    const reactivated = await api()
      .patch(`/api/admin/experiences/${pendingId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "PUBLISHED" });
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.data.experience.status).toBe("PUBLISHED");
    expect((await api().get(`/api/experiences/${pendingId}`)).status).toBe(200);
  });
});

describe("Detalles de visita de experiencias", () => {
  it("guarda enlace, duración, disponibilidad y cómo llegar", async () => {
    const superToken = (await loginAsAdmin()).body.data.accessToken as string;
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ name: `Visita ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${superToken}`)
      .send(
        experiencePayload(category.body.data.category.id, "Taller de cerámica en El Carmen", {
          latitude: 6.0889,
          longitude: -75.3361,
          externalUrl: "wa.me/573001112233",
          durationValue: 3,
          durationUnit: "HOURS",
          availability: { type: "WEEKDAYS", days: ["Sábado", "Domingo"] },
          howToGetThere: "Desde Medellín toma la vía a El Carmen de Viboral. Punto de encuentro: parque principal.",
        }),
      );

    expect(created.status).toBe(201);
    const experience = created.body.data.experience as {
      id: string;
      externalUrl: string;
      duration: string;
      durationValue: number;
      durationUnit: string;
      availability: { type: string; days: string[] };
      howToGetThere: string;
      latitude: string | number;
      longitude: string | number;
    };
    expect(experience.externalUrl).toBe("https://wa.me/573001112233");
    expect(experience.duration).toBe("3 horas");
    expect(experience.durationValue).toBe(3);
    expect(experience.durationUnit).toBe("HOURS");
    expect(experience.availability).toEqual({ type: "WEEKDAYS", days: ["Sábado", "Domingo"] });
    expect(experience.howToGetThere).toContain("parque principal");
    expect(Number(experience.latitude)).toBeCloseTo(6.0889, 4);
    expect(Number(experience.longitude)).toBeCloseTo(-75.3361, 4);

    const publicItem = await api().get(`/api/experiences/${experience.id}`);
    expect(publicItem.status).toBe(200);
    expect(publicItem.body.data.experience.duration).toBe("3 horas");
    expect(publicItem.body.data.experience.durationValue).toBe(3);
    expect(publicItem.body.data.experience.durationUnit).toBe("HOURS");
    expect(publicItem.body.data.experience.howToGetThere).toContain("parque principal");

    const invalidLink = await api()
      .put(`/api/admin/experiences/${experience.id}`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ externalUrl: "no es un enlace" });
    expect(invalidLink.status).toBe(422);

    const updated = await api()
      .put(`/api/admin/experiences/${experience.id}`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({
        availability: { type: "DATES", dates: ["2026-10-12", "2026-10-19"] },
        latitude: 6.0901,
        longitude: -75.3388,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.experience.availability).toEqual({
      type: "DATES",
      dates: ["2026-10-12", "2026-10-19"],
    });
    expect(Number(updated.body.data.experience.latitude)).toBeCloseTo(6.0901, 4);
    expect(Number(updated.body.data.experience.longitude)).toBeCloseTo(-75.3388, 4);
  });
});
