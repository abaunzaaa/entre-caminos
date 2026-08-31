import { NavLink, Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { MapHeartLogo } from "../components/brand/MapHeartLogo";
import { useAuth } from "../hooks/useAuth";

const links = [
  { to: "/admin", label: "Tablero", end: true, permission: null as string | null },
  { to: "/admin/experiencias", label: "Publicaciones", permission: "experiences.manage" },
  { to: "/admin/categorias", label: "Categorías", permission: "categories.manage" },
  { to: "/admin/administradores", label: "Equipo", permission: "admins.manage" },
  { to: "/admin/roles", label: "Roles", permission: "roles.manage" },
];

const titles: Record<string, { kicker: string; title: string }> = {
  "/admin": { kicker: "Curaduría", title: "El territorio, en una mirada" },
  "/admin/experiencias": { kicker: "Catálogo", title: "Publicaciones" },
  "/admin/experiencias/nueva": { kicker: "Estudio", title: "Nueva experiencia" },
  "/admin/experiences": { kicker: "Catálogo", title: "Publicaciones" },
  "/admin/experiences/nueva": { kicker: "Estudio", title: "Nueva experiencia" },
  "/admin/categorias": { kicker: "Taxonomía", title: "Categorías" },
  "/admin/administradores": { kicker: "Atelier", title: "Equipo editorial" },
  "/admin/roles": { kicker: "Acceso", title: "Roles y permisos" },
  "/admin/permissions": { kicker: "Acceso", title: "Permisos" },
};

export function AdminLayout() {
  const { user, loading, isAdmin, logout, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-serif text-2xl italic">
        Entre Caminos
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const visibleLinks = links.filter((link) => !link.permission || hasPermission(link.permission));
  const heading =
    titles[location.pathname] ??
    (location.pathname.includes("/experiencias/") || location.pathname.includes("/experiences/")
      ? { kicker: "Estudio", title: "Editar experiencia" }
      : { kicker: "Atelier", title: "Panel" });

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-black">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.28em]">Atelier</p>
          <div className="flex flex-col items-center">
            <p className="font-serif text-xl tracking-wide">ENTRE CAMINOS</p>
            <MapHeartLogo className="absolute left-1/2 top-full z-10 h-16 w-16 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="flex items-center justify-end gap-6 text-sm">
            <Link to="/" replace>
              Ver sitio
            </Link>
            <button
              type="button"
              onClick={() => logout().then(() => window.location.replace("/login"))}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav className="mx-auto mt-10 flex max-w-6xl flex-wrap justify-center gap-8 border-t border-black px-6 pb-4 pt-8 text-[11px] uppercase tracking-[0.22em]">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? "text-black underline decoration-1 underline-offset-8" : "text-neutral-500 hover:text-black"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="border-b border-black bg-charcoal px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">{heading.kicker}</p>
          <h1 className="mt-2 font-serif text-4xl italic md:text-5xl">{heading.title}</h1>
          <p className="mt-3 text-sm text-white/70">{user?.name} · {user?.role === "SUPER_ADMIN" ? "Super administración" : "Administración"}</p>
        </div>
      </div>

      <main className="stripe-bg min-h-[60vh]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
