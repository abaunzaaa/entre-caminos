import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ExperienceCatalogCard } from "../components/admin/ExperienceCatalogCard";
import { Pager } from "../components/ui/Pager";
import {
  DEFAULT_DISCOVER_FILTERS,
  ExplorerDiscoverFilters,
  type DiscoverFiltersState,
} from "../components/explorer/ExplorerDiscoverFilters";
import { ExplorerRecommendedSection } from "../components/explorer/ExplorerRecommendedSection";
import { ExplorerUserFooter } from "../components/explorer/ExplorerUserFooter";
import { TouristHomeHero } from "../components/explorer/TouristHomeHero";
import { experienceCoverUrl } from "../components/explorer/explorer-media";
import { useGuide } from "../components/guide/GuideContext";
import { useAuth } from "../hooks/useAuth";
import { useInViewReveal } from "../hooks/useInViewReveal";
import descubreIcon from "../assets/icon-descubre.png";
import mapaIcon from "../assets/mapa-icon.png";
import paloma1 from "../assets/paloma1.png";
import paloma2 from "../assets/paloma 2.png";
import { getCoverFeaturedExperiences, getMapPreviewExperiences, getPublicExperiences, getRecommendedExperiences } from "../services/catalog.service";
import { listFavoriteIds } from "../services/favorites.service";
import { onFavoritesChanged } from "../services/favorites-sync";
import { listVisitedIds } from "../services/visits.service";
import { onVisitsChanged } from "../services/visits-sync";
import {
  COLOMBIA_DEPARTMENTS,
  findDepartment,
  findMunicipality,
  formatDepartmentMunicipality,
} from "../data/colombia-locations";
import type { Experience } from "../types";
import "../styles/admin-ui.css";
import "../styles/admin-access.css";
import "../styles/explorer.css";

const PAGE_SIZE = 8;
const STREET_PLACE = /(?:calle|carrera|cra\.?|cll?\.?|avenida|av\.?|transversal|tv\.?|diagonal|dg\.?|vereda|km\b|#)/i;

function joinPlace(department?: string | null, municipality?: string | null) {
  const dept = department?.trim() || "";
  const city = municipality?.trim() || "";
  if (dept && city) {
    return `${dept} · ${city}`;
  }
  return dept || city;
}

function mapCardPlace(experience: Experience) {
  const stored = experience.locations?.find((item) => item.department?.trim() || item.municipality?.trim());
  if (stored) {
    return joinPlace(stored.department, stored.municipality);
  }

  const location = (experience.location ?? "").replace(/\([^)]*\)/g, " ").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
  const formatted = formatDepartmentMunicipality(location);
  if (formatted) {
    return formatted;
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !STREET_PLACE.test(part));
  let department = "";
  const cityParts: string[] = [];
  for (const part of parts) {
    const match = findDepartment(part);
    if (match) {
      department = match.name;
    } else {
      cityParts.push(part);
    }
  }

  if (department) {
    const city = cityParts.map((part) => findMunicipality(department, part)).find(Boolean) ?? "";
    return joinPlace(department, city);
  }

  for (const part of cityParts) {
    const matches = COLOMBIA_DEPARTMENTS.flatMap((item) => {
      const city = findMunicipality(item.name, part);
      return city ? [{ department: item.name, city }] : [];
    });
    if (matches.length === 1) {
      return joinPlace(matches[0].department, matches[0].city);
    }
    if (matches.length > 1) {
      return matches[0].city;
    }
  }

  return "";
}

