import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Heart, MapPin, MapPinned, Users } from "lucide-react";
import { experienceGalleryUrls, municipalityLabel } from "./explorer-media";
import { formatPrice } from "../../utils/cn";
import { experienceCategoryNames, formatExperienceCategories } from "../../utils/experience-categories";
import type { Experience } from "../../types";

type ExplorerRecommendedSectionProps = {
  experiences: Experience[];
};

const JOURNAL_BLOCKS = [
  {
    id: "favoritos",
    title: "Favoritos",
    lead: "Guarda lo que quieres vivir más adelante.",
    empty: "Aún no tienes favoritos. Explora una experiencia y márcala cuando esté disponible.",
  },
  {
    id: "planes",
    title: "Plan con amigos",
    lead: "Crea un grupo con tus amigos y deja que la IA encuentre el plan ideal para todos.",
    empty: "Aún no tienes planes. Invita a tus amigos y empiecen a descubrir juntos.",
  },
  {
    id: "visitados",
    title: "Visitados",
    lead: "Tu historial de caminos recorridos aparecerá aquí.",
    empty: "Aún no registras visitas. Cada experiencia vivida irá sumándose a este espacio.",
  },
] as const;

const JOURNAL_ICONS = {
  favoritos: Heart,
  planes: Users,
  visitados: MapPinned,
} as const;

type GalleryMotion = "idle" | "next-from" | "next-to" | "prev-from" | "prev-to";
type GallerySlot = "primary" | "secondary" | "flush";

const GALLERY_SHIFT_MS = 420;

function wrapIndex(value: number, count: number) {
  return (value + count) % count;
}

