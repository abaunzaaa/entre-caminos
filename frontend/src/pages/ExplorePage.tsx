import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExperienceCatalogCard } from "../components/admin/ExperienceCatalogCard";
import {
  applyDiscoverFilters,
  DEFAULT_DISCOVER_FILTERS,
  ExplorerDiscoverFilters,
  type DiscoverFiltersState,
} from "../components/explorer/ExplorerDiscoverFilters";
import { ExplorerRecommendedSection } from "../components/explorer/ExplorerRecommendedSection";
import { TouristHomeHero } from "../components/explorer/TouristHomeHero";
import { experienceCoverUrl } from "../components/explorer/explorer-media";
import { useAuth } from "../hooks/useAuth";
import avionIcon from "../assets/avion-icon.png";
import camIcon from "../assets/cam-icon.png";
import { getCoverFeaturedExperiences, getPublicExperiences, getRecommendedExperiences } from "../services/catalog.service";
import { formatDepartmentMunicipality } from "../data/colombia-locations";
import type { Experience } from "../types";
import "../styles/admin-ui.css";
import "../styles/admin-access.css";
import "../styles/explorer.css";

const FETCH_SIZE = 40;
const DISPLAY_STEP = 20;

function mergeExperiences(current: Experience[], incoming: Experience[]) {
  if (!incoming.length) {
    return current;
  }
  const seen = new Set(current.map((item) => item.id));
  const next = [...current];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      next.push(item);
    }
  }
  return next;
}