export function ExplorePage() {
  const { user } = useAuth();
  const guide = useGuide();
  const interestKey = user?.profile?.interests?.slice().sort().join("|") ?? "";
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [coverFeatured, setCoverFeatured] = useState<Experience[]>([]);
  const [recommended, setRecommended] = useState<Experience[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [mapPreview, setMapPreview] = useState<Experience[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoverFiltersState>(DEFAULT_DISCOVER_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    function loadFavorites() {
      listFavoriteIds()
        .then((ids) => {
          if (!cancelled) {
            setFavoriteIds(new Set(ids));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFavoriteIds(new Set());
          }
        });
    }
    loadFavorites();
    const unsubscribe = onFavoritesChanged(loadFavorites);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setVisitedIds(new Set());
      return;
    }
    let cancelled = false;
    function loadVisits() {
      listVisitedIds()
        .then((ids) => {
          if (!cancelled) {
            setVisitedIds(new Set(ids));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setVisitedIds(new Set());
          }
        });
    }
    loadVisits();
    const unsubscribe = onVisitsChanged(loadVisits);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    setRecommendedLoading(true);
    getRecommendedExperiences()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setRecommended(result.experiences);
        setSelectedId(result.experiences[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setRecommended([]);
          setSelectedId(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecommendedLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, interestKey]);

  useEffect(() => {
    let cancelled = false;
    getCoverFeaturedExperiences()
      .then((items) => {
        if (!cancelled) {
          setCoverFeatured(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoverFeatured([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { ref: discoverRef, inView: discoverRevealed } = useInViewReveal<HTMLElement>();
  const { ref: mapRef, inView: mapRevealed } = useInViewReveal<HTMLElement>();

  useEffect(() => {
    if (!mapRevealed || mapLoaded) {
      return;
    }
    let cancelled = false;
    getMapPreviewExperiences()
      .then((items) => {
        if (!cancelled) {
          setMapPreview(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapPreview([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMapLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mapLoaded, mapRevealed]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExperiences([]);
    getPublicExperiences({
      page,
      limit: PAGE_SIZE,
      q: activeSearch,
      city: filters.city,
      categoryId: filters.categoryId,
      price: filters.price,
      plan: filters.plan,
      sort: "newest",
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setExperiences(result.experiences);
        setTotal(result.total);
        setPageCount(result.pageCount);
        setCities(result.cities);
        setCategories(result.categories);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setExperiences([]);
        setTotal(0);
        setPageCount(0);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, filters, activeSearch]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchDraft.trim();
      setActiveSearch((current) => (current === next ? current : next));
      setPage((currentPage) => {
        const committed = activeSearch.trim();
        if (committed === next || currentPage === 1) {
          return currentPage;
        }
        return 1;
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [activeSearch, searchDraft]);

  const heroExperiences = recommended;
  const hasInterests = (user?.profile?.interests ?? []).some((interest) => interest.trim());

  const selected = useMemo(
    () => heroExperiences.find((item) => item.id === selectedId) ?? heroExperiences[0] ?? null,
    [heroExperiences, selectedId],
  );

  const filtersActive =
    Boolean(activeSearch.trim()) ||
    Boolean(filters.city || filters.categoryId || filters.price || filters.plan);

  return (
    <div className="explorer-page">
      <TouristHomeHero
        experiences={heroExperiences}
        selected={selected}
        recommendationsLoading={recommendedLoading}
        hasInterests={hasInterests}
        interestsHref={user ? "/perfil/editar" : undefined}
        onSelect={(experience) => {
          setSelectedId(experience.id);
          guide.setCatalogFocus(experience);
        }}
      />

      <section
        ref={discoverRef}
        className={`explorer-section explorer-section--discover explorer-reveal-scope${discoverRevealed ? " is-revealed" : ""}`}
        id="descubrir"
        aria-labelledby="explorer-discover-title"
      >
        <header className="explorer-discover-intro">
          <img
            className="explorer-discover-icon explorer-reveal explorer-reveal--soft"
            src={descubreIcon}
            alt=""
            aria-hidden="true"
            style={{ "--reveal-delay": "0ms" } as CSSProperties}
          />
          <h2
            className="explorer-discover-title explorer-reveal explorer-reveal--title"
            id="explorer-discover-title"
            style={{ "--reveal-delay": "80ms" } as CSSProperties}
          >
            Descubre nuevas experiencias
          </h2>
          <p
            className="explorer-discover-lead explorer-reveal explorer-reveal--soft"
            style={{ "--reveal-delay": "150ms" } as CSSProperties}
          >
            Encuentra lo que buscas
          </p>
        </header>

        <ExplorerDiscoverFilters
          experiences={experiences}
          cityOptions={cities}
          categoryOptions={categories}
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          searchDraft={searchDraft}
          searchActive={Boolean(searchDraft.trim())}
          onSearchDraftChange={setSearchDraft}
          onSearchClear={() => {
            setSearchDraft("");
            setActiveSearch("");
            setPage(1);
          }}
        />

        {loading && experiences.length === 0 ? (
          <p className="explorer-empty explorer-empty--search explorer-reveal" style={{ "--reveal-delay": "220ms" } as CSSProperties}>
            Buscando experiencias que coincidan…
          </p>
        ) : loaded && total === 0 && !filtersActive ? (
          <p className="explorer-empty explorer-reveal" style={{ "--reveal-delay": "220ms" } as CSSProperties}>
            No hay experiencias publicadas todavía.
          </p>
        ) : total === 0 ? (
          <div className="explorer-empty explorer-empty--search explorer-reveal" style={{ "--reveal-delay": "220ms" } as CSSProperties}>
            <p>
              {activeSearch.trim()
                ? `No encontramos experiencias relacionadas con “${activeSearch.trim()}”.`
                : "No hay experiencias con estos filtros. Prueba otra combinación."}
            </p>
            {activeSearch.trim() ? (
              <button
                type="button"
                className="explorer-empty__clear"
                onClick={() => {
                  setSearchDraft("");
                  setActiveSearch("");
                  setPage(1);
                }}
              >
                Limpiar búsqueda
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="dash-exps-catalog explorer-discover-catalog">
              {experiences.map((experience, index) => (
                <div
                  key={experience.id}
                  className="explorer-discover-card explorer-reveal explorer-reveal--card"
                  style={{ "--reveal-delay": `${220 + index * 80}ms` } as CSSProperties}
                >
                  <ExperienceCatalogCard
                    experience={experience}
                    variant="tourist"
                    canReview={false}
                    showManage={false}
                    viewHref={`/explorar/${experience.id}`}
                    favorited={favoriteIds.has(experience.id)}
                    visited={visitedIds.has(experience.id)}
                    imagePriority={index === 0}
                  />
                </div>
              ))}
            </div>

            <Pager
              className="explorer-reveal"
              style={{ "--reveal-delay": `${220 + Math.min(experiences.length, 8) * 80}ms` } as CSSProperties}
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              disabled={loading}
              label="Paginación de experiencias"
            />
          </>
        )}
      </section>

      <ExplorerRecommendedSection experiences={coverFeatured} />

      <section
        ref={mapRef}
        className={`explorer-section explorer-reveal-scope${mapRevealed ? " is-revealed" : ""}`}
        id="mapa"
        aria-labelledby="explorer-map-title"
      >
        <div className="explorer-section__head">
          <div>
            <img
              className="explorer-map-icon explorer-reveal explorer-reveal--soft"
              src={mapaIcon}
              alt=""
              aria-hidden="true"
              style={{ "--reveal-delay": "0ms" } as CSSProperties}
            />
            <h2
              className="explorer-discover-title explorer-reveal explorer-reveal--title"
              id="explorer-map-title"
              style={{ "--reveal-delay": "80ms" } as CSSProperties}
            >
              Mapa
            </h2>
            <p
              className="explorer-section__lead explorer-reveal explorer-reveal--soft"
              style={{ "--reveal-delay": "150ms" } as CSSProperties}
            >
              Un mapa interactivo llegará pronto. Mientras tanto, revisa la ubicación de cada experiencia.
            </p>
          </div>
        </div>
        {!mapLoaded ? (
          mapRevealed ? (
            <p className="explorer-empty explorer-reveal" style={{ "--reveal-delay": "220ms" } as CSSProperties}>
              Buscando ubicaciones…
            </p>
          ) : null
        ) : mapPreview.length === 0 ? (
          <p className="explorer-empty explorer-reveal" style={{ "--reveal-delay": "220ms" } as CSSProperties}>
            Cuando haya experiencias publicadas, podrás ubicarlas aquí.
          </p>
        ) : (
          <div className="explorer-soft-grid">
            {mapPreview.map((experience, index) => {
              const place = mapCardPlace(experience);
              return (
                <Link
                  key={experience.id}
                  to={`/explorar/${experience.id}`}
                  className="explorer-soft-card explorer-reveal explorer-reveal--card"
                  style={{ "--reveal-delay": `${220 + index * 80}ms` } as CSSProperties}
                >
                  <img src={experienceCoverUrl(experience, 320)} alt="" loading="lazy" decoding="async" />
                  <div>
                    <h3>{experience.title}</h3>
                    {place ? <p>{place}</p> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <img
          className="explorer-map__dove explorer-map__dove--left explorer-reveal explorer-reveal--soft"
          src={paloma1}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={{ "--reveal-delay": "260ms" } as CSSProperties}
        />
        <img
          className="explorer-map__dove explorer-map__dove--right explorer-reveal explorer-reveal--soft"
          src={paloma2}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={{ "--reveal-delay": "300ms" } as CSSProperties}
        />
      </section>

      <ExplorerUserFooter />
    </div>
  );
}
