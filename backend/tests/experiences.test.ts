import { describe, expect, it } from "vitest";
import { api, loginAsAdmin } from "./helpers.js";

describe("HU-19 Experiencias", () => {
  it("valida campos obligatorios al crear", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const response = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "X" });

    expect(response.status).toBe(422);
  });

  it("crea y cambia estados DRAFT → PENDING → PUBLISHED → ARCHIVED", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const category = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Estados ${Date.now()}` });

    const created = await api()
      .post("/api/admin/experiences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Camino de niebla",
        description: "Una travesía corta entre bosque de niebla y miradores silenciosos.",
        categoryId: category.body.data.category.id,
        price: 90000,
        location: "Chingaza",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
        status: "DRAFT",
      });

    expect(created.status).toBe(201);
    expect(created.body.data.experience.status).toBe("DRAFT");

    const id = created.body.data.experience.id as string;

    const pending = await api()
      .patch(`/api/admin/experiences/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PENDING" });
    expect(pending.body.data.experience.status).toBe("PENDING");

    const published = await api()
      .patch(`/api/admin/experiences/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PUBLISHED" });
    expect(published.body.data.experience.status).toBe("PUBLISHED");

    const archived = await api()
      .patch(`/api/admin/experiences/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ARCHIVED" });
    expect(archived.body.data.experience.status).toBe("ARCHIVED");
  });
});
