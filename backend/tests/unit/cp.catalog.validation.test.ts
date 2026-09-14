import { describe, expect, it } from "vitest";
import { categorySchema, categoryUpdateSchema } from "../../src/validators/category.validator.js";
import { experienceSchema } from "../../src/validators/experience.validator.js";
import { MIN_EXPERIENCE_IMAGES, MIN_EXPERIENCE_IMAGES_MESSAGE } from "../../src/config/constants.js";

const categoryId = "11111111-1111-4111-8111-111111111111";
const images = Array.from(
  { length: MIN_EXPERIENCE_IMAGES },
  (_, i) => `https://images.example.com/exp-${i + 1}.jpg`,
);

function validExperience(overrides?: Record<string, unknown>) {
  return {
    title: "Taller de cerámica local",
    description: "Descripción suficientemente larga para validar la experiencia.",
    categoryId,
    price: 50000,
    location: "Envigado, Antioquia",
    imageUrl: images[0],
    imageUrls: images,
    ...overrides,
  };
}

describe("Sprint 1 — Categorías y experiencias (sin DB)", () => {
  it("CP-S1-016: categoría válida requiere nombre", () => {
    expect(categorySchema.safeParse({ name: "Gastronomía" }).success).toBe(true);
    expect(categorySchema.safeParse({ name: "A" }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("CP-S1-018: actualización de categoría exige al menos un campo", () => {
    expect(categoryUpdateSchema.safeParse({ name: "Nueva" }).success).toBe(true);
    expect(categoryUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("CP-S1-021: experiencia válida con datos obligatorios pasa", () => {
    const parsed = experienceSchema.safeParse(validExperience());
    expect(parsed.success).toBe(true);
  });

  it("CP-S1-026: rechaza experiencia incompleta o con menos de 5 imágenes", () => {
    expect(experienceSchema.safeParse(validExperience({ title: "ab" })).success).toBe(false);
    expect(experienceSchema.safeParse(validExperience({ description: "corta" })).success).toBe(false);
    expect(experienceSchema.safeParse(validExperience({ price: -1 })).success).toBe(false);
    expect(experienceSchema.safeParse(validExperience({ categoryId: "no-uuid" })).success).toBe(false);

    const fewImages = experienceSchema.safeParse(
      validExperience({ imageUrls: images.slice(0, 2), imageUrl: images[0] }),
    );
    expect(fewImages.success).toBe(false);
    if (!fewImages.success) {
      expect(fewImages.error.issues.some((issue) => issue.message === MIN_EXPERIENCE_IMAGES_MESSAGE)).toBe(true);
    }
  });

  it("CP-S1-023: enlace inválido se rechaza; enlace relativo se normaliza", () => {
    expect(experienceSchema.safeParse(validExperience({ externalUrl: "no es un enlace" })).success).toBe(false);
    const ok = experienceSchema.safeParse(validExperience({ externalUrl: "wa.me/573001112233" }));
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.externalUrl).toBe("https://wa.me/573001112233");
    }
  });
});
