import { Link } from "react-router-dom";
import type { Experience } from "../types";
import { formatPrice } from "../services/api";

export function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <article className="group overflow-hidden rounded-3xl bg-white shadow-soft">
      <div className="relative h-56 overflow-hidden">
        <img
          src={experience.imageUrl ?? "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80"}
          alt={experience.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-cream/90 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-forest">
          {experience.category?.name}
        </span>
      </div>
      <div className="space-y-3 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-forest/50">{experience.location}</p>
        <h3 className="font-serif text-2xl leading-tight text-forest">{experience.title}</h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-forest/70">{experience.description}</p>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-medium text-forest">{formatPrice(experience.price)}</span>
          <Link to={`/explorar/${experience.id}`} className="text-sm text-forest/70 underline">
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}
