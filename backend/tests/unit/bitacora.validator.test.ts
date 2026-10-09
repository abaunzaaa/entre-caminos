import { describe, expect, it } from "vitest";
import { saveBitacoraSchema } from "../../src/validators/bitacora.validator.js";

const pageId = "6d5c8a2e-3f4b-4c1a-9e2d-111111111111";
const elementId = "6d5c8a2e-3f4b-4c1a-9e2d-222222222222";

describe("bitácora", () => {
  it("acepta una página con texto, sticker y foto vacía", () => {
    const parsed = saveBitacoraSchema.parse({
      pages: [
        {
          id: pageId,
          background: "cream",
          experienceId: null,
          elements: [
            {
              id: elementId,
              type: "text",
              x: 0.1,
              y: 0.1,
              w: 0.4,
              h: 0.12,
              rotation: -2,
              z: 1,
              props: {
                text: "Toda historia merece ser recordada.",
                font: "caveat",
                size: 0.06,
                color: "#3d4a38",
                weight: 500,
                italic: false,
                align: "left",
                lineHeight: 1.2,
              },
            },
            {
              id: "6d5c8a2e-3f4b-4c1a-9e2d-333333333333",
              type: "sticker",
              x: 0.6,
              y: 0.2,
              w: 0.2,
              h: 0.2,
              rotation: 4,
              z: 2,
              props: { stickerId: "viaje-01" },
            },
            {
              id: "6d5c8a2e-3f4b-4c1a-9e2d-444444444444",
              type: "photo",
              x: 0.2,
              y: 0.4,
              w: 0.4,
              h: 0.45,
              rotation: 0,
              z: 3,
              props: {
                assetId: null,
                url: "",
                frame: "polaroid",
                caption: "",
                cropX: 0,
                cropY: 0,
                cropScale: 1,
              },
            },
          ],
        },
      ],
    });
    expect(parsed.pages).toHaveLength(1);
  });

  it("rechaza un sticker con ruta arbitraria", () => {
    const result = saveBitacoraSchema.safeParse({
      pages: [
        {
          id: pageId,
          background: "cream",
          experienceId: null,
          elements: [
            {
              id: elementId,
              type: "sticker",
              x: 0,
              y: 0,
              w: 0.2,
              h: 0.2,
              rotation: 0,
              z: 1,
              props: { stickerId: "../secret" },
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
