import { describe, expect, it } from "vitest";
import { chronologicalMessages, titleFromText, userChoiceChips } from "./guide-storage";

describe("titleFromText", () => {
  it("usa el texto corto", () => {
    expect(titleFromText("Plan naturaleza")).toBe("Plan naturaleza");
  });

  it("genera título desde crear un plan", () => {
    expect(titleFromText("Créame un plan para este sábado")).toBe("Plan para este sábado");
  });

  it("nombra planes e itinerarios de ciudad", () => {
    expect(titleFromText("Quiero un plan de naturaleza")).toBe("Plan de naturaleza");
    expect(titleFromText("Busca experiencias culturales en Medellín")).toBe("Experiencias culturales Medellín");
    expect(titleFromText("Quiero un plan romántico en Medellín")).toBe("Plan romántico Medellín");
    expect(titleFromText("Quiero conocer lugares culturales en Medellín")).toBe("Experiencias culturales Medellín");
    expect(titleFromText("Qué puedo hacer en Guatapé")).toBe("Experiencias en Guatapé");
  });

  it("usa el saludo como nombre y no fechas", () => {
    expect(titleFromText("hola")).toBe("Hola");
    expect(titleFromText("Hoy")).toBe("Nueva conversación");
  });

  it("recorta textos largos", () => {
    const title = titleFromText("Quiero un plan largo de aventura en Medellín para el fin de semana con amigos");
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(44);
  });
});

describe("userChoiceChips", () => {
  it("no repite la pregunta de la IA", () => {
    const question = "¿Qué tipo de experiencia te gustaría explorar?";
    expect(userChoiceChips(question, [question])).toEqual([
      "Cultura",
      "Naturaleza",
      "Aventura",
      "Gastronomía",
    ]);
  });

  it("deja atajos cortos del usuario", () => {
    expect(userChoiceChips("¿Usamos tu ubicación?", ["Usa mi ubicación", "Medellín"])).toEqual([
      "Usa mi ubicación",
      "Medellín",
    ]);
  });

  it("no sugiere categorías cuando pregunta el día", () => {
    expect(
      userChoiceChips("¿En qué día te gustaría disfrutar de la experiencia cultural?", ["Cultura", "Naturaleza"]),
    ).toEqual(["Hoy", "Mañana", "Este fin de semana"]);
  });
});

describe("chronologicalMessages", () => {
  it("quita el eco local cuando el servidor ya trajo el mismo mensaje", () => {
    const list = chronologicalMessages([
      { id: "local_1", role: "user", content: "Hola", createdAt: "2026-09-26T00:00:00.000Z" },
      { id: "srv_1", role: "user", content: "Hola", createdAt: "2026-09-26T00:00:01.000Z" },
      { id: "srv_2", role: "assistant", content: "¡Hola!", createdAt: "2026-09-26T00:00:02.000Z" },
    ]);
    expect(list.map((item) => item.id)).toEqual(["srv_1", "srv_2"]);
  });
});
