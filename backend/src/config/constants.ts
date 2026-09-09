export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  DASHBOARD_VIEW: "admin.dashboard.view",
  ADMINS_MANAGE: "admins.manage",
  ROLES_MANAGE: "roles.manage",
  PERMISSIONS_MANAGE: "permissions.manage",
  CATEGORIES_MANAGE: "categories.manage",
  EXPERIENCES_MANAGE: "experiences.manage",
  EXPERIENCES_REVIEW: "experiences.review",
  USERS_VIEW: "users.view",
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSION_MAP: Record<RoleName, PermissionName[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.EXPERIENCES_MANAGE,
    PERMISSIONS.USERS_VIEW,
  ],
  USER: [],
};

export const COOKIE_NAMES = {
  ACCESS: "ec_access",
  REFRESH: "ec_refresh",
} as const;

export const PASSWORD_POLICY =
  "Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_LABEL = "1 hora";
export const PASSWORD_RESET_GENERIC_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Si no encuentras el correo en tu bandeja de entrada, revisa la carpeta de spam o correo no deseado.";

export const EMAIL_VERIFICATION_TTL_MS = 10 * 60 * 1000;
export const EMAIL_VERIFICATION_TTL_LABEL = "10 minutos";
export const EMAIL_UNVERIFIED_LOGIN_MESSAGE = "Debes verificar tu correo antes de iniciar sesión.";

export const MIN_EXPERIENCE_IMAGES = 5;
export const MIN_EXPERIENCE_IMAGES_MESSAGE = "Agrega al menos 5 imágenes para continuar.";
