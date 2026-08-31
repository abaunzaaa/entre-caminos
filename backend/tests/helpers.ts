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
