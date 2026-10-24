import { describe, expect, it } from "vitest";
import {
  INTERPRETATION_SYSTEM,
  ITINERARY_SYSTEM,
  applySafetyFloor,
  assignCandidateKeys,
  candidateBrief,
  candidateByKey,
  emptyPlanMessage,
  emptyReading,
  explicitNightObligation,
  parseInterpretation,
  pickPublishedStart,
  scheduleFitsRule,
  scheduleRule,
  shortlistCandidates,
  splitByEligibility,
  textLooksSpanish,
  type CatalogFact,
  type PreferenceReading,
} from "../../src/services/planner-generation.js";

function fact(partial: Partial<CatalogFact> & Pick<CatalogFact, "id" | "title">): CatalogFact {
  return {
    description: "",
    category: "Cultura",
    categories: ["Cultura"],
    interests: [],
    environments: [],
    municipality: "Medellín",
    address: "",
    price: 80000,
    currency: "COP",
    durationLabel: "2 h",
    durationMinutes: 120,
    availabilityLabel: "",
    catalogTimes: [],
    ...partial,
  };
}

describe("interpretación y seguridad de la nota", () => {
  it("trata «quiero que sea de noche» como obligación desde las 18:00 aunque Groq lo omita", () => {
    const note = "Quiero que mi plan sea de noche";
    expect(explicitNightObligation(note)).toBe(true);
    const reading = applySafetyFloor(note, emptyReading());
    expect(reading.mandatoryTimeFrom).toBe("18:00");
    expect(INTERPRETATION_SYSTEM).toMatch(/no es una orden/i);
    expect(INTERPRETATION_SYSTEM).toMatch(/español/i);
  });

  it("no obliga la noche si la persona la rechaza", () => {
    expect(explicitNightObligation("No quiero que sea de noche")).toBe(false);
    expect(applySafetyFloor("No quiero que sea de noche", emptyReading()).mandatoryTimeFrom).toBeNull();
  });

  it("no convierte una preferencia flexible en obligación", () => {
    const note = "Preferiría que fuera de noche";
    expect(explicitNightObligation(note)).toBe(false);
    const reading = applySafetyFloor(note, { ...emptyReading(), preferredTimeFrom: "18:00" });
    expect(reading.mandatoryTimeFrom).toBeNull();
    expect(reading.preferredTimeFrom).toBe("18:00");
  });

  it("interpreta juntas noche, poca caminata y un tope de tres horas", () => {
    const note = "Quiero algo romántico, de noche, que dure máximo tres horas y sin caminar mucho";
    const parsed = parseInterpretation({
      summary: "Plan romántico y nocturno",
      wantsRomantic: true,
      wantsCalm: false,
    });
    const reading = applySafetyFloor(note, parsed ?? emptyReading());
    expect(reading.mandatoryTimeFrom).toBe("18:00");
    expect(reading.avoidHeavyWalk).toBe(true);
    expect(reading.mandatoryMaxMinutes).toBe(180);
    expect(reading.wantsRomantic).toBe(true);
  });

  it("con la nota vacía no inventa restricciones", () => {
    const reading = applySafetyFloor("", emptyReading());
    expect(scheduleRule(reading).mandatory).toBe(false);
    expect(reading.avoidHeavyWalk).toBe(false);
    expect(reading.mandatoryMaxMinutes).toBeNull();
  });
});

