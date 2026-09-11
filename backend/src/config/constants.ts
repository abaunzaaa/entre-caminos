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
export const EMAIL_INACTIVE_LOGIN_MESSAGE = "Tu cuenta está inactiva. Contacta a soporte.";

export const MIN_EXPERIENCE_IMAGES = 5;
export const MIN_EXPERIENCE_IMAGES_MESSAGE = "Agrega al menos 5 imágenes para continuar.";

export const CONTACT_KINDS = {
  POSIBLE_USUARIO: "POSIBLE_USUARIO",
  ALIADO: "ALIADO",
} as const;

export type ContactKindName = (typeof CONTACT_KINDS)[keyof typeof CONTACT_KINDS];

export const CONTACT_INBOX_EMAIL = "entrecaminos.e@gmail.com";

export const CONTACT_SUBJECTS = {
  POSIBLE_USUARIO: "Nuevo contacto de posible usuario - Entre Caminos",
  ALIADO: "Nueva solicitud de aliado - Entre Caminos",
} as const;

export const CONTACT_KIND_LABELS = {
  POSIBLE_USUARIO: "Posible usuario",
  ALIADO: "Aliado",
} as const;

export const CONTACT_MESSAGE_MAX = 2000;
export const CONTACT_NAME_MAX = 80;
export const CONTACT_COMPANY_MAX = 120;

export const CONTACT_DISCOVER_REASONS = [
  "Quiero conocer más experiencias",
  "Necesito ayuda para elegir un plan",
  "Mi cuenta está inactiva",
  "Tengo una sugerencia",
  "Otro",
] as const;

export const CONTACT_ALLY_TYPES = [
  "Turística",
  "Cultural",
  "Artística",
  "Recreativa",
  "Otra",
] as const;
