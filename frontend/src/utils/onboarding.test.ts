import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR_CONFIG, canonicalizeInterest, parseAvatarConfig } from "../data/onboarding";
import {
  applyCountryChange,
  applyDepartmentChange,
  countPrimaryInterests,
  emptyOnboardingForm,
  getOnboardingResumeStep,
  needsOnboarding,
  toggleMulti,
  toggleSingle,
  uniqueCanonical,
} from "./onboarding";

describe("onboarding helpers", () => {
  it("limpia departamento y ciudad al cambiar el país", () => {
    const form = applyCountryChange(
      { ...emptyOnboardingForm(), department: "Antioquia", city: "Medellín", neighborhood: "Laureles" },
      "Colombia",
    );
    expect(form.department).toBe("");
    expect(form.city).toBe("");
    expect(form.neighborhood).toBe("Laureles");
  });

  it("actualiza municipios al cambiar el departamento", () => {
    const form = applyDepartmentChange(
      { ...emptyOnboardingForm(), department: "Antioquia", city: "Medellín" },
      "Boyacá",
    );
    expect(form.department).toBe("Boyacá");
    expect(form.city).toBe("");
  });

  it("conserva la ciudad si sigue siendo válida", () => {
    const form = applyDepartmentChange(
      { ...emptyOnboardingForm(), department: "Antioquia", city: "Medellín" },
      "Antioquia",
    );
    expect(form.city).toBe("Medellín");
  });

  it("mapea intereses duplicados y respeta el máximo", () => {
    expect(canonicalizeInterest("Comida")).toBe("Gastronomía");
    expect(uniqueCanonical(["Comida", "Gastronomía", "Naturaleza"])).toEqual(["Gastronomía", "Naturaleza"]);
    const limited = toggleMulti(["Naturaleza", "Gastronomía", "Cultura", "Aventura", "Relajación"], "Bienestar", 5);
    expect(limited.limited).toBe(true);
    expect(limited.next).toHaveLength(5);
    expect(countPrimaryInterests(["Naturaleza", "Naturaleza", "Cultura"])).toBe(2);
  });

  it("reconstruye el avatar con la configuración guardada", () => {
    const stored = parseAvatarConfig({
      version: 1,
      skinTone: "cocoa",
      face: "round",
      hairStyle: "bun",
      hairColor: "gold",
      outfit: "jacket",
      outfitColor: "sage",
      accessory: "earring",
      glasses: "thin",
    });
    expect(stored).toMatchObject({
      skinTone: "cocoa",
      hairStyle: "bun",
      glasses: "thin",
    });
    expect(parseAvatarConfig({ hairStyle: "no-existe" }).hairStyle).toBe(DEFAULT_AVATAR_CONFIG.hairStyle);
  });

  it("reanuda el paso correcto y exige onboarding solo a usuarios nuevos", () => {
    const empty = emptyOnboardingForm();
    expect(getOnboardingResumeStep(empty)).toBe(1);
    expect(getOnboardingResumeStep({ ...empty, department: "Antioquia", city: "Medellín" })).toBe(2);
    expect(
      getOnboardingResumeStep({
        ...empty,
        department: "Antioquia",
        city: "Medellín",
        interests: ["Naturaleza", "Cultura", "Aventura"],
      }),
    ).toBe(4);
    expect(
      needsOnboarding({
        id: "1",
        name: "Camila",
        email: "camila@test.com",
        emailVerified: true,
        status: "ACTIVE",
        role: "USER",
        createdAt: "",
        profile: { onboardingCompleted: false } as never,
      }),
    ).toBe(true);
    expect(
      needsOnboarding({
        id: "2",
        name: "Admin",
        email: "admin@test.com",
        emailVerified: true,
        status: "ACTIVE",
        role: "USER",
        createdAt: "",
        profile: null,
      }),
    ).toBe(false);
  });

  it("permite una sola opción en presupuesto", () => {
    expect(toggleSingle(["Moderado"], "Lujo")).toEqual(["Lujo"]);
    expect(toggleSingle(["Lujo"], "Lujo")).toEqual([]);
  });
});
