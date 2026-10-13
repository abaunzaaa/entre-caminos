import { describe, expect, it } from "vitest";
import { profilePhoneError } from "../../src/utils/profile-phone.js";

describe("profilePhoneError", () => {
  it("acepta vacío porque el teléfono es opcional", () => {
    expect(profilePhoneError("")).toBe("");
    expect(profilePhoneError("   ")).toBe("");
  });

  it("acepta el formato colombiano que ya se guarda", () => {
    expect(profilePhoneError("300 123 4567")).toBe("");
    expect(profilePhoneError("3001234567")).toBe("");
    expect(profilePhoneError("+573001234567")).toBe("");
    expect(profilePhoneError("+57 300 123 4567")).toBe("");
    expect(profilePhoneError("6012345678")).toBe("");
  });

  it("explica la regla colombiana cuando el número no cumple", () => {
    expect(profilePhoneError("12345")).toMatch(/10 dígitos/);
    expect(profilePhoneError("300123")).toMatch(/10 dígitos/);
    expect(profilePhoneError("+57300123")).toMatch(/10 dígitos/);
    expect(profilePhoneError("2001234567")).toMatch(/empiece por 3/);
  });

  it("rechaza letras", () => {
    expect(profilePhoneError("300abc4567")).toMatch(/solo puede contener números/);
  });

  it("acepta otro indicativo con la cantidad de dígitos de ese país", () => {
    expect(profilePhoneError("+34911222333")).toBe("");
    expect(profilePhoneError("+14155552671")).toBe("");
  });

  it("explica cuántos dígitos pide el otro indicativo", () => {
    expect(profilePhoneError("+34911222")).toBe("El número de España debe tener 9 dígitos.");
    expect(profilePhoneError("+551198765432")).toBe("");
    expect(profilePhoneError("+55119876")).toMatch(/Brasil/);
  });

  it("valida según el indicativo, no como número colombiano", () => {
    expect(profilePhoneError("+34612345678")).toBe("");
    expect(profilePhoneError("+14155552671")).toBe("");
    expect(profilePhoneError("+34612")).toBe("El número de España debe tener 9 dígitos.");
    expect(profilePhoneError("+34612")).not.toMatch(/empiece por 3/);
    expect(profilePhoneError("3001234567")).toBe("");
    expect(profilePhoneError("300 123 4567")).toBe("");
  });
});
