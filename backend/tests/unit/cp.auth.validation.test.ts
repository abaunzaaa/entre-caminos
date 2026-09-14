import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../../src/validators/auth.validator.js";

const validPassword = "Caminos#2026";

function validRegister(overrides?: Record<string, unknown>) {
  return {
    name: "Andrés Camino",
    email: "andres.camino@entrecaminos.test",
    password: validPassword,
    confirmPassword: validPassword,
    termsAccepted: true as const,
    ...overrides,
  };
}

describe("Sprint 1 — Auth validación (sin DB)", () => {
  it("CP-S1-001: registro con datos válidos pasa la validación", () => {
    const parsed = registerSchema.safeParse(validRegister());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("andres.camino@entrecaminos.test");
    }
  });

  it("CP-S1-002: rechaza campos obligatorios vacíos o inválidos", () => {
    expect(registerSchema.safeParse(validRegister({ name: "" })).success).toBe(false);
    expect(registerSchema.safeParse(validRegister({ email: "no-es-correo" })).success).toBe(false);
    expect(registerSchema.safeParse(validRegister({ confirmPassword: "" })).success).toBe(false);
    expect(registerSchema.safeParse(validRegister({ termsAccepted: false })).success).toBe(false);
    expect(registerSchema.safeParse(validRegister({ confirmPassword: "OtraClave#1" })).success).toBe(false);
  });

  it("CP-S1-004: rechaza contraseñas que no cumplen la política", () => {
    expect(registerSchema.safeParse(validRegister({ password: "123456", confirmPassword: "123456" })).success).toBe(
      false,
    );
    expect(registerSchema.safeParse(validRegister({ password: "sinmayuscula1!", confirmPassword: "sinmayuscula1!" })).success).toBe(
      false,
    );
    expect(registerSchema.safeParse(validRegister({ password: "SINMINUSCULA1!", confirmPassword: "SINMINUSCULA1!" })).success).toBe(
      false,
    );
    expect(registerSchema.safeParse(validRegister({ password: "SinNumero!", confirmPassword: "SinNumero!" })).success).toBe(false);
    expect(registerSchema.safeParse(validRegister({ password: "SinSimbolo1", confirmPassword: "SinSimbolo1" })).success).toBe(false);
  });

  it("CP-S1-005/006: login exige correo válido y contraseña no vacía", () => {
    expect(loginSchema.safeParse({ email: "ok@entrecaminos.test", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "malo", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "ok@entrecaminos.test", password: "" }).success).toBe(false);
  });

  it("CP-S1-009: recuperación exige correo válido y reset con token + contraseña fuerte", () => {
    expect(forgotPasswordSchema.safeParse({ email: "ok@entrecaminos.test" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "malo" }).success).toBe(false);

    expect(
      resetPasswordSchema.safeParse({
        token: "a".repeat(40),
        password: validPassword,
        confirmPassword: validPassword,
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        token: "corto",
        password: validPassword,
        confirmPassword: validPassword,
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        token: "a".repeat(40),
        password: "123456",
        confirmPassword: "123456",
      }).success,
    ).toBe(false);
  });
});