function RecsExperienceGallery({ urls }: { urls: string[] }) {
  const count = urls.length;
  const [index, setIndex] = useState(0);
  const [motion, setMotion] = useState<GalleryMotion>("idle");
  const motionRef = useRef<GalleryMotion>("idle");
  motionRef.current = motion;

  useEffect(() => {
    if (motion !== "next-from" && motion !== "prev-from") {
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setMotion(motion === "next-from" ? "next-to" : "prev-to");
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [motion]);

  useEffect(() => {
    if (motion !== "next-to" && motion !== "prev-to") {
      return;
    }
    const timer = window.setTimeout(() => settleMotion(), GALLERY_SHIFT_MS + 40);
    return () => window.clearTimeout(timer);
  }, [motion]);

  function settleMotion() {
    const current = motionRef.current;
    if (current !== "next-to" && current !== "prev-to") {
      return;
    }
    motionRef.current = "idle";
    setIndex((value) => wrapIndex(current === "next-to" ? value + 1 : value - 1, count));
    setMotion("idle");
  }

  function go(direction: "next" | "prev") {
    if (count < 2 || motionRef.current !== "idle") {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIndex((value) => wrapIndex(direction === "next" ? value + 1 : value - 1, count));
      return;
    }
    setMotion(direction === "next" ? "next-from" : "prev-from");
  }

  if (count < 2) {
    return (
      <div className="explorer-recs__gallery is-single">
        <div className="explorer-recs__photo explorer-recs__photo--primary">
          <img src={urls[0]} alt="" draggable={false} />
        </div>
      </div>
    );
  }

  const shifting = motion !== "idle";
  const slides =
    motion === "idle"
      ? [
          { imageIndex: index, slot: "primary" as GallerySlot },
          { imageIndex: wrapIndex(index + 1, count), slot: "secondary" as GallerySlot },
        ]
      : motion.startsWith("next")
        ? [
            { imageIndex: index, slot: (motion === "next-to" ? "flush" : "primary") as GallerySlot },
            { imageIndex: wrapIndex(index + 1, count), slot: (motion === "next-to" ? "primary" : "secondary") as GallerySlot },
            { imageIndex: wrapIndex(index + 2, count), slot: (motion === "next-to" ? "secondary" : "flush") as GallerySlot },
          ]
        : [
            { imageIndex: wrapIndex(index - 1, count), slot: (motion === "prev-to" ? "primary" : "flush") as GallerySlot },
            { imageIndex: index, slot: (motion === "prev-to" ? "secondary" : "primary") as GallerySlot },
            { imageIndex: wrapIndex(index + 1, count), slot: (motion === "prev-to" ? "flush" : "secondary") as GallerySlot },
          ];

  return (
    <div className={`explorer-recs__gallery${shifting ? " is-shifting" : ""}`}>
      {slides.map((slide) => {
        const interactive = motion === "idle" && slide.slot !== "flush";
        return (
          <button
            key={`slide-${slide.imageIndex}`}
            type="button"
            className={`explorer-recs__photo explorer-recs__photo--${slide.slot}`}
            aria-label={slide.slot === "secondary" ? "Siguiente imagen" : "Imagen anterior"}
            tabIndex={interactive ? 0 : -1}
            onClick={() => {
              if (!interactive) {
                return;
              }
              go(slide.slot === "secondary" ? "next" : "prev");
            }}
            onTransitionEnd={(event) => {
              if (event.propertyName !== "width" || event.currentTarget !== event.target) {
                return;
              }
              if (slide.slot !== "flush") {
                return;
              }
              settleMotion();
            }}
          >
            <img src={urls[slide.imageIndex]} alt="" draggable={false} />
          </button>
        );
      })}
    </div>
  );
}

export function ExplorerRecommendedSection({ experiences }: ExplorerRecommendedSectionProps) {
  const tablistId = useId();
  const tabs = useMemo(
    () =>
      experiences.slice(0, 5).map((experience) => {
        const label = experienceCategoryNames(experience)[0] || "Destacada";
        return {
          id: experience.id,
          label,
          shortLabel: label,
          experience,
        };
      }),
    [experiences],
  );

  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    if (!tabs.length) {
      setActiveId("");
      return;
    }
    if (!tabs.some((tab) => tab.id === activeId)) {
      setActiveId(tabs[0].id);
    }
  }, [tabs, activeId]);

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0] ?? null;

  if (!active) {
    return null;
  }

  const experience = active.experience;
  const place = municipalityLabel(experience.location);
  const category = formatExperienceCategories(experience, active.label);
  const galleryUrls = experienceGalleryUrls(experience);

  function selectTab(id: string) {
    setActiveId(id);
  }

  return (
    <section className="explorer-section explorer-section--recs" id="recomendados">
      <div className="explorer-recs">
        <aside className="explorer-recs__journal" aria-label="Tu espacio personal">
          {JOURNAL_BLOCKS.map((block) => {
            const Icon = JOURNAL_ICONS[block.id];
            return (
              <div key={block.id} className="explorer-recs__entry" id={block.id}>
                <div className="explorer-recs__entry-heading">
                  <span className="explorer-recs__entry-icon" aria-hidden="true">
                    <Icon className="explorer-recs__entry-glyph" strokeWidth={1.7} />
                  </span>
                  <h2 className="explorer-recs__entry-title">{block.title}</h2>
                </div>
                <p className="explorer-recs__entry-lead">{block.lead}</p>
                <p className="explorer-recs__entry-empty">{block.empty}</p>
              </div>
            );
          })}
        </aside>

        <div className="explorer-recs__stage">
          <div className="explorer-recs__shell">
            <article className="explorer-recs__panel" aria-labelledby="explorer-recs-title">
              <header className="explorer-recs__headline">
                <h2 className="explorer-recs__title" id="explorer-recs-title">
                  Experiencias destacadas
                </h2>
              </header>
              <RecsExperienceGallery key={experience.id} urls={galleryUrls} />
              <div className="explorer-recs__body">
                <p className="explorer-recs__category">{category}</p>
                <h3 className="explorer-recs__heading" id={`${tablistId}-heading`}>
                  {experience.title}
                </h3>
                {place ? (
                  <p className="explorer-recs__place">
                    <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                    <span>{place}</span>
                  </p>
                ) : null}
                <div className="explorer-recs__footer">
                  <span className="explorer-recs__price">{formatPrice(experience.price, experience.currency)}</span>
                  <Link to={`/explorar/${experience.id}`} className="explorer-recs__cta">
                    Ver experiencia
                    <ArrowUpRight size={15} strokeWidth={2.15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>

            {tabs.length > 1 ? (
              <div
                className="explorer-recs__tabs"
                role="tablist"
                aria-label="Experiencias destacadas"
                aria-orientation="vertical"
              >
                {tabs.map((tab, index) => {
                  const selected = tab.id === active.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`${tablistId}-${tab.id}`}
                      className={`explorer-recs__tab${selected ? " is-active" : ""}`}
                      style={{ zIndex: selected ? tabs.length + 1 : index + 1 }}
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      onMouseEnter={() => selectTab(tab.id)}
                      onFocus={() => selectTab(tab.id)}
                      onClick={() => selectTab(tab.id)}
                    >
                      <span className="explorer-recs__tab-label">{tab.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
