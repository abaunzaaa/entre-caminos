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
