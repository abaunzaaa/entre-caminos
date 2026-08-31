import { Link, Outlet } from "react-router-dom";
import { Logo } from "../components/brand/Logo";

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-forest lg:block">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80"
          alt="Camino entre montañas"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest/50 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12 text-cream">
          <Logo inverted />
          <blockquote className="max-w-md space-y-4">
            <p className="font-serif text-4xl leading-tight">
              El territorio se entiende caminándolo, no acumulándolo.
            </p>
            <p className="text-sm uppercase tracking-[0.22em] text-cream/70">Entre Caminos, 2026</p>
          </blockquote>
        </div>
      </aside>
      <main className="flex items-center justify-center bg-cream px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <Outlet />
          <p className="mt-10 text-center text-sm text-forest-soft">
            <Link to="/" className="underline decoration-forest/30">
              Volver al inicio
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
