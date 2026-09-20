import { useEffect, useRef, useState } from "react";
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
import keyIcon from "../../assets/key-icon.png";
import { useAuth } from "../../hooks/useAuth";
import { mediaUrl } from "../../utils/media";

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
  const { user, logout, isAdmin } = useAuth();
  const { pathname, hash } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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
    setProfileOpen(false);
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

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const avatarUrl = user?.avatarUrl || user?.profile?.profileImageUrl || null;
  const displayName = user?.name?.trim() || "Viajero";
  const initial = displayName.charAt(0).toUpperCase() || "V";

  const isExplorer = pathname.startsWith("/explorar");

  return (
    <header
      className={`explorer-nav${isExplorer ? " explorer-nav--light" : " explorer-nav--dark"}${scrolled ? " is-scrolled" : ""}${menuOpen ? " is-open" : ""}`}
    >
      <div className="explorer-nav__inner">
        <Link to="/explorar" className="explorer-nav__brand" aria-label="Entre Caminos">
          <img src={keyIcon} alt="" className="explorer-nav__logo" />
          <span>Entre Caminos</span>
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
            <div className="explorer-nav__profile" ref={profileRef}>
              <button
                type="button"
                className="explorer-nav__profile-btn"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="explorer-nav__avatar" aria-hidden="true">
                  {avatarUrl ? <img src={mediaUrl(avatarUrl, 96)} alt="" /> : initial}
                </span>
                <span className="explorer-nav__name">{displayName}</span>
              </button>
              {profileOpen ? (
                <div className="explorer-nav__menu" role="menu">
                  {isAdmin ? (
                    <Link to="/admin" role="menuitem" onClick={() => setProfileOpen(false)}>
                      Panel administrativo
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      void logout();
                    }}
                  >
                    <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
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
