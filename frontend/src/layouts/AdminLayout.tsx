import { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  ADMIN_NAV_ITEMS,
  AdminSidebar,
} from "../components/admin/AdminSidebar";
import { AdminTopbar } from "../components/admin/AdminTopbar";
import "../styles/admin-sidebar.css";
import "../styles/admin-ui.css";

const SIDEBAR_KEY = "ec_admin_sidebar_collapsed";

const titles: Record<string, { kicker: string; title: string }> = {
  "/admin/experiencias": { kicker: "Catálogo", title: "Publicaciones" },
  "/admin/experiencias/nueva": { kicker: "Estudio", title: "Nueva experiencia" },
  "/admin/experiences": { kicker: "Catálogo", title: "Publicaciones" },
  "/admin/experiences/nueva": { kicker: "Estudio", title: "Nueva experiencia" },
  "/admin/categorias": { kicker: "Taxonomía", title: "Categorías" },
  "/admin/administradores": { kicker: "Atelier", title: "Equipo editorial" },
  "/admin/roles": { kicker: "Acceso", title: "Roles y permisos" },
  "/admin/permissions": { kicker: "Acceso", title: "Permisos" },
};

function readCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export function AdminLayout() {
  const { user, loading, isAdmin, hasPermission } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-poppins text-2xl font-semibold text-forest">
        Entre Caminos
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const visibleLinks = ADMIN_NAV_ITEMS.filter(
    (link) => !link.permission || hasPermission(link.permission),
  );
  const isDashboard = location.pathname === "/admin";
  const isTeamPage =
    location.pathname === "/admin/administradores" || location.pathname === "/admin/administrators";
  const useDashCanvas = isDashboard || isTeamPage;
  const heading = useDashCanvas
    ? null
    : (titles[location.pathname] ??
      (location.pathname.includes("/experiencias/") || location.pathname.includes("/experiences/")
        ? { kicker: "Estudio", title: "Editar experiencia" }
        : { kicker: "Atelier", title: "Panel" }));

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((value) => !value);
  }

  return (
    <div className="admin-shell">
      {mobileOpen ? (
        <button
          type="button"
          className="admin-sidebar__backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={visibleLinks}
        onToggle={toggleSidebar}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="admin-shell__main">
        <div className="admin-shell__mobilebar">
          <button
            type="button"
            className="admin-shell__mobilebar-btn"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <span className="admin-shell__mobilebar-title">Entre Caminos</span>
        </div>

        <AdminTopbar user={user} />

        {heading ? (
          <header className="admin-pagehead">
            <p className="admin-pagehead__kicker">{heading.kicker}</p>
            <h1 className="admin-pagehead__title">{heading.title}</h1>
            <p className="admin-pagehead__meta">
              {`${user?.name} · ${user?.role === "SUPER_ADMIN" ? "Super administrador" : "Administrador"}`}
            </p>
          </header>
        ) : null}

        <main className="admin-shell__content">
          <div className={useDashCanvas ? "admin-shell__canvas" : "mx-auto max-w-6xl px-6 py-8 md:px-8"}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
