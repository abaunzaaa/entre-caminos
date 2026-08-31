import { useEffect, useState } from "react";
import { ExperienceCard } from "../components/experiences/ExperienceCard";
import { getPublicCategories, getPublicExperiences } from "../services/catalog.service";
import type { Category, Experience } from "../types";

export function ExplorePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getPublicExperiences().then(setExperiences).catch(() => setExperiences([]));
    getPublicCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const visible =
    filter === "all" ? experiences : experiences.filter((item) => item.categoryId === filter);

  return (
    <section className="stripe-bg">
      <div className="border-b border-black bg-charcoal px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">Catálogo</p>
          <h1 className="mt-2 font-serif text-4xl italic md:text-5xl">Explorar sin prisa</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">
            Recorre el territorio. El registro abre preferencias, favoritos y planes.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.16em] ${
              filter === "all" ? "bg-charcoal text-white" : "border border-black bg-white"
            }`}
            onClick={() => setFilter("all")}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.16em] ${
                filter === category.id ? "bg-charcoal text-white" : "border border-black bg-white"
              }`}
              onClick={() => setFilter(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        {visible.length === 0 && (
          <p className="mt-12 font-serif text-2xl italic text-neutral-500">
            No hay experiencias publicadas todavía.
          </p>
        )}
        <div className="mt-10 grid gap-px bg-black md:grid-cols-3">
          {visible.map((experience) => (
            <ExperienceCard key={experience.id} experience={experience} />
          ))}
        </div>
      </div>
    </section>
  );
}
