export type RegisterFields = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

export type RegisterFieldErrors = Partial<Record<keyof RegisterFields, string>>;
export type ResetPasswordFieldErrors = Partial<Record<"password" | "confirmPassword", string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_POLICY = "Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.";
export const PASSWORD_HINT =
  "Usa al menos 8 caracteres, con mayúscula, minúscula, número y símbolo. Ejemplo: Caminos#2026";

export function validateEmailFormat(email: string): string | undefined {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return "El correo es obligatorio";
  }
  if (!EMAIL_PATTERN.test(normalized)) {
    return "Correo electrónico inválido";
  }
  return undefined;
}

export function validatePasswordRules(password: string): string | undefined {
  if (!password) {
    return "La contraseña es obligatoria";
  }
  if (password.length < 8) {
    return PASSWORD_POLICY;
  }
  if (!/[A-Z]/.test(password)) {
    return "Debe incluir al menos una mayúscula";
  }
  if (!/[a-z]/.test(password)) {
    return "Debe incluir al menos una minúscula";
  }
  if (!/[0-9]/.test(password)) {
    return "Debe incluir al menos un número";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Debe incluir al menos un símbolo";
  }
  return undefined;
}

export function validateResetPasswordForm(input: {
  password: string;
  confirmPassword: string;
}): ResetPasswordFieldErrors {
  const errors: ResetPasswordFieldErrors = {};
  const passwordError = validatePasswordRules(input.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña";
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  return errors;
}

export function validateRegisterForm(input: RegisterFields): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const name = input.name.trim();
  const emailError = validateEmailFormat(input.email);
  const passwordError = validatePasswordRules(input.password);

  if (!name) {
    errors.name = "El nombre es obligatorio";
  } else if (name.length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres";
  } else if (name.length > 80) {
    errors.name = "El nombre es demasiado largo";
  }

  if (emailError) {
    errors.email = emailError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña";
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  if (!input.termsAccepted) {
    errors.termsAccepted = "Debes aceptar los términos y condiciones";
  }

  return errors;
}
