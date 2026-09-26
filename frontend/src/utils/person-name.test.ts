import { describe, expect, it } from "vitest";
import { formatPersonName } from "./person-name";

describe("formatPersonName", () => {
  it("pone mayúscula inicial en cada palabra", () => {
    expect(formatPersonName("natalia florez")).toBe("Natalia Florez");
    expect(formatPersonName("NATALIA FLOREZ")).toBe("Natalia Florez");
    expect(formatPersonName("nAtAlIa fLoReZ")).toBe("Natalia Florez");
  });
});
