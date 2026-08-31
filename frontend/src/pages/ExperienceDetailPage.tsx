import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicExperience } from "../services/catalog.service";
import { mediaUrl } from "../utils/media";
import type { Experience } from "../types";

function formatPrice(value: string | number) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ExperienceDetailPage() {
  const { id } = useParams();
  const [experience, setExperience] = useState<Experience | null>(null);

  useEffect(() => {
    if (id) {
      getPublicExperience(id).then(setExperience).catch(() => setExperience(null));
    }
  }, [id]);

  if (!experience) {
    return (
      <p className="px-6 py-24 text-center font-serif text-2xl italic text-neutral-500">
        Cargando experiencia…
      </p>
    );
  }

  return (
    <article>
      <img
        src={mediaUrl(experience.imageUrl)}
        alt={experience.title}
        className="h-[48vh] w-full object-cover md:h-[62vh]"
      />
      <div className="border-b border-black bg-charcoal px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">
            {experience.category?.name} · {experience.location}
          </p>
          <h1 className="mt-2 font-serif text-4xl italic md:text-5xl">{experience.title}</h1>
          <p className="mt-4 font-serif text-2xl">{formatPrice(experience.price)}</p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-lg leading-relaxed text-neutral-700">{experience.description}</p>
        <Link
          to="/explorar"
          className="mt-10 inline-flex rounded-full border border-black px-7 py-3 text-[11px] uppercase tracking-[0.18em]"
        >
          Volver al catálogo
        </Link>
      </div>
    </article>
  );
}
