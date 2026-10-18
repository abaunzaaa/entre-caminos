import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExplorerNearbyMap, type ExplorerMapPoint } from "../components/explorer/ExplorerNearbyMap";
import { experienceCoverUrl } from "../components/explorer/explorer-media";
import { useAuth } from "../hooks/useAuth";
import mapaIcon from "../assets/mapa-icon.png";
import { getExperiencesNear, type NearbyExperience } from "../services/catalog.service";
import { formatPrice } from "../utils/cn";
import { mapCardPlace } from "../utils/experience-region";
import "../styles/explorer-map.css";

const EMPTY_POINTS: ExplorerMapPoint[] = [];

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
    return "Un lugar cerca de ti.";
  }
  return `${count} lugares cerca de ti.`;
}

export function MapPage() {
  const { user, loading: authLoading } = useAuth();
  const userLocation = useMemo(() => profileCoordinates(user?.profile), [user?.profile]);
  const [experiences, setExperiences] = useState<NearbyExperience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  useEffect(() => {
    if (authLoading || !userLocation) {
      setExperiences([]);
      setLoading(false);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getExperiencesNear(userLocation.latitude, userLocation.longitude)
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
  }, [authLoading, reloadKey, userLocation]);

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

  let panelBody = null;
  if (authLoading) {
    panelBody = <p className="explorer-map-page__status">Buscando tu ubicación…</p>;
  } else if (!user) {
    panelBody = (
      <div className="explorer-map-page__empty">
        <p className="explorer-map-page__empty-title">Inicia sesión para ver qué experiencias hay cerca de ti.</p>
        <p>Tomamos la ubicación que guardaste en tu perfil.</p>
        <Link to="/login" className="explorer-empty__cta">Acceder</Link>
      </div>
    );
  } else if (!userLocation) {
    panelBody = (
      <div className="explorer-map-page__empty">
        <img src={mapaIcon} alt="" />
        <p className="explorer-map-page__empty-title">Todavía no tenemos el punto exacto de tu ubicación.</p>
        <p>En tu perfil puedes guardar la latitud y la longitud. Con eso te mostramos las experiencias que hay cerca.</p>
        <Link to="/perfil/editar" className="explorer-empty__cta">Completar ubicación</Link>
      </div>
    );
  } else if (loading) {
    panelBody = <p className="explorer-map-page__status">Buscando experiencias cerca de ti…</p>;
  } else if (error) {
    panelBody = (
      <div className="explorer-map-page__empty">
        <p className="explorer-map-page__empty-title">{error}</p>
        <button type="button" className="explorer-empty__cta" onClick={() => setReloadKey((value) => value + 1)}>
          Intentar de nuevo
        </button>
      </div>
    );
  } else if (points.length === 0) {
    panelBody = (
      <div className="explorer-map-page__empty">
        <img src={mapaIcon} alt="" />
        <p className="explorer-map-page__empty-title">Aún no encontramos experiencias cerca de ti.</p>
        <p>Tu ubicación sigue en el mapa. Los lugares publicados en esta zona van a aparecer aquí.</p>
      </div>
    );
  } else {
    panelBody = (
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

  let lead = "Lugares publicados cerca de donde estás.";
  if (!authLoading && !user) {
    lead = "Entra para ver los lugares cerca de tu ubicación.";
  } else if (!authLoading && user && !userLocation) {
    lead = "Falta el punto exacto en tu perfil.";
  } else if (userLocation && !loading && !error && points.length > 0) {
    lead = nearbyLead(points.length);
  } else if (userLocation && !loading && !error) {
    lead = "Nada publicado en esta zona, por ahora.";
  }

  return (
    <main className="explorer-map-page" aria-labelledby="nearby-map-title">
      <div className="explorer-map-page__stage">
        <aside className="explorer-map-page__panel">
          <span className="explorer-map-page__handle" aria-hidden="true" />
          <div className="explorer-map-page__head">
            <h1 id="nearby-map-title">Cerca de ti</h1>
            <p>{lead}</p>
          </div>
          <div className="explorer-map-page__body" aria-live="polite">
            {panelBody}
          </div>
        </aside>
        <div className="explorer-map-page__canvas">
          <ExplorerNearbyMap
            enabled={!authLoading}
            userLocation={userLocation}
            points={userLocation ? points : EMPTY_POINTS}
            selectedId={selectedId}
            focusToken={focusToken}
            onSelect={selectFromMap}
          />
        </div>
      </div>
    </main>
  );
}
