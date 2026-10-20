import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { MapPin } from "lucide-react";
import favVacia from "../../assets/fav-vacia.png";
import { experienceGalleryUrls, municipalityLabel } from "./explorer-media";
import { FavoriteFoldersGrid } from "./FavoriteFoldersGrid";
import { RecsExperienceGallery } from "./RecsExperienceGallery";
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

/** Visual wrap only. The category name itself stays unchanged. */
function featuredTabLines(label: string): [string] | [string, string] {
  const match = label.match(/^(.*\S)\s+([ye])\s+(\S.*)$/i);
  if (!match) {
    return [label];
  }
  return [`${match[1]} ${match[2]}`, match[3]];
}

export function ExplorerRecommendedSection({ experiences }: ExplorerRecommendedSectionProps) {
  const tablistId = useId();
  const { user } = useAuth();
  const { pathname, key: locationKey } = useLocation();
  const { ref: featuredRef, inView: featuredRevealed } = useInViewReveal<HTMLDivElement>({ once: true });
  const { ref: favoritesRef, inView: favoritesRevealed } = useInViewReveal<HTMLDivElement>({ once: true });
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
                    const lines = featuredTabLines(tab.shortLabel);
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
                        <span className={`explorer-recs__tab-label${lines.length > 1 ? " is-wrapped" : ""}`}>
                          {lines.map((line, lineIndex) => (
                            <span key={`${tab.id}-line-${lineIndex}`}>
                              {lineIndex > 0 ? <br /> : null}
                              {line}
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="fav-folders__empty-state" aria-live="polite">
              <span
                className="fav-folders__empty-icon explorer-reveal explorer-reveal--soft"
                style={
                  {
                    "--reveal-delay": "150ms",
                    "--fav-empty-mask": `url(${favVacia})`,
                  } as CSSProperties
                }
                role="img"
                aria-hidden="true"
              />
              <p
                className="fav-folders__empty explorer-reveal explorer-reveal--soft"
                style={{ "--reveal-delay": "280ms" } as CSSProperties}
              >
                Pronto verás aquí una selección de experiencias destacadas.
              </p>
            </div>
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
