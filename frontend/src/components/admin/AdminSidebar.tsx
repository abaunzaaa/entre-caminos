import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Compass,
  LayoutDashboard,
  Menu,
  Shield,
  Tags,
  Users,
  ExternalLink,
  UserRoundPen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../utils/cn";

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: string | null;
  end?: boolean;
  match?: string[];
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    to: "/admin",
    label: "Inicio",
    icon: LayoutDashboard,
    permission: null,
    end: true,
  },
  {
    to: "/admin/perfil",
    label: "Editar perfil",
    icon: UserRoundPen,
    permission: null,
    match: ["/admin/perfil", "/admin/profile"],
  },
  {
    to: "/admin/administradores",
    label: "Administradores",
    icon: Users,
    permission: "admin.dashboard.view",
    match: ["/admin/administradores", "/admin/administrators"],
  },
  {
    to: "/admin/roles",
    label: "Accesos",
    icon: Shield,
    permission: "roles.manage",
    match: ["/admin/roles", "/admin/permissions"],
  },
  {
    to: "/admin/categorias",
    label: "Categorías",
    icon: Tags,
    permission: "categories.manage",
    match: ["/admin/categorias", "/admin/categories"],
  },
  {
    to: "/admin/experiencias",
    label: "Experiencias",
    icon: Compass,
    permission: "experiences.manage",
    match: ["/admin/experiencias", "/admin/experiences"],
  },
];

function pathMatches(pathname: string, item: AdminNavItem) {
  if (item.end) {
    return pathname === item.to;
  }
  const prefixes = item.match ?? [item.to];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function NavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const Icon = item.icon;
  const active = pathMatches(location.pathname, item);

  return (
    <NavLink
      to={item.to}
      end={item.end}
      data-label={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn("admin-nav-item", active && "is-active")}
      title={collapsed ? item.label : undefined}
    >
      <span className="admin-nav-item__icon">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="admin-nav-item__label">{item.label}</span>
    </NavLink>
  );
}

export function AdminSidebar({
  collapsed,
  mobileOpen,
  items,
  onToggle,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  items: AdminNavItem[];
  onToggle: () => void;
  onCloseMobile: () => void;
}) {
  return (
    <aside
      className={cn("admin-sidebar", collapsed && "is-collapsed", mobileOpen && "is-mobile-open")}
      aria-label="Menú administrativo"
    >
      <div className="admin-sidebar__top">
        <button
          type="button"
          className="admin-sidebar__toggle"
          aria-expanded={!collapsed || mobileOpen}
          aria-label={collapsed && !mobileOpen ? "Expandir menú" : "Contraer menú"}
          onClick={onToggle}
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
      </div>

      <nav className="admin-sidebar__nav">
        {items.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
        ))}
        <div className="admin-sidebar__spacer" />
        <Link
          to="/"
          className="admin-sidebar__action"
          data-label="Ver sitio"
          title={collapsed ? "Ver sitio" : undefined}
          onClick={onCloseMobile}
        >
          <ExternalLink size={18} strokeWidth={1.75} />
          <span className="admin-sidebar__action-label">Ver sitio</span>
        </Link>
      </nav>
    </aside>
  );
}
