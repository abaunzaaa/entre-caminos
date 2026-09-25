import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Compass,
  Heart,
  LogOut,
  Map,
  MapPinned,
  Menu,
  Users,
  X,
} from "lucide-react";
import logoMark from "../../assets/logo.png";
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
  { to: "/explorar#mapa", label: "Mapa", icon: Map },
  { to: "/explorar#favoritos", label: "Favoritos", icon: Heart },
  { to: "/explorar#planes", label: "Plan con amigos", icon: Users },
  { to: "/explorar#visitados", label: "Visitados", icon: MapPinned },
];

export function ExplorerNavbar() {
  const { user, logout } = useAuth();
  const { pathname, hash } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const isExplorer = pathname.startsWith("/explorar") || pathname.endsWith("/cambiar-contrasena");

  return (
    <header
      className={`explorer-nav${isExplorer ? " explorer-nav--light" : " explorer-nav--dark"}${scrolled ? " is-scrolled" : ""}${menuOpen ? " is-open" : ""}`}
    >
      <div className="explorer-nav__inner">
        <Link to="/explorar" className="explorer-nav__brand" aria-label="Entre Caminos">
          <img
            src={logoMark}
            alt="Entre Caminos"
            className="explorer-nav__logo"
            width={48}
            height={48}
            draggable={false}
            decoding="async"
          />
        </Link>

        <nav className="explorer-nav__links" aria-label="Navegación del explorador">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const active =
              item.end
                ? pathname === "/explorar" && !hash
                : hash === item.to.replace("/explorar", "");
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={() => `explorer-nav__link${active ? " is-active" : ""}`}
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
              <AdminNotifications />
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
              <Link key={item.to} to={item.to} className="explorer-nav__drawer-link">
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {user ? (
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
