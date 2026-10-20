import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Map } from "lucide-react";
import { COLOMBIA_MAP_OVERVIEW, ExplorerNearbyMap, type ExplorerMapPoint, type ExplorerMapView } from "./ExplorerNearbyMap";
import { experienceCoverUrl } from "./explorer-media";
import type { MapPreviewExperience } from "../../services/catalog.service";
import { formatPrice } from "../../utils/cn";
import { mapCardPlace } from "../../utils/experience-region";
import "../../styles/explorer-map.css";

function previewPoints(experiences: MapPreviewExperience[]) {
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
      imageUrl: experienceCoverUrl(experience, 360),
      place: mapCardPlace(experience),
      priceLabel: formatPrice(experience.price, experience.currency),
      distanceKm: Number.NaN,
      categoryName: experience.categoryNames?.find((name) => name.trim())?.trim() ?? "",
      averageRating: experience.averageRating ?? null,
      reviewCount: experience.reviewCount ?? 0,
    } satisfies ExplorerMapPoint];
  });
}

function frameOf(points: ExplorerMapPoint[]): ExplorerMapView {
  if (!points.length) {
    return { ...COLOMBIA_MAP_OVERVIEW, token: 1 };
  }
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const latSpan = Math.max(...latitudes) - Math.min(...latitudes);
  const lngSpan = Math.max(...longitudes) - Math.min(...longitudes);
  const span = Math.max(latSpan, lngSpan);
  const fitted = span > 4 ? 6 : span > 1.5 ? 8 : span > 0.6 ? 10 : span > 0.2 ? 12 : 13;
  const zoom = Math.max(6, fitted - 1);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    zoom,
    token: 1,
  };
}

export function ExplorerMapPreview({ experiences }: { experiences: MapPreviewExperience[] }) {
  const points = useMemo(() => previewPoints(experiences), [experiences]);
  const view = useMemo(() => frameOf(points), [points]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  function select(id: string | null) {
    setSelectedId(id);
    if (id) {
      setFocusToken((value) => value + 1);
    }
  }

  if (!points.length) {
    return <p className="explorer-empty">Cuando haya experiencias publicadas, podrás ubicarlas aquí.</p>;
  }

  return (
    <div className="explorer-map-preview">
      <div className="explorer-map-preview__frame">
        <ExplorerNearbyMap
          variant="preview"
          enabled
          preciseLocation={null}
          view={view}
          home={{ latitude: view.latitude, longitude: view.longitude, zoom: view.zoom }}
          points={points}
          selectedId={selectedId}
          focusToken={focusToken}
          onSelect={select}
        />
      </div>
      <div className="explorer-map-preview__actions">
        <Link to="/mapa" className="explorer-map-preview__cta">
          <Map size={13} strokeWidth={1.8} aria-hidden="true" />
          Explorar mapa
        </Link>
      </div>
    </div>
  );
}
