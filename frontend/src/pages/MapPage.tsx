import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import {
  COLOMBIA_MAP_OVERVIEW,
  ExplorerNearbyMap,
  type ExplorerMapPoint,
  type ExplorerMapView,
} from "../components/explorer/ExplorerNearbyMap";
import { experienceCoverUrl } from "../components/explorer/explorer-media";
import { MapExperienceReviews } from "../components/explorer/MapExperienceReviews";
import { useAuth } from "../hooks/useAuth";
import { getExperiencesNear, getPublicExperiences, type NearbyExperience } from "../services/catalog.service";
import { saveSharedMapLocation } from "../services/onboarding.service";
import { formatPrice } from "../utils/cn";
import { mapCardPlace } from "../utils/experience-region";
import {
  applyMapResults,
  categoryOptions,
  EMPTY_MAP_FILTERS,
  filtersAreActive,
  type MapDistanceBand,
  type MapFilters,
  type MapPriceBand,
  type MapRatingBand,
  type MapSort,
} from "../utils/map-results";
import {
  geocodeMunicipality,
  resolveColombiaPlace,
  searchColombiaPlaces,
  type ColombiaPlaceSuggestion,
} from "../utils/geocode";
import "../styles/explorer-map.css";

const EMPTY_POINTS: ExplorerMapPoint[] = [];

type MapPoint = { latitude: number; longitude: number };
type ExplorePlace = MapPoint & { label: string; detail: string };

