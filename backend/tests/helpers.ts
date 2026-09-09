import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/database/prisma.js";

export const app = createApp();
export const api = () => request(app);

export const adminCredentials = {
  email: process.env.SEED_ADMIN_EMAIL ?? "angie.diaz@entrecaminos.com",
  password: process.env.SEED_ADMIN_PASSWORD ?? "TestAdmin#2026",
};

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@entrecaminos.test`;
}

export async function loginAs(email: string, password: string) {
  const response = await api().post("/api/auth/login").send({ email, password });
  return response;
}

export async function loginAsAdmin() {
  return loginAs(adminCredentials.email, adminCredentials.password);
}

export async function createAndLoginStaffAdmin(overrides?: { name?: string; email?: string; password?: string }) {
  const superToken = (await loginAsAdmin()).body.data.accessToken as string;
  const email = overrides?.email ?? uniqueEmail("admin");
  const password = overrides?.password ?? "Admin#2026x";
  const created = await api()
    .post("/api/admin/administrators")
    .set("Authorization", `Bearer ${superToken}`)
    .send({
      name: overrides?.name ?? "Admin Prueba",
      email,
      password,
      role: "ADMIN",
    });
  const login = await loginAs(email, password);
  return {
    superToken,
    adminToken: login.body.data.accessToken as string,
    email,
    created,
    login,
  };
}

export async function registerUser(overrides?: { email?: string; password?: string; name?: string }) {
  const payload = {
    name: overrides?.name ?? "Camila Viajera",
    email: overrides?.email ?? uniqueEmail(),
    password: overrides?.password ?? "Caminos#2026",
    confirmPassword: overrides?.password ?? "Caminos#2026",
    termsAccepted: true,
  };

  const response = await api().post("/api/auth/register").send(payload);
  return { response, payload };
}

export { prisma };

export const SAMPLE_EXPERIENCE_IMAGE =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80";

export function sampleExperienceImages(count = 5) {
  return Array.from({ length: count }, (_, index) => `${SAMPLE_EXPERIENCE_IMAGE}&n=${index + 1}`);
}
