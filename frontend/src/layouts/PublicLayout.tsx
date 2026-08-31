import { Link, Outlet } from "react-router-dom";
import { MapHeartLogo } from "../components/brand/MapHeartLogo";
import { useAuth } from "../hooks/useAuth";

export function PublicLayout() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-black">
        <div className="relative mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 py-5">
          <nav className="flex gap-8 text-sm">
            <Link to="/explorar">Experiencias</Link>
            <Link to="/">Inicio</Link>
          </nav>
          <Link to="/" className="flex flex-col items-center">
            <p className="font-serif text-xl tracking-wide">ENTRE CAMINOS</p>
            <MapHeartLogo className="-mb-10 mt-2 h-20 w-20" />
          </Link>
          <div className="flex items-center justify-end gap-6 text-sm">
            {user ? (
              <>
                <Link to={isAdmin ? "/admin" : "/explorar"}>{isAdmin ? "Atelier" : user.name}</Link>
                <button type="button" onClick={() => logout().then(() => window.location.replace("/"))}>
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Iniciar sesión</Link>
                <Link to="/register">Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
        <div className="h-6 border-t border-black" />
      </header>
      <Outlet />
      <footer className="border-t border-black bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif text-lg tracking-wide">ENTRE CAMINOS</p>
          <p className="max-w-md text-sm text-neutral-600">
            Una plataforma para descubrir el territorio con criterio, calma y confianza.
          </p>
        </div>
      </footer>
    </div>
  );
}
