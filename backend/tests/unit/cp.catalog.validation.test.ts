import { describe, expect, it } from "vitest";
import { toPublicValidationDetails } from "../../src/middleware/validate.middleware.js";
import { categorySchema, categoryUpdateSchema } from "../../src/validators/category.validator.js";
import { experienceSchema, experienceUpdateSchema } from "../../src/validators/experience.validator.js";
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
    companyContact: "WhatsApp 300 111 2233",
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

  it("exige el contacto de la empresa al crear y lo permite ausente en una actualización parcial", () => {
    expect(experienceSchema.safeParse(validExperience({ companyContact: "   " })).success).toBe(false);
    expect(experienceSchema.safeParse(validExperience({ companyContact: "ab" })).success).toBe(false);
    expect(experienceUpdateSchema.safeParse({ title: "Taller de cerámica local actualizado" }).success).toBe(true);
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

  it("acepta de 1 a 3 categorías y rechaza una cuarta", () => {
    const second = "22222222-2222-4222-8222-222222222222";
    const third = "33333333-3333-4333-8333-333333333333";
    const fourth = "44444444-4444-4444-8444-444444444444";
    expect(experienceSchema.safeParse(validExperience({ categoryIds: [categoryId] })).success).toBe(true);
    expect(experienceSchema.safeParse(validExperience({ categoryIds: [categoryId, second] })).success).toBe(true);
    expect(experienceSchema.safeParse(validExperience({ categoryIds: [categoryId, second, third] })).success).toBe(true);
    expect(experienceSchema.safeParse(validExperience({ categoryIds: [categoryId, second, third, fourth] })).success).toBe(
      false,
    );
    expect(experienceSchema.safeParse(validExperience({ categoryIds: [] })).success).toBe(false);
  });

  it("disponibilidad acepta un horario, varios horarios y registros sin times", () => {
    const one = experienceSchema.safeParse(
      validExperience({
        availability: { type: "WEEKDAYS", days: ["Martes", "Jueves"], times: ["14:45"] },
      }),
    );
    expect(one.success).toBe(true);
    if (one.success) {
      expect(one.data.availability).toEqual({
        type: "WEEKDAYS",
        days: ["Martes", "Jueves"],
        times: ["14:45"],
      });
    }

    const many = experienceSchema.safeParse(
      validExperience({
        availability: { type: "EVERY_DAY", times: ["19:00", "14:00", "07:25"] },
      }),
    );
    expect(many.success).toBe(true);
    if (many.success) {
      expect(many.data.availability).toEqual({
        type: "EVERY_DAY",
        times: ["19:00", "14:00", "07:25"],
      });
    }

    const legacy = experienceSchema.safeParse(
      validExperience({
        availability: { type: "DATES", dates: ["2026-10-12", "2026-10-19"] },
      }),
    );
    expect(legacy.success).toBe(true);
    if (legacy.success) {
      expect(legacy.data.availability).toEqual({
        type: "DATES",
        dates: ["2026-10-12", "2026-10-19"],
      });
    }

    const comingSoon = experienceSchema.safeParse(
      validExperience({
        availability: { type: "COMING_SOON" },
      }),
    );
    expect(comingSoon.success).toBe(true);
    if (comingSoon.success) {
      expect(comingSoon.data.availability).toEqual({ type: "COMING_SOON" });
      expect(comingSoon.data.availability).not.toHaveProperty("dates");
      expect(comingSoon.data.availability).not.toHaveProperty("days");
      expect(comingSoon.data.availability).not.toHaveProperty("times");
    }

    const staleDates = experienceUpdateSchema.safeParse({
      availability: { type: "COMING_SOON", dates: ["2026-10-10", "2026-10-15"], times: ["14:45"] },
    });
    expect(staleDates.success).toBe(false);

    const cleared = experienceUpdateSchema.safeParse({
      availability: { type: "COMING_SOON", dates: [], days: [], times: [] },
    });
    expect(cleared.success).toBe(true);
    if (cleared.success) {
      expect(cleared.data.availability).toEqual({ type: "COMING_SOON" });
    }

    const datesToWeekdays = experienceUpdateSchema.safeParse({
      availability: { type: "WEEKDAYS", days: ["Lunes"], times: ["09:00"] },
    });
    expect(datesToWeekdays.success).toBe(true);
    if (datesToWeekdays.success) {
      expect(datesToWeekdays.data.availability).toEqual({
        type: "WEEKDAYS",
        days: ["Lunes"],
        times: ["09:00"],
      });
      expect(datesToWeekdays.data.availability).not.toHaveProperty("dates");
    }

    const weekdaysWithDates = experienceUpdateSchema.safeParse({
      availability: { type: "WEEKDAYS", days: ["Lunes"], dates: ["2026-10-10"] },
    });
    expect(weekdaysWithDates.success).toBe(false);

    const datesWithDays = experienceUpdateSchema.safeParse({
      availability: { type: "DATES", dates: ["2026-10-10"], days: ["Lunes"] },
    });
    expect(datesWithDays.success).toBe(false);

    expect(
      experienceSchema.safeParse(
        validExperience({
          availability: { type: "WEEKDAYS", days: ["Lunes"], times: ["14:00", "14:00"] },
        }),
      ).success,
    ).toBe(false);

    const invalidType = experienceSchema.safeParse(
      validExperience({
        availability: { type: "OTRO" },
      }),
    );
    expect(invalidType.success).toBe(false);
    if (!invalidType.success) {
      expect(toPublicValidationDetails(invalidType.error.issues)[0]?.message).toBe(
        "Revisa la disponibilidad seleccionada.",
      );
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
