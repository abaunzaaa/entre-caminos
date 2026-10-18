import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Heart, LocateFixed, Search, Trash2, X } from "lucide-react";
import {
  COLOMBIA_MAP_OVERVIEW,
  ExplorerNearbyMap,
  type ExplorerMapPoint,
  type ExplorerMapView,
} from "../components/explorer/ExplorerNearbyMap";
import { experienceCoverUrl } from "../components/explorer/explorer-media";
import { useAuth } from "../hooks/useAuth";
import { useFavoriteToggle } from "../hooks/useFavoriteToggle";
import { getExperiencesNear, getPublicExperiences, type NearbyExperience } from "../services/catalog.service";
import { listFavoriteIds } from "../services/favorites.service";
import { onFavoritesChanged } from "../services/favorites-sync";
import { saveSharedMapLocation } from "../services/onboarding.service";
import mapaIcon from "../assets/mapa-icon.png";
import { COLOMBIA_DEPARTMENTS, findMunicipality } from "../data/colombia-locations";
import { formatPrice } from "../utils/cn";
import { mapCardPlace, mapCardRegion } from "../utils/experience-region";
import {
  applyMapResults,
  categoryOptions,
  EMPTY_MAP_FILTERS,
  filtersAreActive,
  MAP_COMPANIONS,
  type MapFilters,
  type MapPriceBand,
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
type ExplorePlace = MapPoint & {
  label: string;
  detail: string;
  municipality: string;
  department: string;
};

function isKnownMunicipality(label: string) {
  return COLOMBIA_DEPARTMENTS.some((department) => Boolean(findMunicipality(department.name, label)));
}

function foldPlace(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function matchesExploredMunicipality(experience: NearbyExperience, place: ExplorePlace) {
  const region = mapCardRegion(experience);
  if (!region.municipality || foldPlace(region.municipality) !== foldPlace(place.municipality)) {
    return false;
  }
  if (place.department && region.department && foldPlace(region.department) !== foldPlace(place.department)) {
    return false;
  }
  return true;
}

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

function formatDistance(km: number) {
  const digits = km < 10 ? 1 : 0;
  return `${new Intl.NumberFormat("es-CO", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(km)} km`;
}

const NEW_EXPERIENCE_MS = 5 * 24 * 60 * 60 * 1000;

function publicationTime(experience: NearbyExperience) {
  const reviewed = experience.reviewedAt ? new Date(experience.reviewedAt).getTime() : Number.NaN;
  if (Number.isFinite(reviewed)) {
    return reviewed;
  }
  const created = new Date(experience.createdAt).getTime();
  return Number.isFinite(created) ? created : Number.NaN;
}

function cardBadge(experience: NearbyExperience) {
  const published = publicationTime(experience);
  const now = Date.now();
  if (Number.isFinite(published) && published <= now && now - published < NEW_EXPERIENCE_MS) {
    return "Nuevo";
  }
  if (experience.mostVisited) {
    return "Popular";
  }
  return null;
}

function ratingPresentation(experience: NearbyExperience) {
  if (experience.averageRating == null || !experience.reviewCount) {
    return null;
  }
  const value = experience.averageRating;
  const tone = value >= 4.5 ? "high" : value >= 4 ? "good" : value >= 3 ? "mid" : "low";
  const word = tone === "high" ? "Perfecto" : tone === "good" ? "Bueno" : tone === "mid" ? "Medio" : "Bajo";
  const score = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return { tone, word, score, value };
}

function StarMarks({ value }: { value: number }) {
  const shown = Math.round(value * 2) / 2;
  return (
    <span className="explorer-map-card__stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => {
        const amount = Math.max(0, Math.min(1, shown - index));
        return (
          <span key={index} className="explorer-map-card__star">
            <span className="explorer-map-card__star-base">★</span>
            <span className="explorer-map-card__star-fill" style={{ width: `${amount * 100}%` }}>★</span>
          </span>
        );
      })}
    </span>
  );
}

