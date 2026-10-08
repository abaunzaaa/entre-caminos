import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Compass,
  Route,
  Heart,
  LogOut,
  Map,
  MapPinned,
  Menu,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AdminNotifications } from "../admin/AdminNotifications";
import { AdminUserMenu } from "../admin/AdminUserMenu";
import { useAuth } from "../../hooks/useAuth";
import "../../styles/admin-topbar.css";

const NAV_LINKS: Array<{
  to: string;
  label: string;
  icon: typeof Compass;
  end?: boolean;
}> = [
  { to: "/explorar", label: "Inicio", icon: Compass, end: true },
  { to: "/favoritos", label: "Favoritos", icon: Heart, end: true },
  { to: "/mapa", label: "Mapa", icon: Map, end: true },
  { to: "/plan-con-amigos", label: "Plan con amigos", icon: Users, end: true },
  { to: "/visitados", label: "Visitados", icon: MapPinned, end: true },
];

const EXPLORER_SHELL_PATHS = new Set(["/favoritos", "/mapa", "/plan-con-amigos", "/visitados", "/perfil", "/mis-caminos"]);

export function isExplorerShellPath(pathname: string) {
  return pathname.startsWith("/explorar") || pathname === "/perfil" || EXPLORER_SHELL_PATHS.has(pathname);
}

export function ExplorerNavbar() {
  const { user, logout, isAdmin } = useAuth();
  const { pathname, hash } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setEntered(true);
      return;
    }
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, hash]);

  useEffect(() => {
    if (!hash) {
      return;
    }
    const id = hash.replace("#", "");
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, pathname]);

  const isExplorer =
    isExplorerShellPath(pathname) || pathname.endsWith("/cambiar-contrasena") || pathname === "/perfil";

  return (
    <header
      className={`explorer-nav${isExplorer ? " explorer-nav--light" : " explorer-nav--dark"}${scrolled ? " is-scrolled" : ""}${menuOpen ? " is-open" : ""}${entered ? " is-entered" : ""}`}
    >
      <div className="explorer-nav__inner">
        <Link to="/explorar" className="explorer-nav__brand">
          Entre caminos
        </Link>

        <nav className="explorer-nav__links" aria-label="Navegación del explorador">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `explorer-nav__link${isActive ? " is-active" : ""}`}
              >
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="explorer-nav__actions">
          {user ? (
            <div className="explorer-nav__account admin-topbar__end">
              {isAdmin ? <AdminNotifications /> : null}
              <AdminUserMenu user={user} showName />
            </div>
          ) : (
            <div className="explorer-nav__auth">
              <Link to="/login">Acceder</Link>
              <Link to="/register" className="explorer-nav__cta">
                Registrarte
              </Link>
            </div>
          )}

          <button
            type="button"
            className="explorer-nav__burger"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="explorer-nav__drawer" aria-label="Menú móvil">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `explorer-nav__drawer-link${isActive ? " is-active" : ""}`}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          {user ? (
            <>
              {user?.role === "USER" ? (
                <NavLink
                  to="/perfil"
                  className={({ isActive }) => `explorer-nav__drawer-link${isActive ? " is-active" : ""}`}
                >
                  <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>Perfil</span>
                </NavLink>
              ) : null}
              <NavLink
                to="/mis-caminos"
                className={({ isActive }) => `explorer-nav__drawer-link${isActive ? " is-active" : ""}`}
              >
                <Route size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>Mis caminos</span>
              </NavLink>
              <button
                type="button"
                className="explorer-nav__drawer-link"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
              >
                <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="explorer-nav__drawer-link">
                Acceder
              </Link>
              <Link to="/register" className="explorer-nav__drawer-link">
                Registrarte
              </Link>
            </>
          )}
        </nav>
      ) : null}
    </header>
  );
}
