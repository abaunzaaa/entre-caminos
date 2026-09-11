import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR_CONFIG } from "../src/config/onboarding.js";
import { api, prisma, registerUser } from "./helpers.js";

const password = "Caminos#2026";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

const completePayload = {
  country: "Colombia" as const,
  department: "Cundinamarca",
  city: "Bogotá",
  neighborhood: "Chapinero",
  addressReference: "Parque Lourdes",
  latitude: 4.6533,
  longitude: -74.0628,
  profileImageType: "AVATAR" as const,
  avatarConfig: {
    ...DEFAULT_AVATAR_CONFIG,
    hairStyle: "bun" as const,
    outfitColor: "sage" as const,
  },
  interests: ["Naturaleza", "Gastronomía", "Cultura"],
  companions: ["Solo", "Amigos"],
  places: ["Montaña", "Ciudad"],
  music: ["Pop"],
  budget: ["Moderado"],
  climate: ["Templado"],
};

async function verifiedSession(name = "Camila Viajera") {
  const { response, payload } = await registerUser({ name });
  expect(response.status).toBe(201);
  const verify = await api().post("/api/auth/verify-email").send({
    email: payload.email,
    code: response.body.data.devCode,
  });
  expect(verify.status).toBe(200);
  const login = await api().post("/api/auth/login").send({
    email: payload.email,
    password: payload.password,
  });
  expect(login.status).toBe(200);
  return {
    token: login.body.data.accessToken as string,
    userId: login.body.data.user.id as string,
    email: payload.email,
    name: payload.name,
    password: payload.password,
  };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("Onboarding y perfil persistente", () => {
  it("crea un perfil vacío al registrar y lo expone en /me", async () => {
    const session = await verifiedSession();
    const stored = await prisma.userProfile.findUnique({ where: { userId: session.userId } });
    expect(stored).not.toBeNull();
    expect(stored?.onboardingCompleted).toBe(false);

    const me = await api().get("/api/auth/me").set(auth(session.token));
    expect(me.status).toBe(200);
    expect(me.body.data.user.profile.onboardingCompleted).toBe(false);
    expect(me.body.data.user.profile.interests).toEqual([]);
  });

  it("guarda ubicación estructurada, barrio y coordenadas", async () => {
    const session = await verifiedSession();
    const response = await api()
      .patch("/api/auth/onboarding")
      .set(auth(session.token))
      .send({
        country: "Colombia",
        department: "Antioquia",
        city: "Medellín",
        neighborhood: "  Laureles  ",
        addressReference: "  ",
        latitude: 6.2442,
        longitude: -75.5812,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.profile.country).toBe("Colombia");
    expect(response.body.data.profile.department).toBe("Antioquia");
    expect(response.body.data.profile.city).toBe("Medellín");
    expect(response.body.data.profile.neighborhood).toBe("Laureles");
    expect(response.body.data.profile.addressReference).toBeNull();
    expect(response.body.data.profile.latitude).toBeCloseTo(6.2442);
    expect(response.body.data.profile.onboardingCompleted).toBe(false);

    const stored = await prisma.userProfile.findUnique({ where: { userId: session.userId } });
    expect(stored?.city).toBe("Medellín");
    expect(stored?.neighborhood).toBe("Laureles");
  });

  it("mapea intereses históricos duplicados y rechaza más de cinco", async () => {
    const session = await verifiedSession();
    const mapped = await api()
      .patch("/api/auth/onboarding")
      .set(auth(session.token))
      .send({ interests: ["Comida", "Gastronomía", "Fiesta", "Naturaleza"] });
    expect(mapped.status).toBe(200);
    expect(mapped.body.data.profile.interests).toEqual(["Gastronomía", "Fiesta / Vida nocturna", "Naturaleza"]);

    const tooMany = await api()
      .patch("/api/auth/onboarding")
      .set(auth(session.token))
      .send({
        interests: ["Naturaleza", "Gastronomía", "Cultura", "Aventura", "Relajación", "Fiesta / Vida nocturna"],
      });
    expect(tooMany.status).toBe(422);
  });

  it("persiste el avatar y lo reconstruye en otro inicio de sesión", async () => {
    const session = await verifiedSession();
    const saved = await api()
      .patch("/api/auth/onboarding")
      .set(auth(session.token))
      .send({
        ...completePayload,
        completed: true,
      });
    expect(saved.status).toBe(200);
    expect(saved.body.data.profile.avatarConfig.hairStyle).toBe("bun");
    expect(saved.body.data.profile.profileImageType).toBe("AVATAR");
    expect(saved.body.data.profile.onboardingCompleted).toBe(true);

    const otherLogin = await api().post("/api/auth/login").send({
      email: session.email,
      password: session.password,
    });
    const recovered = await api()
      .get("/api/auth/me")
      .set(auth(otherLogin.body.data.accessToken));
    expect(recovered.status).toBe(200);
    expect(recovered.body.data.user.name).toBe(session.name);
    expect(recovered.body.data.user.profile.city).toBe("Bogotá");
    expect(recovered.body.data.user.profile.neighborhood).toBe("Chapinero");
    expect(recovered.body.data.user.profile.interests).toEqual(["Naturaleza", "Gastronomía", "Cultura"]);
    expect(recovered.body.data.user.profile.companions).toEqual(["Solo", "Amigos"]);
    expect(recovered.body.data.user.profile.places).toEqual(["Montaña", "Ciudad"]);
    expect(recovered.body.data.user.profile.music).toEqual(["Pop"]);
    expect(recovered.body.data.user.profile.budget).toEqual(["Moderado"]);
    expect(recovered.body.data.user.profile.climate).toEqual(["Templado"]);
    expect(recovered.body.data.user.profile.avatarConfig).toMatchObject({
      version: 1,
      hairStyle: "bun",
      outfitColor: "sage",
    });
  });

  it("no marca el onboarding como completo si faltan datos y conserva el borrador", async () => {
    const session = await verifiedSession();
    await api()
      .patch("/api/auth/onboarding")
      .set(auth(session.token))
      .send({ country: "Colombia", department: "Boyacá", city: "Tunja", neighborhood: "Centro" });

    const failed = await api()
      .patch("/api/auth/onboarding")
      .set(auth(session.token))
      .send({ completed: true, interests: ["Naturaleza"] });
    expect(failed.status).toBe(422);

    const stored = await prisma.userProfile.findUnique({ where: { userId: session.userId } });
    expect(stored?.onboardingCompleted).toBe(false);
    expect(stored?.city).toBe("Tunja");
    expect(stored?.neighborhood).toBe("Centro");
  });

  it("sube, reemplaza y elimina la fotografía de perfil", async () => {
    const session = await verifiedSession();
    const uploaded = await api()
      .post("/api/auth/onboarding/photo")
      .set(auth(session.token))
      .attach("image", PNG, { filename: "perfil.png", contentType: "image/png" });

    expect(uploaded.status).toBe(201);
    expect(uploaded.body.data.profile.profileImageType).toBe("PHOTO");
    expect(uploaded.body.data.profile.profileImageUrl).toMatch(/^\/uploads\//);
    expect(uploaded.body.data.profile.profileImagePublicId).toMatch(/^local:/);
    const firstId = uploaded.body.data.profile.profileImagePublicId as string;

    const replaced = await api()
      .post("/api/auth/onboarding/photo")
      .set(auth(session.token))
      .attach("image", PNG, { filename: "perfil-2.png", contentType: "image/png" });
    expect(replaced.status).toBe(201);
    expect(replaced.body.data.profile.profileImagePublicId).not.toBe(firstId);

    const me = await api().get("/api/auth/me").set(auth(session.token));
    expect(me.body.data.user.profile.profileImageUrl).toBe(replaced.body.data.profile.profileImageUrl);

    const removed = await api().delete("/api/auth/onboarding/photo").set(auth(session.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data.profile.profileImageUrl).toBeNull();
    expect(removed.body.data.profile.profileImagePublicId).toBeNull();
    expect(removed.body.data.profile.profileImageType).toBe("AVATAR");
  });

  it("rechaza una imagen con formato no permitido", async () => {
    const session = await verifiedSession();
    const response = await api()
      .post("/api/auth/onboarding/photo")
      .set(auth(session.token))
      .attach("image", Buffer.from("not-an-image"), { filename: "perfil.gif", contentType: "image/gif" });
    expect(response.status).toBe(400);
  });

  it("evita un segundo guardado completo concurrente", async () => {
    const session = await verifiedSession();
    const [first, second] = await Promise.all([
      api().patch("/api/auth/onboarding").set(auth(session.token)).send({ ...completePayload, completed: true }),
      api().patch("/api/auth/onboarding").set(auth(session.token)).send({ ...completePayload, completed: true }),
    ]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);
  });
});
