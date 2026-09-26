import { describe, expect, it } from "vitest";
import { conversationTitleFromText, isPlaceholderTitle } from "../../src/services/conversation.service.js";

describe("conversationTitleFromText", () => {
  it("guarda un plan por ciudad", () => {
    expect(conversationTitleFromText("Quiero un plan romántico en Medellín")).toBe("Plan romántico Medellín");
    expect(conversationTitleFromText("Créame un plan para este sábado")).toBe("Plan para este sábado");
  });

  it("nombra experiencias por lugar", () => {
    expect(conversationTitleFromText("Quiero conocer lugares culturales en Medellín")).toBe(
      "Experiencias culturales Medellín",
    );
    expect(conversationTitleFromText("Qué puedo hacer en Guatapé")).toBe("Experiencias en Guatapé");
  });

  it("rechaza títulos de fecha u hora", () => {
    expect(isPlaceholderTitle("Hoy")).toBe(true);
    expect(isPlaceholderTitle("Ayer")).toBe(true);
    expect(isPlaceholderTitle("12:14 a. m.")).toBe(true);
    expect(conversationTitleFromText("Hoy")).toBe("Nueva conversación");
    expect(conversationTitleFromText("hola")).toBe("Hola");
  });
});
