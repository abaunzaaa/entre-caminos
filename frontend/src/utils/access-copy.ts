import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Globe,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  Tags,
  UserRound,
  Users,
} from "lucide-react";
import type { Permission, Role } from "../types";

export type AccessGroup = "usuarios" | "catalogo" | "experiencias" | "configuracion" | "seguridad";

export type PermissionCopy = {
  title: string;
  description: string;
  capability: string;
  group: AccessGroup;
  icon: LucideIcon;
};

export type RoleCopy = {
  title: string;
  description: string;
  icon: LucideIcon;
  canLabel: string;
};

export const CRITICAL_PERMISSIONS = new Set(["admins.manage", "roles.manage"]);

const PERMISSION_COPY: Record<string, PermissionCopy> = {
  "admin.dashboard.view": {
    title: "Acceso al panel administrativo",
    description: "Permite ingresar al panel de administración.",
    capability: "Panel administrativo",
    group: "configuracion",
    icon: LayoutDashboard,
  },
  "admins.manage": {
    title: "Gestionar usuarios administrativos",
    description: "Permite crear, editar y administrar accesos del equipo.",
    capability: "Usuarios administrativos",
    group: "usuarios",
    icon: Users,
  },
  "roles.manage": {
    title: "Gestionar roles y permisos",
    description: "Permite definir qué puede hacer cada tipo de usuario.",
    capability: "Roles y permisos",
    group: "seguridad",
    icon: Shield,
  },
  "permissions.manage": {
    title: "Configuración general",
    description: "Permite administrar la configuración avanzada de accesos.",
    capability: "Configuración general",
    group: "configuracion",
    icon: Settings,
  },
  "categories.manage": {
    title: "Gestionar categorías",
    description: "Permite organizar las categorías disponibles.",
    capability: "Categorías",
    group: "catalogo",
    icon: Tags,
  },
  "experiences.manage": {
    title: "Gestionar experiencias",
    description: "Permite crear, editar y administrar experiencias.",
    capability: "Experiencias",
    group: "experiencias",
    icon: Compass,
  },
  "users.view": {
    title: "Consultar usuarios",
    description: "Permite ver información de las personas registradas.",
    capability: "Consulta de usuarios",
    group: "usuarios",
    icon: Users,
  },
  "audit.view": {
    title: "Ver registro de actividad",
    description: "Permite consultar el historial de acciones del panel.",
    capability: "Registro de actividad",
    group: "seguridad",
    icon: ScrollText,
  },
};

const FALLBACK_PERMISSION: PermissionCopy = {
  title: "Permiso adicional",
  description: "Este permiso forma parte de la configuración del sistema.",
  capability: "Configuración adicional",
  group: "configuracion",
  icon: Settings,
};

const ROLE_COPY: Record<string, RoleCopy> = {
  SUPER_ADMIN: {
    title: "Super administrador",
    description: "Acceso completo a la plataforma.",
    icon: Shield,
    canLabel: "Puede gestionar",
  },
  ADMIN: {
    title: "Administrador",
    description: "Gestión operativa del catálogo.",
    icon: LayoutDashboard,
    canLabel: "Puede gestionar",
  },
  USER: {
    title: "Usuario explorador",
    description: "Usuario registrado de Entre Caminos.",
    icon: Compass,
    canLabel: "Puede",
  },
};

const FALLBACK_ROLE: RoleCopy = {
  title: "Rol personalizado",
  description: "Rol adicional definido en la plataforma.",
  icon: Settings,
  canLabel: "Puede gestionar",
};

export const EXPLORER_CAPABILITIES: PermissionCopy[] = [
  {
    title: "Explorar experiencias",
    description: "Permite descubrir y consultar experiencias publicadas.",
    capability: "Explorar experiencias",
    group: "experiencias",
    icon: Compass,
  },
  {
    title: "Gestionar perfil",
    description: "Permite administrar los datos de la cuenta personal.",
    capability: "Gestionar perfil",
    group: "usuarios",
    icon: UserRound,
  },
  {
    title: "Usar funcionalidades públicas",
    description: "Permite utilizar las funciones abiertas de Entre Caminos.",
    capability: "Usar funcionalidades públicas",
    group: "catalogo",
    icon: Globe,
  },
];

const ROLE_ORDER = ["SUPER_ADMIN", "ADMIN", "USER"];
const PERMISSION_ORDER = Object.keys(PERMISSION_COPY);

export function roleCopy(name: string): RoleCopy {
  return ROLE_COPY[name] ?? { ...FALLBACK_ROLE, title: name };
}

export function permissionCopy(name: string): PermissionCopy {
  return PERMISSION_COPY[name] ?? FALLBACK_PERMISSION;
}

export function isExplorerRole(name: string) {
  return name === "USER";
}

export function sortRoles(roles: Role[]) {
  return [...roles].sort((left, right) => {
    const leftIndex = ROLE_ORDER.indexOf(left.name);
    const rightIndex = ROLE_ORDER.indexOf(right.name);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });
}

export function peopleLabel(count: number) {
  return count === 1 ? "1 persona" : `${count} personas`;
}

export function sortPermissions(permissions: Permission[]) {
  return [...permissions].sort((left, right) => {
    const leftIndex = PERMISSION_ORDER.indexOf(left.name);
    const rightIndex = PERMISSION_ORDER.indexOf(right.name);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });
}

export function roleCapabilities(role: Role) {
  if (isExplorerRole(role.name)) {
    return EXPLORER_CAPABILITIES;
  }
  return [...role.permissions]
    .sort((left, right) => {
      const leftIndex = PERMISSION_ORDER.indexOf(left.permission.name);
      const rightIndex = PERMISSION_ORDER.indexOf(right.permission.name);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    })
    .map((item) => permissionCopy(item.permission.name));
}

export function permissionNameById(permissions: Permission[], permissionId: string) {
  return permissions.find((item) => item.id === permissionId)?.name ?? "";
}
