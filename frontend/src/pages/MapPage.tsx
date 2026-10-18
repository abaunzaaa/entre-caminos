import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, Search } from "lucide-react";
import {
  COLOMBIA_MAP_OVERVIEW,
  ExplorerNearbyMap,
  type ExplorerMapPoint,
  type ExplorerMapView,
} from "../components/explorer/ExplorerNearbyMap";
import { experienceCoverUrl } from "../components/explorer/explorer-media";
import { useAuth } from "../hooks/useAuth";
import { getExperiencesNear, type NearbyExperience } from "../services/catalog.service";
import { saveSharedMapLocation } from "../services/onboarding.service";
import { formatPrice } from "../utils/cn";
import { mapCardPlace } from "../utils/experience-region";
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

function nearbyLead(count: number) {
  if (count === 1) {
    return "Un lugar en esta zona.";
  }
  return `${count} lugares en esta zona.`;
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
  const searchRequest = useRef(0);

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
      setSearchState("idle");
      setSearchOpen(false);
      return;
    }
    const requestId = searchRequest.current + 1;
    searchRequest.current = requestId;
    const handle = window.setTimeout(() => {
      setSearchState("loading");
      searchColombiaPlaces(text)
        .then((list) => {
          if (requestId !== searchRequest.current) {
            return;
          }
          setSuggestions(list);
          setSearchState(list.length ? "idle" : "empty");
          setSearchOpen(true);
        })
        .catch(() => {
          if (requestId !== searchRequest.current) {
            return;
          }
          setSuggestions([]);
          setSearchState("error");
          setSearchOpen(false);
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (selectedId && !experiences.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [experiences, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.getElementById(`nearby-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior });
  }, [selectedId]);

  const points = useMemo<ExplorerMapPoint[]>(() => {
    return experiences.flatMap((experience) => {
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
  }, [experiences]);

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
    experienceBody = (
      <p className="explorer-map-page__status">Aún no encontramos experiencias en esta zona.</p>
    );
  } else {
    experienceBody = (
      <ul className="explorer-map-page__list">
        {points.map((point) => {
          const selected = point.id === selectedId;
          return (
            <li key={point.id}>
              <button
                type="button"
                id={`nearby-${point.id}`}
                className={`explorer-map-card${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => selectFromList(point.id)}
              >
                <img src={point.imageUrl} alt="" />
                <span className="explorer-map-card__copy">
                  <span className="explorer-map-card__title">{point.title}</span>
                  {point.place ? <span className="explorer-map-card__place">{point.place}</span> : null}
                  <span className="explorer-map-card__price">{point.priceLabel}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <main className="explorer-map-page" aria-labelledby="nearby-map-title">
      <div className="explorer-map-page__stage">
        <aside className="explorer-map-page__panel">
          <span className="explorer-map-page__handle" aria-hidden="true" />
          <div className="explorer-map-page__head">
            <h1 id="nearby-map-title">{shared ? "Mi ubicación actual" : "Mi ubicación"}</h1>
            <label className="explorer-map-search">
              <Search size={15} strokeWidth={1.7} aria-hidden="true" />
              <input
                type="search"
                value={query}
                placeholder="Buscar municipio o lugar"
                aria-label="Buscar municipio o lugar"
                aria-expanded={searchOpen && suggestions.length > 0}
                aria-controls="map-place-results"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchState("idle");
                }}
                onFocus={() => {
                  if (suggestions.length > 0) {
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
            {searchOpen && suggestions.length > 0 ? (
              <ul id="map-place-results" className="explorer-map-search__results" role="listbox">
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
                  <p>
                    <LocateFixed size={14} strokeWidth={1.7} aria-hidden="true" />
                    Ubicación compartida
                  </p>
                  <button type="button" onClick={() => void stopSharing()} disabled={sharing}>
                    {sharing ? "Guardando…" : "Dejar de compartir"}
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
                Inicia sesión para compartir tu ubicación actual
              </Link>
            )}
            {shareError ? <p className="explorer-map-search__note">{shareError}</p> : null}
            {explore ? (
              <p className="explorer-map-place">
                <span>Explorando</span>
                <strong>{explore.label}</strong>
                {explore.detail ? <span>{explore.detail}</span> : null}
              </p>
            ) : profilePlace ? (
              <p className="explorer-map-place">
                <strong>{city || department}</strong>
                {department && city ? <span>{profilePlace}</span> : null}
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
          </div>
          <div className="explorer-map-page__body" aria-live="polite">
            <h2 className="explorer-map-page__section">Experiencias cercanas</h2>
            {active && !loading && !error && points.length > 0 ? (
              <p className="explorer-map-page__status">{nearbyLead(points.length)}</p>
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
