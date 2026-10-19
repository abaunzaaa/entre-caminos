import { describe, expect, it } from "vitest";
import { hasFaqAnswer, isPubliclyVisibleFaq, resolveFaqPublication, statusAfterUnpublish } from "../../src/services/faq-rules.js";
import { sanitizeMultiline, sanitizePlainText } from "../../src/utils/plain-text.js";

describe("FAQ — visibilidad y texto", () => {
  it("solo es pública una pregunta PUBLISHED con respuesta", () => {
    expect(isPubliclyVisibleFaq("PUBLISHED", "Sí, puedes guardarla en tu perfil.")).toBe(true);
    expect(isPubliclyVisibleFaq("PUBLISHED", "   ")).toBe(false);
    expect(isPubliclyVisibleFaq("PUBLISHED", null)).toBe(false);
    for (const status of ["PENDING", "ANSWERED", "HIDDEN", "DISCARDED"]) {
      expect(isPubliclyVisibleFaq(status, "Respuesta lista")).toBe(false);
    }
  });

  it("publicar sin respuesta se rechaza y despublicar conserva la respuesta como ANSWERED", () => {
    const denied = resolveFaqPublication({ status: "PUBLISHED", answer: null, publishedAt: null });
    expect(denied.ok).toBe(false);
    const published = resolveFaqPublication({
      status: "PUBLISHED",
      answer: "Esta es la respuesta.",
      publishedAt: null,
    });
    expect(published.ok).toBe(true);
    if (published.ok) {
      expect(published.publishedAt).toBeInstanceOf(Date);
    }
    expect(statusAfterUnpublish("Respuesta")).toBe("ANSWERED");
    expect(statusAfterUnpublish("  ")).toBe("PENDING");
    expect(hasFaqAnswer("hola")).toBe(true);
  });

  it("la sanitización quita HTML y espacios vacíos", () => {
    expect(sanitizePlainText("  <b>Hola</b>   camino  ")).toBe("Hola camino");
    expect(sanitizeMultiline("Linea\n\n\n<script>alert(1)</script>  dos")).toBe("Linea\n\nalert(1) dos");
  });
});
