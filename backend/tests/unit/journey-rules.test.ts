import { describe, expect, it } from "vitest";
import { assertMemoryAttendance, clampPercent, isJourneySticker, isJourneyTheme } from "../../src/utils/journey-rules.js";

describe("reglas de Mis caminos", () => {
  it("exige confirmación solo cuando el recuerdo se ata a una experiencia o a un plan", () => {
    expect(assertMemoryAttendance({ experienceId: "exp", attended: false })).toMatch(/Confirma/);
    expect(assertMemoryAttendance({ planId: "plan", attended: false })).toMatch(/Confirma/);
    expect(assertMemoryAttendance({ experienceId: "exp", attended: true })).toBeNull();
    expect(assertMemoryAttendance({ attended: false })).toBeNull();
  });

  it("acepta temas y stickers del planner, no estampitas", () => {
    expect(isJourneyTheme("olive")).toBe(true);
    expect(isJourneyTheme("passport")).toBe(false);
    expect(isJourneySticker("leaf")).toBe(true);
    expect(isJourneySticker("stamp")).toBe(false);
  });

  it("mantiene las decoraciones dentro del tablero", () => {
    expect(clampPercent(-10)).toBe(2);
    expect(clampPercent(140)).toBe(94);
    expect(clampPercent(40)).toBe(40);
  });
});