export function ExplorePage() {
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [coverFeatured, setCoverFeatured] = useState<Experience[]>([]);
  const [recommended, setRecommended] = useState<Experience[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoverFiltersState>(DEFAULT_DISCOVER_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(DISPLAY_STEP);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialEmpty, setInitialEmpty] = useState(false);
  const loadingRef = useRef(false);
  const revealFromRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    getCoverFeaturedExperiences()
      .then((items) => {
        if (cancelled || items.length === 0) {
          return;
        }
        setCoverFeatured(items);
        setSelectedId(items[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setCoverFeatured([]);
        }
      });
    getRecommendedExperiences()
      .then((items) => {
        if (!cancelled) {
          setRecommended(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecommended([]);
        }
      });
    getPublicExperiences({ limit: FETCH_SIZE, offset: 0 })
      .then((page) => {
        if (cancelled) {
          return;
        }
        setExperiences(page.experiences);
        setTotal(page.total);
        setInitialEmpty(page.experiences.length === 0);
        setSelectedId((current) => current ?? page.experiences[0]?.id ?? null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setExperiences([]);
        setTotal(0);
        setInitialEmpty(true);
        setSelectedId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDisplayCount(DISPLAY_STEP);
    revealFromRef.current = 0;
  }, [filters, activeSearch]);

  const heroExperiences = useMemo(
    () => (coverFeatured.length > 0 ? coverFeatured : experiences.slice(0, 12)),
    [coverFeatured, experiences],
  );

  const selected = useMemo(
    () => heroExperiences.find((item) => item.id === selectedId) ?? heroExperiences[0] ?? null,
    [heroExperiences, selectedId],
  );

  const filtered = useMemo(
    () => applyDiscoverFilters(experiences, filters, activeSearch),
    [experiences, filters, activeSearch],
  );

  const visible = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);

  const hasMoreFiltered = displayCount < filtered.length;
  const hasMoreBackend = experiences.length < total;
  const canLoadMore = hasMoreFiltered || hasMoreBackend;

  async function fetchNextPage() {
    if (loadingRef.current || experiences.length >= total) {
      return [] as Experience[];
    }
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const page = await getPublicExperiences({
        limit: FETCH_SIZE,
        offset: experiences.length,
      });
      setExperiences((current) => mergeExperiences(current, page.experiences));
      setTotal(page.total);
      return page.experiences;
    } catch {
      return [] as Experience[];
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }

  async function handleLoadMore() {
    revealFromRef.current = visible.length;
    if (hasMoreFiltered) {
      setDisplayCount((current) => current + DISPLAY_STEP);
      return;
    }
    if (!hasMoreBackend) {
      return;
    }
    await fetchNextPage();
    setDisplayCount((current) => current + DISPLAY_STEP);
  }

  // When filters/search leave few matches but more exist on the backend, prefetch blocks.
  useEffect(() => {
    let cancelled = false;

    async function ensureFilteredBuffer() {
      if (filtered.length >= displayCount || experiences.length >= total || total === 0) {
        return;
      }
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      setLoadingMore(true);
      try {
        let pool = experiences;
        let catalogTotal = total;
        let loaded = pool.length;
        const startLength = loaded;

        while (
          !cancelled &&
          loaded < catalogTotal &&
          applyDiscoverFilters(pool, filters, activeSearch).length < displayCount
        ) {
          const page = await getPublicExperiences({ limit: FETCH_SIZE, offset: loaded });
          if (cancelled) {
            return;
          }
          catalogTotal = page.total;
          if (!page.experiences.length) {
            break;
          }
          pool = mergeExperiences(pool, page.experiences);
          loaded = pool.length;
          if (!page.hasMore) {
            break;
          }
        }

        if (!cancelled && loaded !== startLength) {
          setExperiences(pool);
          setTotal(catalogTotal);
        }
      } catch {
        /* keep current buffer */
      } finally {
        if (!cancelled) {
          loadingRef.current = false;
          setLoadingMore(false);
        }
      }
    }

    void ensureFilteredBuffer();
    return () => {
      cancelled = true;
    };
  }, [filters, activeSearch, filtered.length, displayCount, experiences, experiences.length, total]);

  return (
    <div className="explorer-page">
      <TouristHomeHero
        experiences={heroExperiences}
        selected={selected}
        onSelect={(experience) => setSelectedId(experience.id)}
      />

      <section
        className="explorer-section explorer-section--discover"
        id="descubrir"
        aria-labelledby="explorer-discover-title"
      >
        <header className="explorer-discover-intro">
          <h2 className="explorer-discover-title" id="explorer-discover-title">
            Descubre nuevas experiencias
          </h2>
          <p className="explorer-discover-lead">Encuentra lo que buscas</p>
        </header>

        <ExplorerDiscoverFilters
          experiences={experiences}
          value={filters}
          onChange={setFilters}
          searchDraft={searchDraft}
          searchActive={Boolean(activeSearch.trim())}
          onSearchDraftChange={setSearchDraft}
          onSearchSubmit={() => {
            setActiveSearch(searchDraft.trim());
            document.getElementById("descubrir")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onSearchClear={() => {
            setSearchDraft("");
            setActiveSearch("");
          }}
        />

        {initialEmpty ? (
          <p className="explorer-empty">No hay experiencias publicadas todavía.</p>
        ) : filtered.length === 0 && !loadingMore && !hasMoreBackend ? (
          <div className="explorer-empty explorer-empty--search">
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
                }}
              >
                Limpiar búsqueda
              </button>
            ) : null}
          </div>
        ) : filtered.length === 0 && (loadingMore || hasMoreBackend) ? (
          <p className="explorer-empty explorer-empty--search">Buscando experiencias que coincidan…</p>
        ) : (
          <>
            <div className="dash-exps-catalog explorer-discover-catalog">
              {visible.map((experience, index) => (
                <div
                  key={experience.id}
                  className={
                    index >= revealFromRef.current
                      ? "explorer-discover-card explorer-discover-card--reveal"
                      : "explorer-discover-card"
                  }
                >
                  <ExperienceCatalogCard
                    experience={experience}
                    variant="tourist"
                    canReview={false}
                    showManage={false}
                    viewHref={`/explorar/${experience.id}`}
                  />
                </div>
              ))}
            </div>

            {canLoadMore ? (
              <div className="explorer-discover-more">
                <button
                  type="button"
                  className="explorer-discover-more__btn"
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Cargando…" : "Explorar más experiencias"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <ExplorerRecommendedSection
        experiences={recommended}
        interests={user?.profile?.interests ?? []}
      />

      <section className="explorer-section" id="mapa" aria-labelledby="explorer-map-title">
        <div className="explorer-section__head">
          <div>
            <h2 className="explorer-discover-title" id="explorer-map-title">
              Mapa
            </h2>
            <p className="explorer-section__lead">
              Un mapa interactivo llegará pronto. Mientras tanto, revisa la ubicación de cada experiencia.
            </p>
          </div>
        </div>
        {experiences.length === 0 ? (
          <p className="explorer-empty">Cuando haya experiencias publicadas, podrás ubicarlas aquí.</p>
        ) : (
          <div className="explorer-soft-grid">
            {experiences.slice(0, 6).map((experience) => {
              const place =
                formatDepartmentMunicipality(experience.location) || experience.location || "Colombia";
              return (
                <Link key={experience.id} to={`/explorar/${experience.id}`} className="explorer-soft-card">
                  <img src={experienceCoverUrl(experience, 320)} alt="" />
                  <div>
                    <h3>{experience.title}</h3>
                    <p>{place}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="explorer-stories" aria-labelledby="explorer-stories-title">
        <div className="explorer-stories__inner">
          <img className="explorer-stories__icon explorer-stories__icon--cam" src={camIcon} alt="" aria-hidden="true" />
          <h2 className="explorer-discover-title" id="explorer-stories-title">
            Entre caminos, nacen historias
          </h2>
          <p className="explorer-section__lead">
            A veces, solo hace falta elegir un lugar, salir de la rutina y dejar que una nueva experiencia te encuentre.
          </p>
          <img className="explorer-stories__icon explorer-stories__icon--plane" src={avionIcon} alt="" aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}
