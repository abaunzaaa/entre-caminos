import { describe, expect, it } from "vitest";
import { experiencePublicPath, experiencePublicUrl } from "./share-experience";

describe("experiencePublicUrl", () => {
  it("apunta al detalle público de esa experiencia", () => {
    expect(experiencePublicPath("abc-123")).toBe("/explorar/abc-123");
    expect(experiencePublicUrl("abc-123")).toBe(`${window.location.origin}/explorar/abc-123`);
  });
});
