import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import { experienceGalleryUrls, municipalityLabel } from "./explorer-media";
import { FavoriteFoldersGrid } from "./FavoriteFoldersGrid";
import { experiencesToFavoriteFolders } from "./favorite-folders";
import { useAuth } from "../../hooks/useAuth";
import { useInViewReveal } from "../../hooks/useInViewReveal";
import { listFavoriteExperiences } from "../../services/favorites.service";
import { onFavoritesChanged } from "../../services/favorites-sync";
import { formatPrice } from "../../utils/cn";
import { experienceCategoryNames } from "../../utils/experience-categories";
import type { Experience } from "../../types";

type ExplorerRecommendedSectionProps = {
  experiences: Experience[];
};

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
  const { user } = useAuth();
  const { pathname, key: locationKey } = useLocation();
  const { ref: featuredRef, inView: featuredRevealed } = useInViewReveal<HTMLDivElement>();
  const { ref: favoritesRef, inView: favoritesRevealed } = useInViewReveal<HTMLDivElement>();
  const [favoriteFolders, setFavoriteFolders] = useState(() => experiencesToFavoriteFolders([]));

  useEffect(() => {
    if (!user) {
      setFavoriteFolders([]);
      return;
    }
    let cancelled = false;
    function loadFolders() {
      listFavoriteExperiences({ limit: 4 })
        .then((items) => {
          if (!cancelled) {
            setFavoriteFolders(experiencesToFavoriteFolders(items, 4));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFavoriteFolders([]);
          }
        });
    }
    loadFolders();
    const unsubscribe = onFavoritesChanged(loadFolders);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.id, pathname, locationKey]);

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
    return (
      <section className="explorer-section explorer-section--recs" id="recomendados">
        <div className="explorer-recs">
          <div
            ref={featuredRef}
            className={`explorer-recs__stage explorer-reveal-scope${featuredRevealed ? " is-revealed" : ""}`}
          >
            <header className="explorer-recs__column-head">
              <h2
                className="explorer-recs__column-title explorer-reveal explorer-reveal--title"
                id="explorer-recs-title"
                style={{ "--reveal-delay": "0ms" } as CSSProperties}
              >
                Experiencias destacadas
              </h2>
              <p
                className="explorer-recs__column-lead explorer-reveal explorer-reveal--soft"
                style={{ "--reveal-delay": "80ms" } as CSSProperties}
              >
                Aún no hay experiencias publicadas para destacar.
              </p>
            </header>
          </div>
          <div
            ref={favoritesRef}
            className={`explorer-recs__favorites explorer-reveal-scope${favoritesRevealed ? " is-revealed" : ""}`}
          >
            <FavoriteFoldersGrid
              folders={favoriteFolders}
              emptyMessage={
                user
                  ? "Aún no tienes experiencias favoritas"
                  : "Inicia sesión para guardar tus favoritos"
              }
            />
          </div>
        </div>
      </section>
    );
  }

  const experience = active.experience;
  const place = municipalityLabel(experience.location);
  const description = experience.description?.replace(/\s+/g, " ").trim() ?? "";
  const galleryUrls = experienceGalleryUrls(experience);

  function selectTab(id: string) {
    setActiveId(id);
  }

  const experience = active?.experience ?? null;
  const place = experience ? municipalityLabel(experience.location) : "";
  const description = experience?.description?.replace(/\s+/g, " ").trim() ?? "";
  const galleryUrls = experience ? experienceGalleryUrls(experience) : [];

  return (
    <section className="explorer-section explorer-section--recs" id="recomendados">
      <div className="explorer-recs">
        <div
          ref={featuredRef}
          className={`explorer-recs__stage explorer-reveal-scope${featuredRevealed ? " is-revealed" : ""}`}
        >
          <header className="explorer-recs__column-head">
            <h2
              className="explorer-recs__column-title explorer-reveal explorer-reveal--title"
              id="explorer-recs-title"
              style={{ "--reveal-delay": "0ms" } as CSSProperties}
            >
              Experiencias destacadas
            </h2>
            <p
              className="explorer-recs__column-lead explorer-reveal explorer-reveal--soft"
              style={{ "--reveal-delay": "80ms" } as CSSProperties}
            >
              Explora nuestra selección
            </p>
          </header>
          {experience ? (
            <div className="explorer-recs__shell">
              <article
                className="explorer-recs__panel explorer-reveal explorer-reveal--card"
                aria-labelledby="explorer-recs-title"
                style={{ "--reveal-delay": "150ms" } as CSSProperties}
              >
                <div key={experience.id} className="explorer-recs__swap">
                  <RecsExperienceGallery urls={galleryUrls} />
                  <div className="explorer-recs__body">
                    {place ? (
                      <p className="explorer-recs__place">
                        <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                        <span>{place}</span>
                      </p>
                    ) : null}
                    <h3 className="explorer-recs__heading" id={`${tablistId}-heading`}>
                      {experience.title}
                    </h3>
                    {description ? <p className="explorer-recs__excerpt">{description}</p> : null}
                    <div className="explorer-recs__footer">
                      <span className="explorer-recs__price">{formatPrice(experience.price, experience.currency)}</span>
                      <Link to={`/explorar/${experience.id}`} className="explorer-recs__cta">
                        Ver experiencia
                        <ArrowUpRight size={15} strokeWidth={2.15} aria-hidden="true" />
                      </Link>
                    </div>
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
                    const selected = tab.id === active?.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={`${tablistId}-${tab.id}`}
                        className={`explorer-recs__tab explorer-reveal explorer-reveal--from-right${selected ? " is-active" : ""}`}
                        style={
                          {
                            zIndex: selected ? tabs.length + 1 : index + 1,
                            "--reveal-delay": `${220 + index * 80}ms`,
                          } as CSSProperties
                        }
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
          ) : (
            <p className="explorer-empty explorer-reveal" style={{ "--reveal-delay": "150ms" } as CSSProperties}>
              Pronto verás aquí una selección de experiencias destacadas.
            </p>
          )}
        </div>

        <div
          ref={favoritesRef}
          className={`explorer-recs__favorites explorer-reveal-scope${favoritesRevealed ? " is-revealed" : ""}`}
        >
          <FavoriteFoldersGrid
            folders={favoriteFolders}
            emptyMessage={
              user
                ? "Aún no tienes experiencias favoritas"
                : "Inicia sesión para guardar y ver tus favoritos"
            }
          />
        </div>
      </div>
    </section>
  );
}