function profileCoordinates(profile?: { latitude: number | null; longitude: number | null } | null) {
  if (!profile || profile.latitude == null || profile.longitude == null) {
    return null;
  }
  const latitude = Number(profile.latitude);
  const longitude = Number(profile.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  if (Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

type ExperienceHit = {
  id: string;
  title: string;
  place: string;
  latitude: number;
  longitude: number;
};

function formatDistance(km: number) {
  const digits = km < 10 ? 1 : 0;
  return `${new Intl.NumberFormat("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(km)} km`;
}

function resultsCount(count: number) {
  return count === 1 ? "1 experiencia encontrada" : `${count} experiencias encontradas`;
}

export function MapPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const department = user?.profile?.department?.trim() ?? "";
  const city = user?.profile?.city?.trim() ?? "";
  const profilePlace = [department, city].filter(Boolean).join(" · ");
  const shared = useMemo(() => {
    if (user?.profile?.currentLocationShared !== true) {
      return null;
    }
    return profileCoordinates(user.profile);
  }, [user?.profile]);

  const [approx, setApprox] = useState<MapPoint | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeMiss, setPlaceMiss] = useState(false);
  const [explore, setExplore] = useState<ExplorePlace | null>(null);
  const [trackedView, setTrackedView] = useState({ key: "", token: 0 });
  const [experiences, setExperiences] = useState<NearbyExperience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ColombiaPlaceSuggestion[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [experienceHits, setExperienceHits] = useState<ExperienceHit[]>([]);
  const [filters, setFilters] = useState<MapFilters>(EMPTY_MAP_FILTERS);
  const [sort, setSort] = useState<MapSort>("near");
  const [menu, setMenu] = useState<"filters" | "sort" | null>(null);
  const searchRequest = useRef(0);
  const toolsRef = useRef<HTMLDivElement>(null);
  const pendingSelect = useRef<string | null>(null);
  const pageRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const nav = document.querySelector(".explorer-nav");
    if (!page || !(nav instanceof HTMLElement)) {
      return;
    }
    const apply = () => {
      page.style.setProperty("--map-nav-offset", `${Math.round(nav.getBoundingClientRect().height)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menu) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!toolsRef.current?.contains(event.target as Node)) {
        setMenu(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menu]);

  const personal = shared ?? approx;
  const active = explore ?? personal;
  const waitingForPlace = Boolean(user && !shared && city && placeLoading && !explore);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user || shared || !city) {
      setApprox(null);
      setPlaceMiss(false);
      setPlaceLoading(false);
      return;
    }
    let cancelled = false;
    setPlaceLoading(true);
    setPlaceMiss(false);
    geocodeMunicipality(city, department)
      .then((match) => {
        if (cancelled) {
          return;
        }
        setApprox(match ? { latitude: match.lat, longitude: match.lng } : null);
        setPlaceMiss(!match);
      })
      .catch(() => {
        if (!cancelled) {
          setApprox(null);
          setPlaceMiss(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPlaceLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, city, department, shared, user]);

  const sourceKey = explore
    ? `explore:${explore.latitude.toFixed(5)},${explore.longitude.toFixed(5)}`
    : waitingForPlace || authLoading
      ? "pending"
      : shared
        ? `shared:${shared.latitude.toFixed(5)},${shared.longitude.toFixed(5)}`
        : approx
          ? `approx:${approx.latitude.toFixed(5)},${approx.longitude.toFixed(5)}`
          : "overview";

  if (sourceKey !== "pending" && sourceKey !== trackedView.key) {
    setTrackedView({ key: sourceKey, token: trackedView.token + 1 });
  }
  const viewToken = trackedView.token;

  const view = useMemo<ExplorerMapView>(() => {
    const point = active ?? COLOMBIA_MAP_OVERVIEW;
    const zoom = explore || shared ? 13 : approx && !explore ? 12 : COLOMBIA_MAP_OVERVIEW.zoom;
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      zoom,
      token: viewToken,
    };
  }, [active, approx, explore, shared, viewToken]);

  useEffect(() => {
    if (authLoading || waitingForPlace || !active) {
      setExperiences([]);
      setLoading(false);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getExperiencesNear(active.latitude, active.longitude)
      .then((data) => {
        if (!cancelled) {
          setExperiences(data.experiences);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExperiences([]);
          setError("No pudimos cargar las experiencias cercanas.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [active, authLoading, reloadKey, waitingForPlace]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setSuggestions([]);
      setExperienceHits([]);
      setSearchState("idle");
      setSearchOpen(false);
      return;
    }
    const requestId = searchRequest.current + 1;
    searchRequest.current = requestId;
    const handle = window.setTimeout(() => {
      setSearchState("loading");
      Promise.all([
        searchColombiaPlaces(text).catch(() => null),
        getPublicExperiences({ q: text, page: 1, limit: 5 }).catch(() => null),
      ])
        .then(([places, catalog]) => {
          if (requestId !== searchRequest.current) {
            return;
          }
          if (!places && !catalog) {
            setSuggestions([]);
            setExperienceHits([]);
            setSearchState("error");
            setSearchOpen(false);
            return;
          }
          const hits = (catalog?.experiences ?? []).flatMap((experience) => {
            const latitude = Number(experience.latitude);
            const longitude = Number(experience.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              return [];
            }
            return [{
              id: experience.id,
              title: experience.title,
              place: mapCardPlace(experience),
              latitude,
              longitude,
            }];
          });
          const placeList = places ?? [];
          setSuggestions(placeList);
          setExperienceHits(hits);
          setSearchState(placeList.length || hits.length ? "idle" : "empty");
          setSearchOpen(true);
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query]);

  const visibleExperiences = useMemo(
    () => applyMapResults(experiences, filters, active ? sort : sort === "near" ? "recent" : sort),
    [active, experiences, filters, sort],
  );
  const categories = useMemo(() => categoryOptions(experiences), [experiences]);

  useEffect(() => {
    if (loading) {
      return;
    }
    const pending = pendingSelect.current;
    if (pending && experiences.some((item) => item.id === pending)) {
      setSelectedId(pending);
      setFocusToken((value) => value + 1);
      pendingSelect.current = null;
    }
  }, [experiences, loading]);

  useEffect(() => {
    if (loading || !selectedId) {
      return;
    }
    if (!visibleExperiences.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [loading, selectedId, visibleExperiences]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.getElementById(`nearby-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior });
  }, [selectedId]);

  const points = useMemo<ExplorerMapPoint[]>(() => {
    return visibleExperiences.flatMap((experience) => {
      const latitude = Number(experience.latitude);
      const longitude = Number(experience.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return [];
      }
      return [{
        id: experience.id,
        title: experience.title,
        latitude,
        longitude,
        imageUrl: experienceCoverUrl(experience, 160),
        place: mapCardPlace(experience),
        priceLabel: formatPrice(experience.price, experience.currency),
        distanceKm: experience.distanceKm,
      }];
    });
  }, [visibleExperiences]);

  const selectFromMap = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  function selectFromList(id: string) {
    setSelectedId(id);
    setFocusToken((value) => value + 1);
  }

  function returnToPersonalPlace() {
    setExplore(null);
    setQuery("");
    setSuggestions([]);
    setSearchOpen(false);
    setSearchState("idle");
    setSelectedId(null);
  }

  function chooseExperience(hit: ExperienceHit) {
    pendingSelect.current = hit.id;
    setExplore({
      latitude: hit.latitude,
      longitude: hit.longitude,
      label: hit.title,
      detail: hit.place,
    });
    setQuery(hit.title);
    setSuggestions([]);
    setExperienceHits([]);
    setSearchOpen(false);
    setSearchState("idle");
    setSelectedId(hit.id);
  }

  async function choosePlace(suggestion: ColombiaPlaceSuggestion) {
    setSearchOpen(false);
    setQuery(suggestion.label);
    setSearchState("loading");
    try {
      const match = await resolveColombiaPlace(suggestion);
      if (!match) {
        setSearchState("empty");
        return;
      }
      setExplore({
        latitude: match.lat,
        longitude: match.lng,
        label: suggestion.label,
        detail: suggestion.detail,
      });
      setSelectedId(null);
      setSearchState("idle");
    } catch {
      setSearchState("error");
    }
  }

  function shareCurrentLocation() {
    if (!navigator.geolocation) {
      setShareError("Este navegador no puede compartir la ubicación.");
      return;
    }
    setShareError("");
    setSharing(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          try {
            await saveSharedMapLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              currentLocationShared: true,
            });
            setExplore(null);
            setQuery("");
            setSuggestions([]);
            setSearchOpen(false);
            setSelectedId(null);
            await refresh();
          } catch {
            setShareError("No pudimos guardar tu ubicación.");
          } finally {
            setSharing(false);
          }
        })();
      },
      () => {
        setSharing(false);
        setShareError("No pudimos acceder a tu ubicación. Revisa el permiso del navegador.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  async function stopSharing() {
    setShareError("");
    setSharing(true);
    try {
      await saveSharedMapLocation({
        latitude: null,
        longitude: null,
        currentLocationShared: false,
      });
      setExplore(null);
      setQuery("");
      setSuggestions([]);
      setSearchOpen(false);
      setSelectedId(null);
      await refresh();
    } catch {
      setShareError("No pudimos dejar de compartir tu ubicación.");
    } finally {
      setSharing(false);
    }
  }

  let experienceBody = null;
  if (authLoading || waitingForPlace) {
    experienceBody = <p className="explorer-map-page__status">Preparando el mapa…</p>;
  } else if (!active) {
    experienceBody = (
      <p className="explorer-map-page__status">
        {user
          ? "Busca un lugar o comparte tu ubicación actual para ver experiencias cercanas."
          : "Busca un municipio para ver experiencias en esa zona."}
      </p>
    );
  } else if (loading) {
    experienceBody = <p className="explorer-map-page__status">Buscando experiencias cercanas…</p>;
  } else if (error) {
    experienceBody = (
      <div className="explorer-map-page__empty">
        <p className="explorer-map-page__empty-title">{error}</p>
        <button type="button" className="explorer-empty__cta" onClick={() => setReloadKey((value) => value + 1)}>
          Intentar de nuevo
        </button>
      </div>
    );
  } else if (points.length === 0) {
    experienceBody = filtersAreActive(filters) ? (
      <div className="explorer-map-page__empty">
        <p className="explorer-map-page__empty-title">Ninguna experiencia coincide con estos filtros.</p>
        <button type="button" className="explorer-map-tools__clear" onClick={() => setFilters(EMPTY_MAP_FILTERS)}>
          Limpiar filtros
        </button>
      </div>
    ) : (
      <p className="explorer-map-page__status">Aún no encontramos experiencias en esta zona.</p>
    );
  } else {
    experienceBody = (
      <ul className="explorer-map-page__list">
        {points.map((point) => {
          const selected = point.id === selectedId;
          return (
            <li key={point.id} id={`nearby-${point.id}`}>
              <button
                type="button"
                className={`explorer-map-card${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => selectFromList(point.id)}
              >
                <img src={point.imageUrl} alt="" />
                <span className="explorer-map-card__copy">
                  <span className="explorer-map-card__title">{point.title}</span>
                  {point.place ? <span className="explorer-map-card__place">{point.place}</span> : null}
                  <span className="explorer-map-card__meta">
                    {Number.isFinite(point.distanceKm) ? `${formatDistance(point.distanceKm)} · ` : null}
                    {point.priceLabel}
                  </span>
                </span>
              </button>
              {selected ? <MapExperienceReviews experienceId={point.id} /> : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <main ref={pageRef} className="explorer-map-page" aria-labelledby="nearby-map-title">
      <div className="explorer-map-page__stage">
        <aside className="explorer-map-page__panel">
          <span className="explorer-map-page__handle" aria-hidden="true" />
          <div className="explorer-map-page__head">
            <h1 id="nearby-map-title">Mi ubicación</h1>
            <label className="explorer-map-search">
              <Search size={15} strokeWidth={1.7} aria-hidden="true" />
              <input
                type="search"
                value={query}
                placeholder="Buscar municipio o lugar"
                aria-label="Buscar municipio o lugar"
                aria-expanded={searchOpen && (suggestions.length > 0 || experienceHits.length > 0)}
                aria-controls="map-place-results"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchState("idle");
                }}
                onFocus={() => {
                  if (suggestions.length > 0 || experienceHits.length > 0) {
                    setSearchOpen(true);
                  }
                }}
              />
            </label>
            {searchState === "loading" ? <p className="explorer-map-search__note">Buscando…</p> : null}
            {searchState === "empty" ? (
              <p className="explorer-map-search__note">No encontramos ese lugar. El mapa sigue donde estaba.</p>
            ) : null}
            {searchState === "error" ? (
              <p className="explorer-map-search__note">No pudimos buscar ahora. El mapa sigue donde estaba.</p>
            ) : null}
            {searchOpen && (suggestions.length > 0 || experienceHits.length > 0) ? (
              <ul id="map-place-results" className="explorer-map-search__results" role="listbox">
                {experienceHits.length > 0 ? <li className="explorer-map-search__group">Experiencias</li> : null}
                {experienceHits.map((item) => (
                  <li key={item.id}>
                    <button type="button" role="option" onClick={() => chooseExperience(item)}>
                      <strong>{item.title}</strong>
                      {item.place ? <span>{item.place}</span> : null}
                    </button>
                  </li>
                ))}
                {suggestions.length > 0 ? <li className="explorer-map-search__group">Lugares</li> : null}
                {suggestions.map((item) => (
                  <li key={item.key}>
                    <button type="button" role="option" onClick={() => void choosePlace(item)}>
                      <strong>{item.label}</strong>
                      {item.detail ? <span>{item.detail}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {user ? (
              shared ? (
                <div className="explorer-map-share">
                  <p className="explorer-map-share__status">
                    <LocateFixed size={15} strokeWidth={1.7} aria-hidden="true" />
                    Ubicación actual compartida
                  </p>
                  <button type="button" className="explorer-map-share__stop" onClick={() => void stopSharing()} disabled={sharing}>
                    <LocateFixed size={15} strokeWidth={1.7} aria-hidden="true" />
                    {sharing ? "Guardando…" : "Dejar de compartir mi ubicación"}
                  </button>
                </div>
              ) : (
                <button type="button" className="explorer-map-share__action" onClick={shareCurrentLocation} disabled={sharing}>
                  <LocateFixed size={15} strokeWidth={1.7} aria-hidden="true" />
                  {sharing ? "Compartiendo…" : "Compartir mi ubicación actual"}
                </button>
              )
            ) : (
              <Link to="/login" className="explorer-map-share__action">
                <LocateFixed size={15} strokeWidth={1.7} aria-hidden="true" />
                Compartir mi ubicación actual
              </Link>
            )}
            {shareError ? <p className="explorer-map-search__note">{shareError}</p> : null}
            {explore ? (
              <p className="explorer-map-place">
                <span>Explorando</span>
                <strong>{[explore.label, explore.detail].filter(Boolean).join(" · ")}</strong>
              </p>
            ) : profilePlace ? (
              <p className="explorer-map-place">
                <span>{shared ? "Ubicación actual" : "Mi ubicación"}</span>
                <strong>{city && department ? `${city} · ${department}` : profilePlace}</strong>
              </p>
            ) : !authLoading ? (
              <p className="explorer-map-search__note">
                {user
                  ? "Puedes buscar un lugar o compartir tu ubicación actual."
                  : "Puedes buscar un municipio para explorar el mapa."}
              </p>
            ) : null}
            {placeMiss && !explore && !shared ? (
              <p className="explorer-map-search__note">No pudimos ubicar el municipio. Puedes buscarlo o compartir tu ubicación.</p>
            ) : null}
            {explore && personal ? (
              <button type="button" className="explorer-map-share__quiet" onClick={returnToPersonalPlace}>
                Volver a mi zona
              </button>
            ) : null}
            <div className="explorer-map-tools" ref={toolsRef}>
              <button
                type="button"
                className={`explorer-map-tools__button${filtersAreActive(filters) ? " is-active" : ""}`}
                aria-expanded={menu === "filters"}
                onClick={() => setMenu((current) => (current === "filters" ? null : "filters"))}
              >
                <SlidersHorizontal size={14} strokeWidth={1.7} aria-hidden="true" />
                Filtros
              </button>
              <button
                type="button"
                className="explorer-map-tools__button"
                aria-expanded={menu === "sort"}
                onClick={() => setMenu((current) => (current === "sort" ? null : "sort"))}
              >
                Ordenar
              </button>
              {menu === "filters" ? (
                <div className="explorer-map-tools__menu" role="dialog" aria-label="Filtros">
                  <div className="explorer-map-tools__menu-body">
                  {categories.length > 0 ? (
                    <fieldset>
                      <legend>Categoría</legend>
                      {categories.map((name) => (
                        <label key={name}>
                          <input
                            type="checkbox"
                            checked={filters.categories.includes(name)}
                            onChange={() => {
                              setFilters((current) => ({
                                ...current,
                                categories: current.categories.includes(name)
                                  ? current.categories.filter((item) => item !== name)
                                  : [...current.categories, name],
                              }));
                            }}
                          />
                          {name}
                        </label>
                      ))}
                    </fieldset>
                  ) : (
                    <p>Las categorías aparecen cuando hay experiencias en esta zona.</p>
                  )}
                  <fieldset>
                    <legend>Precio</legend>
                    {([
                      ["free", "Gratis"],
                      ["to50", "Hasta $50.000"],
                      ["mid", "$50.000 – $100.000"],
                      ["over100", "Más de $100.000"],
                    ] as const).map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="map-price"
                          checked={filters.price === value}
                          onChange={() => setFilters((current) => ({ ...current, price: value as MapPriceBand }))}
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  <fieldset>
                    <legend>Distancia</legend>
                    {([
                      [5, "Hasta 5 km"],
                      [10, "Hasta 10 km"],
                      [25, "Hasta 25 km"],
                      [50, "Hasta 50 km"],
                    ] as const).map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="map-distance"
                          checked={filters.distance === value}
                          onChange={() => setFilters((current) => ({ ...current, distance: value as MapDistanceBand }))}
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  <fieldset>
                    <legend>Valoración</legend>
                    {([
                      [4, "4 estrellas o más"],
                      [3, "3 estrellas o más"],
                    ] as const).map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="map-rating"
                          checked={filters.rating === value}
                          onChange={() => setFilters((current) => ({ ...current, rating: value as MapRatingBand }))}
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  </div>
                  <button type="button" className="explorer-map-tools__clear" onClick={() => setFilters(EMPTY_MAP_FILTERS)}>
                    Limpiar filtros
                  </button>
                </div>
              ) : null}
              {menu === "sort" ? (
                <div className="explorer-map-tools__menu is-sort" role="dialog" aria-label="Ordenar">
                  {([
                    ["near", "Más cercanas"],
                    ["rating", "Mejor valoradas"],
                    ["price-asc", "Menor precio"],
                    ["price-desc", "Mayor precio"],
                    ["recent", "Más recientes"],
                  ] as const).map(([value, label]) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="map-sort"
                        checked={sort === value}
                        onChange={() => {
                          setSort(value as MapSort);
                          setMenu(null);
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="explorer-map-page__body" aria-live="polite">
            <h2 className="explorer-map-page__section">
              {explore ? `Experiencias en ${explore.label}` : "Experiencias cerca de ti"}
            </h2>
            {active && !loading && !error ? (
              <p className="explorer-map-page__status">{resultsCount(points.length)}</p>
            ) : null}
            {experienceBody}
          </div>
        </aside>
        <div className="explorer-map-page__canvas">
          <ExplorerNearbyMap
            enabled={!authLoading}
            preciseLocation={shared}
            view={view}
            canRecenter={Boolean(personal)}
            onRecenter={returnToPersonalPlace}
            points={active ? points : EMPTY_POINTS}
            selectedId={selectedId}
            focusToken={focusToken}
            onSelect={selectFromMap}
          />
        </div>
      </div>
    </main>
  );
}
