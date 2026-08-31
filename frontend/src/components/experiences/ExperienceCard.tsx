import { Link } from "react-router-dom";
import type { Experience } from "../../types";
import { mediaUrl } from "../../utils/media";
import { formatPrice } from "../../utils/cn";

export function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <Link to={`/explorar/${experience.id}`} className="block bg-white">
      <article className="group">
        <div className="relative aspect-[4/5] overflow-hidden">
          <img
            src={mediaUrl(experience.imageUrl)}
            alt={experience.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        </div>
        <div className="space-y-2 border-t border-black p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            {experience.location} · {experience.category?.name ?? "Experiencia"}
          </p>
          <h3 className="font-serif text-2xl leading-tight group-hover:underline">{experience.title}</h3>
          <p className="line-clamp-3 text-sm leading-6 text-neutral-600">{experience.description}</p>
          <p className="pt-1 font-serif text-lg">{formatPrice(experience.price)}</p>
        </div>
      </article>
    </Link>
  );
}
