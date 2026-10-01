import { describe, expect, it } from "vitest";
import { coerceGuideJson } from "../../src/services/openai.service.js";

describe("coerceGuideJson", () => {
  it("deja pasar un JSON válido", () => {
    const raw = '{"reply":"Hola","intent":"chat","status":"ok"}';
    expect(coerceGuideJson(raw)).toBe(raw);
  });

  it("envuelve texto plano con opciones entre paréntesis", () => {
    const coerced = JSON.parse(
      coerceGuideJson("¿Con quién lo harías? (Solo, En pareja, Con amigos, En familia)"),
    );
    expect(coerced.reply).toBe("¿Con quién lo harías?");
    expect(coerced.intent).toBe("clarify");
    expect(coerced.status).toBe("need_info");
    expect(coerced.suggestions).toEqual(["Solo", "En pareja", "Con amigos", "En familia"]);
  });
});
