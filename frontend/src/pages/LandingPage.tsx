import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { CathedralMark, EmblemEC, MapHeartLogo } from "../components/brand/MapHeartLogo";
import { useAuth } from "../hooks/useAuth";
import { getFeaturedExperiences } from "../services/catalog.service";
import { mediaUrl } from "../utils/media";
import type { Experience } from "../types";

const places = [
  {
    src: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=900&q=80",
    alt: "Valle de Cocora",
  },
  {
    src: "https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=900&q=80",
    alt: "Iglesia colonial",
  },
  {
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80",
    alt: "Terraza en la selva",
  },
  {
    src: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
    alt: "Catedral y metro",
  },
];

const menu = [
  { label: "EXPERIENCIAS", href: "/explorar" },
  { label: "NUESTRA HISTORIA", href: "#historia" },
  { label: "¿CÓMO FUNCIONA?", href: "#como-funciona" },
  { label: "CONTACTO", href: "#contacto" },
];

export function LandingPage() {
  const { user, isAdmin } = useAuth();
  const [featured, setFeatured] = useState<Experience[]>([]);

  useEffect(() => {
    getFeaturedExperiences()
      .then(setFeatured)
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div className="bg-white text-black">
      <section className="relative">
        <img
          src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=2000&q=80"
          alt="Mujer caminando por un jardín"
          className="h-[58vh] w-full object-cover md:h-[70vh]"
        />
        <h1 className="absolute inset-x-0 top-[18%] text-center font-serif text-5xl tracking-wide text-white drop-shadow md:text-7xl lg:text-8xl">
          ENTRE CAMINOS
        </h1>
      </section>

      <nav className="relative border-y border-black bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 py-5">
          <div className="flex gap-8 text-sm">
            <Link to="/explorar">Experiencias</Link>
            <a href="#como-funciona">¿Cómo funciona?</a>
          </div>
          <MapHeartLogo className="-mt-14 h-24 w-24" />
          <div className="flex justify-end gap-8 text-sm">
            {user ? (
              <Link to={isAdmin ? "/admin" : "/explorar"}>{isAdmin ? "Panel" : user.name}</Link>
            ) : (
              <>
                <Link to="/login">Iniciar sesión</Link>
                <Link to="/register">Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="grid border-b border-black md:grid-cols-2">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80"
          alt="Mujeres danzando en la orilla"
          className="h-[420px] w-full object-cover grayscale"
        />
        <div id="como-funciona" className="flex flex-col items-center justify-center px-10 py-16 text-center">
          <h2 className="font-serif text-4xl md:text-5xl">Tu próxima aventura empieza aquí</h2>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[
                "photo-1524504388940-b1c1722653e1",
                "photo-1500648767791-00dcc994a43e",
                "photo-1544005313-94ddf0286df2",
              ].map((id) => (
                <img
                  key={id}
                  src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=80`}
                  alt=""
                  className="h-9 w-9 rounded-full border border-white object-cover"
                />
              ))}
            </div>
            <p className="text-sm">+k Personas explorando nuevos caminos cada día.</p>
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-neutral-700">
            Cada lugar tiene algo por contar. Descubre historias, momentos y experiencias que harán especial tu
            camino.
          </p>
          <Link to="/register" className="mt-8 rounded-full bg-charcoal px-10 py-3 text-white">
            Comenzar
          </Link>
        </div>
      </section>

      <section id="historia" className="stripe-bg border-b border-black px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-serif text-4xl">Lugares destacados</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.length > 0
              ? featured.slice(0, 4).map((item) => (
                  <Link key={item.id} to={`/explorar/${item.id}`} className="group">
                    <img
                      src={mediaUrl(item.imageUrl)}
                      alt={item.title}
                      className="aspect-square w-full border border-black object-cover transition duration-500 group-hover:opacity-90"
                    />
                  </Link>
                ))
              : places.map((place) => (
                  <Link key={place.alt} to="/explorar" className="group">
                    <img
                      src={place.src}
                      alt={place.alt}
                      className="aspect-square w-full border border-black object-cover"
                    />
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section className="grid border-b border-black md:grid-cols-[0.9fr_1.1fr]">
        <div className="divide-y divide-black">
          {menu.map((item) =>
            item.href.startsWith("/") ? (
              <Link key={item.label} to={item.href} className="flex items-center justify-between px-8 py-8 text-sm">
                {item.label}
                <span className="grid h-9 w-9 place-items-center rounded-full border border-black">→</span>
              </Link>
            ) : (
              <a key={item.label} href={item.href} className="flex items-center justify-between px-8 py-8 text-sm">
                {item.label}
                <span className="grid h-9 w-9 place-items-center rounded-full border border-black">→</span>
              </a>
            ),
          )}
        </div>
        <img
          src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1600&q=80"
          alt="Caficultor entre cafetales"
          className="h-full min-h-[360px] w-full object-cover grayscale"
        />
      </section>

      <footer id="contacto" className="grid md:grid-cols-3">
        <div className="flex items-center justify-center border-black py-12 md:border-r">
          <EmblemEC />
        </div>
        <div className="flex items-center justify-center border-black py-12 md:border-r">
          <CathedralMark />
        </div>
        <div className="space-y-3 px-8 py-12 text-xs uppercase tracking-wide">
          <p className="underline">Términos y condiciones</p>
          <p className="underline">Política de privacidad</p>
          <p className="underline">Política de cookies</p>
          <p className="pt-4 normal-case tracking-normal">@entrecaminosoficial</p>
        </div>
      </footer>
    </div>
  );
}
