import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExperienceCatalogCard } from "../components/admin/ExperienceCatalogCard";
import {
  DEFAULT_DISCOVER_FILTERS,
  ExplorerDiscoverFilters,
  type DiscoverFiltersState,
} from "../components/explorer/ExplorerDiscoverFilters";
import { ExplorerRecommendedSection } from "../components/explorer/ExplorerRecommendedSection";
import { TouristHomeHero } from "../components/explorer/TouristHomeHero";
import { experienceCoverUrl } from "../components/explorer/explorer-media";
import camIcon from "../assets/cam-icon.png";
import avionIcon from "../assets/avion-icon.png";
import { getCoverFeaturedExperiences, getPublicExperiences, getRecommendedExperiences } from "../services/catalog.service";
import { formatDepartmentMunicipality } from "../data/colombia-locations";
import type { Experience } from "../types";
import "../styles/admin-ui.css";
import "../styles/admin-access.css";
import "../styles/explorer.css";

const PAGE_SIZE = 8;

export function ExplorePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [coverFeatured, setCoverFeatured] = useState<Experience[]>([]);
  const [recommended, setRecommended] = useState<Experience[]>([]);
  const [mapPreview, setMapPreview] = useState<Experience[]>([]);
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

  useEffect(() => {
    let cancelled = false;
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
        }
      });
    getCoverFeaturedExperiences()
      .then((items) => {
        if (cancelled || items.length === 0) {
          return;
        }
        setCoverFeatured(items);
      })
      .catch(() => {
        if (!cancelled) {
          setCoverFeatured([]);
        }
      });
    getPublicExperiences({ limit: 6, offset: 0 })
      .then((result) => {
        if (!cancelled) {
          setMapPreview(result.experiences);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapPreview([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      duration: filters.duration,
      plan: filters.plan,
      sort: filters.sort,
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

  const heroExperiences = useMemo(
    () => (recommended.length > 0 ? recommended : experiences.slice(0, 12)),
    [recommended, experiences],
  );

  const selected = useMemo(
    () => heroExperiences.find((item) => item.id === selectedId) ?? heroExperiences[0] ?? null,
    [heroExperiences, selectedId],
  );

  const filtersActive =
    Boolean(activeSearch.trim()) ||
    Boolean(filters.city || filters.categoryId || filters.price || filters.duration || filters.plan);

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
          cityOptions={cities}
          categoryOptions={categories}
          value={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          searchDraft={searchDraft}
          searchActive={Boolean(activeSearch.trim())}
          onSearchDraftChange={setSearchDraft}
          onSearchSubmit={() => {
            setActiveSearch(searchDraft.trim());
            setPage(1);
            document.getElementById("descubrir")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onSearchClear={() => {
            setSearchDraft("");
            setActiveSearch("");
            setPage(1);
          }}
        />

        {loading && experiences.length === 0 ? (
          <p className="explorer-empty explorer-empty--search">Buscando experiencias que coincidan…</p>
        ) : loaded && total === 0 && !filtersActive ? (
          <p className="explorer-empty">No hay experiencias publicadas todavía.</p>
        ) : total === 0 ? (
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
              {experiences.map((experience) => (
                <div key={experience.id} className="explorer-discover-card explorer-discover-card--reveal">
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

            <div className="explorer-discover-pager">
              <button
                type="button"
                className="explorer-discover-more__btn"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || page <= 1}
              >
                Anterior
              </button>
              <span className="explorer-discover-pager__page">Página {page}</span>
              <button
                type="button"
                className="explorer-discover-more__btn"
                onClick={() => setPage((current) => current + 1)}
                disabled={loading || pageCount === 0 || page >= pageCount}
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </section>

      <ExplorerRecommendedSection experiences={coverFeatured} />

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
        {mapPreview.length === 0 ? (
          <p className="explorer-empty">Cuando haya experiencias publicadas, podrás ubicarlas aquí.</p>
        ) : (
          <div className="explorer-soft-grid">
            {mapPreview.map((experience) => {
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
