import { describe, expect, it } from "vitest";
import { api, loginAsAdmin } from "./helpers.js";

describe("HU-20 Categorías", () => {
  it("crea una categoría", async () => {
    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const response = await api()
      .post("/api/admin/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `Gastronomía ${Date.now()}`,
        description: "Sabores de origen y mesas locales.",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.category.name).toContain("Gastronomía");
    expect(response.body.data.category.icon).toBe("tags");
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
        status: "DRAFT",
      });

    const deleted = await api()
      .delete(`/api/admin/categories/${categoryId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleted.status).toBe(409);
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
