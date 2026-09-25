import { describe, expect, it } from "vitest";
import { parseGeminiJson } from "../../src/services/gemini.service.js";

describe("parseGeminiJson", () => {
  it("lee JSON directo", () => {
    const parsed = parseGeminiJson('{"reply":"Hola","intent":"chat"}');
    expect(parsed?.reply).toBe("Hola");
    expect(parsed?.intent).toBe("chat");
  });

  it("lee JSON en bloque markdown", () => {
    const parsed = parseGeminiJson('```json\n{"reply":"Plan listo","experienceIds":["a"]}\n```');
    expect(parsed?.reply).toBe("Plan listo");
    expect(parsed?.experienceIds).toEqual(["a"]);
  });

  it("ignora texto alrededor", () => {
    const parsed = parseGeminiJson('claro {"reply":"ok","status":"need_info"} gracias');
    expect(parsed?.status).toBe("need_info");
  });

  it("devuelve null si no hay JSON", () => {
    expect(parseGeminiJson("sin estructura")).toBeNull();
  });
});