describe("candidatas para que Groq elija", () => {
  const morning = fact({
    id: "11111111-1111-4111-8111-111111111111",
    title: "Senderismo en Parque Arví",
    description: "Caminata exigente de ascenso por el sendero",
    category: "Naturaleza",
    categories: ["Naturaleza"],
    interests: ["Naturaleza"],
    catalogTimes: ["08:00"],
    durationMinutes: 240,
  });
  const candle = fact({
    id: "22222222-2222-4222-8222-222222222222",
    title: "Candlelight",
    description: "Concierto a la luz de las velas",
    category: "Cultura",
    interests: ["Cultura"],
    catalogTimes: ["19:00"],
    durationMinutes: 90,
  });
  const kitchen = fact({
    id: "33333333-3333-4333-8333-333333333333",
    title: "Taller gastronómico",
    description: "Cocina en grupo, sin recorrido largo",
    category: "Gastronomía",
    categories: ["Gastronomía"],
    interests: ["Gastronomía"],
    catalogTimes: ["18:30"],
    durationMinutes: 150,
  });
  const unknown = fact({
    id: "44444444-4444-4444-8444-444444444444",
    title: "Paseo sin horario",
    description: "Recorrido tranquilo",
    catalogTimes: [],
  });

  it("de noche no deja pasar las 08:00 ni un horario desconocido, y conserva más de una opción", () => {
    const reading = applySafetyFloor("Quiero que sea de noche", emptyReading());
    const split = splitByEligibility([morning, candle, kitchen, unknown], reading);
    expect(split.eligible.map((item) => item.title)).toEqual(["Candlelight", "Taller gastronómico"]);
    expect(split.blocked.map((item) => item.reason)).toEqual(["hours", "unknown-hours"]);
    const rule = scheduleRule(reading);
    expect(pickPublishedStart(["08:00", "19:00"], rule)).toBe("19:00");
    expect(scheduleFitsRule("08:00", rule)).toBe(false);
    expect(scheduleFitsRule("19:00", rule)).toBe(true);
    expect(scheduleFitsRule("18:30", rule)).toBe(true);
    const message = emptyPlanMessage(reading, [{ title: morning.title, reason: "hours" }]);
    expect(message).toMatch(/No encontramos una experiencia nocturna/);
    expect(message).toMatch(/Senderismo en Parque Arví/);
    expect(message).toMatch(/no cumple/);
  });

  it("sin experiencias compatibles no inventa una candidata", () => {
    const reading = applySafetyFloor("Quiero que sea de noche", emptyReading());
    const split = splitByEligibility([morning, unknown], reading);
    expect(split.eligible).toEqual([]);
    expect(emptyPlanMessage(reading, split.blocked.map((item) => ({ title: item.item.title, reason: item.reason })))).toMatch(/nocturna/);
  });

  it("«no quiero caminar mucho» aparta la caminata exigente y deja las opciones tranquilas para que Groq compare", () => {
    const cafe = fact({
      id: "55555555-5555-4555-8555-555555555555",
      title: "Cata de café",
      description: "Prueba tranquila en un taller",
      interests: ["Café"],
      catalogTimes: ["16:00"],
    });
    const reading = applySafetyFloor("No quiero caminar mucho y prefiero un plan tranquilo", {
      ...emptyReading(),
      wantsCalm: true,
      summary: "Plan tranquilo y sin caminata exigente",
    });
    const split = splitByEligibility([morning, cafe, candle], reading);
    expect(split.eligible.map((item) => item.id)).toEqual([cafe.id, candle.id]);
    expect(split.blocked).toEqual([{ item: morning, reason: "walk" }]);
    expect(shortlistCandidates(split.eligible).length).toBe(2);
  });

  it("gastronomía no reduce el catálogo a una sola ficha antes de Groq", () => {
    const reading: PreferenceReading = { ...emptyReading(), wantsFood: true, wantsDifferent: true, summary: "Quiere comer algo distinto" };
    const split = splitByEligibility([morning, kitchen, candle], reading);
    expect(split.eligible.map((item) => item.title)).toContain("Taller gastronómico");
    expect(split.eligible.length).toBeGreaterThan(1);
  });

  it("varias condiciones juntas descartan la caminata larga de la mañana", () => {
    const reading = applySafetyFloor("Quiero algo romántico, de noche, que dure máximo tres horas y sin caminar mucho", {
      ...emptyReading(),
      wantsRomantic: true,
    });
    const midday = fact({
      id: "66666666-6666-4666-8666-666666666666",
      title: "Concierto de mediodía",
      description: "Función corta en sala",
      catalogTimes: ["11:00"],
      durationMinutes: 60,
    });
    const split = splitByEligibility([morning, candle, kitchen, midday], reading);
    expect(split.eligible.map((item) => item.title)).toEqual(["Candlelight", "Taller gastronómico"]);
    expect(split.blocked.map((item) => item.reason)).toEqual(["duration", "hours"]);
  });

  it("sin nota sigue admitiendo un plan de mañana", () => {
    const split = splitByEligibility([morning, candle], applySafetyFloor("", emptyReading()));
    expect(split.eligible.map((item) => item.title)).toEqual([morning.title, candle.title]);
    expect(pickPublishedStart(morning.catalogTimes, scheduleRule(emptyReading()))).toBe("08:00");
  });

  it("la clave temporal no filtra el UUID y rechaza un identificador inventado", () => {
    const { keyed, byKey } = assignCandidateKeys([candle, kitchen]);
    expect(keyed.map((item) => item.key)).toEqual(["EXP_1", "EXP_2"]);
    expect(candidateByKey("EXP_2", byKey)?.id).toBe(kitchen.id);
    expect(candidateByKey(kitchen.id, byKey)).toBeNull();
    expect(candidateByKey("EXP_9", byKey)).toBeNull();
    const brief = candidateBrief("EXP_1", candle);
    expect(JSON.stringify(brief)).not.toContain(candle.id);
    expect(brief.clave).toBe("EXP_1");
    expect(brief.horariosPublicados).toEqual(["19:00"]);
    expect(brief).not.toHaveProperty("imageUrl");
  });
});

describe("español visible", () => {
  it("acepta el relato en español y rechaza uno en inglés", () => {
    expect(textLooksSpanish("Llegada al lugar y concierto de noche.")).toBe(true);
    expect(textLooksSpanish("Candlelight")).toBe(true);
    expect(textLooksSpanish("Enjoy the morning walk and discover this experience around the park with your guide.")).toBe(false);
    expect(ITINERARY_SYSTEM).toMatch(/solo en español/i);
    expect(ITINERARY_SYSTEM).toMatch(/selectedCandidateKey/);
  });
});