function MapExplorerCard({
  experience,
  place,
  distance,
  imageUrl,
  selected,
  favorited,
  onSelect,
}: {
  experience: NearbyExperience;
  place: string;
  distance: string;
  imageUrl: string;
  selected: boolean;
  favorited: boolean;
  onSelect: () => void;
}) {
  const { favorited: saved, busy, toggle } = useFavoriteToggle(experience.id, {
    initialFavorited: favorited,
    experienceTitle: experience.title,
    loginRedirectTo: "/mapa",
  });
  const rating = ratingPresentation(experience);
  const badge = cardBadge(experience);

  return (
    <article className={`explorer-map-card${selected ? " is-selected" : ""}`}>
      <button type="button" className="explorer-map-card__main" aria-pressed={selected} onClick={onSelect}>
        <span className="explorer-map-card__media">
          <img src={imageUrl} alt="" />
          {badge ? <span className="explorer-map-card__badge">{badge}</span> : null}
        </span>
        <span className="explorer-map-card__body">
          <span className="explorer-map-card__title">{experience.title}</span>
          <span className="explorer-map-card__price">{formatPrice(experience.price, experience.currency)}</span>
          <span className="explorer-map-card__place" aria-hidden={place ? undefined : true}>
            {place || "\u00a0"}
          </span>
          <span className="explorer-map-card__meta" aria-hidden={distance ? undefined : true}>
            {distance || "\u00a0"}
          </span>
          <span className={`explorer-map-card__rating${rating ? ` is-${rating.tone}` : " is-empty"}`}>
            {rating ? (
              <>
                <span className="explorer-map-card__score">
                  <span className="explorer-map-card__pill">{rating.score}</span>
                  <span className="explorer-map-card__word">{rating.word}</span>
                </span>
                <StarMarks value={rating.value} />
              </>
            ) : (
              <span className="explorer-map-card__word">Sin reseñas</span>
            )}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={`explorer-map-card__fav${saved ? " is-saved" : ""}`}
        aria-label={saved ? "Quitar de favoritos" : "Añadir a favoritos"}
        aria-pressed={saved}
        disabled={busy}
        onClick={toggle}
      >
        <Heart size={12} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      </button>
    </article>
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  const [nameMatches, setNameMatches] = useState<NearbyExperience[]>([]);
  const [suggestions, setSuggestions] = useState<ColombiaPlaceSuggestion[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [filters, setFilters] = useState<MapFilters>(EMPTY_MAP_FILTERS);
  const [sort] = useState<MapSort>("near");
  const [menu, setMenu] = useState<"category" | "price" | "company" | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const searchRequest = useRef(0);
  const chosenPlaceQuery = useRef("");
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
    if (!menu && !searchOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menu && !toolsRef.current?.contains(target)) {
        setMenu(null);
      }
      if (searchOpen && !toolsRef.current?.contains(target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menu, searchOpen]);

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

  const nameFocus = useMemo(() => {
    if (explore || searchQuery.trim().length < 2) {
      return null;
    }
    const hit = nameMatches.find((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)));
    if (!hit) {
      return null;
    }
    return { latitude: Number(hit.latitude), longitude: Number(hit.longitude) };
  }, [explore, nameMatches, searchQuery]);

  const sourceKey = explore
    ? `explore:${explore.latitude.toFixed(5)},${explore.longitude.toFixed(5)}`
    : nameFocus
      ? `name:${nameFocus.latitude.toFixed(5)},${nameFocus.longitude.toFixed(5)}`
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
    const point = explore ?? nameFocus ?? active ?? COLOMBIA_MAP_OVERVIEW;
    const zoom = explore || nameFocus || shared ? 13 : approx && !explore ? 12 : COLOMBIA_MAP_OVERVIEW.zoom;
    return {
      latitude: point.latitude,
      longitude: point.longitude,
      zoom,
      token: viewToken,
    };
  }, [active, approx, explore, nameFocus, shared, viewToken]);

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

  const exploringPlace = Boolean(explore && foldPlace(searchQuery) === foldPlace(explore.municipality));

  useEffect(() => {
    const text = searchQuery.trim();
    if (text.length < 2 || exploringPlace) {
      setNameMatches([]);
      return;
    }
    let cancelled = false;
    getPublicExperiences({ q: text, page: 1, limit: 20 })
      .then((data) => {
        if (cancelled) {
          return;
        }
        setNameMatches(data.experiences.flatMap((experience) => {
          const latitude = Number(experience.latitude);
          const longitude = Number(experience.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return [];
          }
          const linked = experience.experienceCategories?.map((item) => item.category.name).filter(Boolean) ?? [];
          return [{
            ...experience,
            latitude,
            longitude,
            distanceKm: Number.POSITIVE_INFINITY,
            categoryNames: linked.length ? linked : experience.category?.name ? [experience.category.name] : [],
            idealFor: experience.idealFor ?? [],
          }];
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setNameMatches([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [exploringPlace, searchQuery]);

  useEffect(() => {
    const text = searchQuery.trim();
    if (text.length < 2) {
      setSuggestions([]);
      setSearchState("idle");
      setSearchOpen(false);
      if (explore) {
        setExplore(null);
      }
      return;
    }
    if (foldPlace(text) === foldPlace(chosenPlaceQuery.current)) {
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
        .then((places) => {
          if (requestId !== searchRequest.current) {
            return;
          }
          const exact = places.find((place) => foldPlace(place.label) === foldPlace(text) && isKnownMunicipality(place.label));
          if (exact) {
            void choosePlace(exact, text, requestId);
            return;
          }
          setSuggestions(places);
          setSearchState("idle");
          setSearchOpen(places.length > 0);
          setExplore((current) => (current && foldPlace(current.municipality) !== foldPlace(text) ? null : current));
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
  }, [searchQuery]);

  const locatedExperiences = useMemo(() => {
    if (exploringPlace && explore) {
      return experiences.filter((item) => matchesExploredMunicipality(item, explore));
    }
    if (searchQuery.trim().length >= 2) {
      return nameMatches;
    }
    return experiences;
  }, [explore, experiences, exploringPlace, nameMatches, searchQuery]);
  const visibleExperiences = useMemo(
    () => applyMapResults(
      locatedExperiences,
      filters,
      active ? sort : sort === "near" ? "recent" : sort,
      exploringPlace ? "" : searchQuery,
    ),
    [active, exploringPlace, filters, locatedExperiences, searchQuery, sort],
  );
  const categories = useMemo(() => categoryOptions(locatedExperiences), [locatedExperiences]);

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

  function clearExploredPlace() {
    chosenPlaceQuery.current = "";
    setExplore(null);
    setSearchQuery("");
    setNameMatches([]);
    setSuggestions([]);
    setSearchOpen(false);
    setSearchState("idle");
    setSelectedId(null);
  }

  function returnToPersonalPlace() {
    clearExploredPlace();
  }

  async function choosePlace(suggestion: ColombiaPlaceSuggestion, shown = suggestion.label, requestId = searchRequest.current) {
    setSearchOpen(false);
    setSuggestions([]);
    chosenPlaceQuery.current = shown;
    setSearchQuery(shown);
    const departmentName = suggestion.detail.split("·")[0]?.replace(/colombia/i, "").trim() ?? "";
    try {
      const match = await resolveColombiaPlace(suggestion);
      if (requestId !== searchRequest.current) {
        return;
      }
      if (!match) {
        chosenPlaceQuery.current = "";
        setSearchState("idle");
        return;
      }
      setExplore({
        latitude: match.lat,
        longitude: match.lng,
        label: suggestion.label,
        detail: suggestion.detail,
        municipality: suggestion.label,
        department: departmentName,
      });
      setSelectedId(null);
      setSearchState("idle");
    } catch {
      if (requestId === searchRequest.current) {
        chosenPlaceQuery.current = "";
        setSearchState("error");
      }
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
            clearExploredPlace();
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
      clearExploredPlace();
      await refresh();
    } catch {
      setShareError("No pudimos dejar de compartir tu ubicación.");
    } finally {
      setSharing(false);
    }
  }

  let experienceBody = null;
  let searchMiss = false;
  if (authLoading || waitingForPlace) {
    experienceBody = <p className="explorer-map-page__status">Preparando el mapa…</p>;
  } else if (!active && searchQuery.trim().length < 2) {
    experienceBody = (
      <p className="explorer-map-page__status">
        {user
          ? "Busca una experiencia o comparte tu ubicación actual."
          : "Busca una experiencia para ver el mapa en esa zona."}
      </p>
    );
  } else if (loading && (exploringPlace || searchQuery.trim().length < 2)) {
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
    searchMiss = Boolean(searchQuery.trim() || filtersAreActive(filters) || exploringPlace);
    experienceBody = searchMiss ? (
      <div className="explorer-map-page__void">
        <img src={mapaIcon} alt="" />
        <p className="explorer-map-page__void-title">No encontramos experiencias relacionadas</p>
        <p>Prueba con otro nombre, municipio o lugar.</p>
      </div>
    ) : (
      <div className="explorer-map-page__empty explorer-map-page__empty--search">
        <p className="explorer-map-page__empty-title">Aún no encontramos experiencias en esta zona.</p>
      </div>
    );
  } else {
    experienceBody = (
      <ul className="explorer-map-page__list">
        {points.map((point) => {
          const experience = visibleExperiences.find((item) => item.id === point.id);
          if (!experience) {
            return null;
          }
          const selected = point.id === selectedId;
          return (
            <li key={point.id} id={`nearby-${point.id}`}>
              <MapExplorerCard
                experience={experience}
                place={point.place}
                distance={active && Number.isFinite(point.distanceKm) ? formatDistance(point.distanceKm) : ""}
                imageUrl={experienceCoverUrl(experience, 640)}
                selected={selected}
                favorited={favoriteIds.has(point.id)}
                onSelect={() => selectFromList(point.id)}
              />
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
            <div className="explorer-map-heading">
              <h1 id="nearby-map-title">Mi ubicación</h1>
              {profilePlace ? (
                <p className="explorer-map-place">
                  <strong>{city && department ? `${city} · ${department}` : profilePlace}</strong>
                </p>
              ) : !authLoading ? (
                <p className="explorer-map-search__note">
                  {user
                    ? "Comparte tu ubicación o busca una experiencia."
                    : "Busca una experiencia para explorar el mapa."}
                </p>
              ) : (
                <span className="explorer-map-place" />
              )}
              <div className="explorer-map-share">
                {user ? (
                  <button
                    type="button"
                    className={`explorer-map-share__toggle${shared ? " is-active" : ""}`}
                    aria-pressed={Boolean(shared)}
                    aria-label={shared ? "Compartiendo ubicación" : "Compartir ubicación"}
                    title={shared ? "Dejar de compartir" : "Compartir ubicación"}
                    disabled={sharing}
                    onClick={() => {
                      if (shared) {
                        void stopSharing();
                        return;
                      }
                      shareCurrentLocation();
                    }}
                  >
                    <LocateFixed size={13} strokeWidth={1.8} aria-hidden="true" />
                    {sharing ? "Guardando…" : shared ? "Compartiendo ubicación" : "Compartir ubicación"}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="explorer-map-share__toggle"
                    aria-label="Compartir ubicación"
                    title="Compartir ubicación"
                  >
                    <LocateFixed size={13} strokeWidth={1.8} aria-hidden="true" />
                    Compartir ubicación
                  </Link>
                )}
              </div>
              {explore ? (
                <button type="button" className="explorer-map-share__quiet" onClick={returnToPersonalPlace}>
                  Volver a mi zona
                </button>
              ) : null}
            </div>
            {shareError ? <p className="explorer-map-search__note">{shareError}</p> : null}
            {placeMiss && !explore && !shared ? (
              <p className="explorer-map-search__note">No pudimos ubicar el municipio. Puedes buscar una experiencia o compartir tu ubicación.</p>
            ) : null}
            <hr className="explorer-map-rule" />
            <div className="explorer-map-tools" ref={toolsRef}>
              <div className="explorer-map-tools__top">
                <label className="explorer-map-name">
                  <Search size={13} strokeWidth={1.8} aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    placeholder="Buscar experiencia o lugar"
                    aria-label="Buscar experiencia o lugar"
                    aria-expanded={searchOpen && suggestions.length > 0}
                    aria-controls="map-place-results"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(event) => {
                      chosenPlaceQuery.current = "";
                      setSearchQuery(event.target.value);
                    }}
                    onFocus={() => {
                      setMenu(null);
                      if (suggestions.length > 0) {
                        setSearchOpen(true);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && suggestions[0]) {
                        event.preventDefault();
                        void choosePlace(suggestions[0], suggestions[0].label);
                      }
                    }}
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      className="explorer-map-name__clear"
                      aria-label="Limpiar búsqueda"
                      title="Limpiar búsqueda"
                      onClick={clearExploredPlace}
                    >
                      <X size={14} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  ) : null}
                </label>
                <button
                  type="button"
                  className="explorer-map-tools__clear"
                  aria-label="Limpiar filtros"
                  title="Limpiar filtros"
                  onClick={() => setFilters(EMPTY_MAP_FILTERS)}
                >
                  <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
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
              <div className="explorer-map-tools__facets">
                <button
                  type="button"
                  className={`explorer-map-tools__facet${filters.categories.length ? " is-active" : ""}`}
                  aria-expanded={menu === "category"}
                  onClick={() => setMenu((current) => (current === "category" ? null : "category"))}
                >
                  Categoría
                  <ChevronDown size={12} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`explorer-map-tools__facet${filters.price ? " is-active" : ""}`}
                  aria-expanded={menu === "price"}
                  onClick={() => setMenu((current) => (current === "price" ? null : "price"))}
                >
                  Precio
                  <ChevronDown size={12} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`explorer-map-tools__facet${filters.companions.length ? " is-active" : ""}`}
                  aria-expanded={menu === "company"}
                  onClick={() => setMenu((current) => (current === "company" ? null : "company"))}
                >
                  Compañía
                  <ChevronDown size={12} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
              {menu === "category" ? (
                <div className="explorer-map-tools__menu" role="dialog" aria-label="Categoría">
                  <div className="explorer-map-tools__menu-body">
                    {categories.length > 0 ? (
                      categories.map((name) => (
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
                      ))
                    ) : (
                      <p>Las categorías aparecen cuando hay experiencias en esta zona.</p>
                    )}
                  </div>
                </div>
              ) : null}
              {menu === "price" ? (
                <div className="explorer-map-tools__menu" role="dialog" aria-label="Precio">
                  <div className="explorer-map-tools__menu-body">
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
                  </div>
                </div>
              ) : null}
              {menu === "company" ? (
                <div className="explorer-map-tools__menu" role="dialog" aria-label="Compañía">
                  <div className="explorer-map-tools__menu-body">
                    {MAP_COMPANIONS.map((value) => (
                      <label key={value}>
                        <input
                          type="checkbox"
                          checked={filters.companions.includes(value)}
                          onChange={() => {
                            setFilters((current) => ({
                              ...current,
                              companions: current.companions.includes(value)
                                ? current.companions.filter((item) => item !== value)
                                : [...current.companions, value],
                            }));
                          }}
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className={`explorer-map-page__body${searchMiss ? " is-void" : ""}`} aria-live="polite">
            <h2 className="explorer-map-page__section">
              {exploringPlace && explore
                ? `Experiencias en ${explore.municipality}`
                : searchQuery.trim()
                  ? "Experiencias relacionadas"
                  : "Experiencias cerca de ti"}
            </h2>
            {!loading && points.length > 0 ? (
              <p className="explorer-map-result-count">
                <strong>{points.length}</strong>
                <span>{points.length === 1 ? "experiencia encontrada" : "experiencias encontradas"}</span>
              </p>
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
