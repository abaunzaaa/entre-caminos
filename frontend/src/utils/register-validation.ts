export type RegisterFields = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

export type RegisterFieldErrors = Partial<Record<keyof RegisterFields, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_POLICY = "Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.";

export function validateRegisterForm(input: RegisterFields): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) {
    errors.name = "El nombre es obligatorio";
  } else if (name.length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres";
  } else if (name.length > 80) {
    errors.name = "El nombre es demasiado largo";
  }

  if (!email) {
    errors.email = "El correo es obligatorio";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Correo electrónico inválido";
  }

  if (!input.password) {
    errors.password = "La contraseña es obligatoria";
  } else if (input.password.length < 8) {
    errors.password = PASSWORD_POLICY;
  } else if (!/[A-Z]/.test(input.password)) {
    errors.password = "Debe incluir al menos una mayúscula";
  } else if (!/[a-z]/.test(input.password)) {
    errors.password = "Debe incluir al menos una minúscula";
  } else if (!/[0-9]/.test(input.password)) {
    errors.password = "Debe incluir al menos un número";
  } else if (!/[^A-Za-z0-9]/.test(input.password)) {
    errors.password = "Debe incluir al menos un símbolo";
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
