import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicExperience } from "../services/catalog.service";
import { mediaUrl } from "../utils/media";
import { displayExternalUrl, durationParts, formatAvailability, formatDuration } from "../utils/experience-details";
import type { Experience } from "../types";

function formatPrice(value: string | number) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function mapsUrl(experience: Experience) {
  const latitude = experience.latitude ? Number(experience.latitude) : null;
  const longitude = experience.longitude ? Number(experience.longitude) : null;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  if (experience.location?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(experience.location.trim())}`;
  }
  return "";
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

  const availability = formatAvailability(experience.availability);
  const directions = experience.howToGetThere?.trim() ?? "";
  const duration = formatDuration(experience.durationValue, experience.durationUnit, experience.duration);
  const durationDisplay = durationParts(experience.durationValue, experience.durationUnit);
  const externalUrl = experience.externalUrl?.trim() ?? "";
  const mapHref = mapsUrl(experience);

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
        {duration || availability || directions || externalUrl ? (
          <dl className="mt-10 space-y-7 border-t border-neutral-200 pt-10">
            {durationDisplay || duration ? (
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Duración</dt>
                {durationDisplay ? (
                  <dd className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex min-h-12 min-w-[4.5rem] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-lg text-neutral-700">
                      {durationDisplay.value}
                    </span>
                    <span className="inline-flex min-h-12 items-center rounded-xl border border-neutral-200 bg-white px-4 text-lg text-neutral-700">
                      {durationDisplay.unitLabel}
                    </span>
                  </dd>
                ) : (
                  <dd className="mt-2 text-lg text-neutral-700">{duration}</dd>
                )}
              </div>
            ) : null}
            {availability ? (
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Disponibilidad</dt>
                <dd className="mt-2 text-lg text-neutral-700">{availability}</dd>
              </div>
            ) : null}
            {directions ? (
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Cómo llegar</dt>
                <dd className="mt-2 whitespace-pre-wrap text-lg leading-relaxed text-neutral-700">{directions}</dd>
              </div>
            ) : null}
            {externalUrl ? (
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Enlace de la experiencia</dt>
                <dd className="mt-2 text-lg text-neutral-700">
                  <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    {displayExternalUrl(externalUrl)}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        <div className="mt-10 flex flex-wrap gap-3">
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full border border-black px-7 py-3 text-[11px] uppercase tracking-[0.18em]"
              >
                Ver ubicación en el mapa
              </a>
            ) : null}
            <Link
              to="/explorar"
              className="inline-flex rounded-full border border-black px-7 py-3 text-[11px] uppercase tracking-[0.18em]"
            >
              Volver al catálogo
            </Link>
          </div>
      </div>
    </article>
  );
}
