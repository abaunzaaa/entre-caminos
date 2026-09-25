import { describe, expect, it } from "vitest";
import { titleFromText } from "./guide-storage";

describe("titleFromText", () => {
  it("usa el texto corto", () => {
    expect(titleFromText("Plan naturaleza")).toBe("Plan naturaleza");
  });

  it("recorta textos largos", () => {
    const title = titleFromText("Quiero un plan largo de aventura en Medellín para el fin de semana con amigos");
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(44);
  });
});
