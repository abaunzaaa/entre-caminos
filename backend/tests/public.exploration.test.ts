import { describe, expect, it } from "vitest";
import { api, loginAsAdmin, sampleExperienceImages } from "./helpers.js";

describe("HU-01 Exploración pública", () => {
  it("CP-S1-027: catálogo público de categorías y experiencias sin autenticación", async () => {
    const health = await api().get("/api/health");
    expect(health.status).toBe(200);

    const categories = await api().get("/api/categories");
    expect(categories.status).toBe(200);
    expect(Array.isArray(categories.body.data.categories)).toBe(true);

    const experiences = await api().get("/api/experiences");
    expect(experiences.status).toBe(200);
    expect(Array.isArray(experiences.body.data.experiences)).toBe(true);

    const featured = await api().get("/api/experiences/featured");
    expect(featured.status).toBe(200);
    expect(Array.isArray(featured.body.data.experiences)).toBe(true);
  });

  it("CP-S1-028: endpoints públicos de registro e inicio de sesión responden (flujo auth)", async () => {
    const registerShape = await api().post("/api/auth/register").send({});
    expect([400, 422]).toContain(registerShape.status);

    const loginShape = await api().post("/api/auth/login").send({});
    expect([400, 401, 422]).toContain(loginShape.status);
  });

  it("CP-S1-029: sin sesión no accede a funcionalidades personalizadas ni al panel", async () => {
    const me = await api().get("/api/auth/me");
    expect(me.status).toBe(401);

    const onboarding = await api().get("/api/auth/onboarding");
    expect(onboarding.status).toBe(401);

    const dashboard = await api().get("/api/admin/dashboard");
    expect(dashboard.status).toBe(401);
  });

  it("CP-S1-030: visitante no expone acciones administrativas; admin sí las usa", async () => {
    const createCategory = await api().post("/api/admin/categories").send({ name: "Hack" });
    expect(createCategory.status).toBe(401);

    const createExperience = await api()
      .post("/api/admin/experiences")
      .send({
        title: "Hack",
        description: "Descripción suficientemente larga para el intento no autenticado.",
        categoryId: "00000000-0000-0000-0000-000000000000",
        price: 1,
        location: "X",
        imageUrl: sampleExperienceImages()[0],
        imageUrls: sampleExperienceImages(),
      });
    expect(createExperience.status).toBe(401);

    const admins = await api().get("/api/admin/administrators");
    expect(admins.status).toBe(401);

    const token = (await loginAsAdmin()).body.data.accessToken as string;
    const allowed = await api().get("/api/admin/dashboard").set("Authorization", `Bearer ${token}`);
    expect(allowed.status).toBe(200);
  });
});
