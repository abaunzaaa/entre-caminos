import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Dumbbell, Landmark, LocateFixed, Palette, PartyPopper, Trees, Utensils, X, type LucideIcon } from "lucide-react";
import { TILE_SIZE, latLngToWorld, worldToLatLng } from "../../utils/map-projection";

const MIN_ZOOM = 5;
const MAX_ZOOM = 18;
const OVERVIEW_ZOOM = 6;
/** Vista general de Colombia. No representa la ubicación de una persona. */
export const COLOMBIA_MAP_OVERVIEW = { latitude: 4.570868, longitude: -74.297333, zoom: OVERVIEW_ZOOM };
const OVERVIEW = COLOMBIA_MAP_OVERVIEW;

export type ExplorerMapPoint = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  place: string;
  priceLabel: string;
  distanceKm: number;
  categoryName: string;
  averageRating: number | null;
  reviewCount: number;
};

export type ExplorerMapView = {
  latitude: number;
  longitude: number;
  zoom: number;
  token: number;
};

type ExplorerNearbyMapProps = {
  enabled: boolean;
  preciseLocation: { latitude: number; longitude: number } | null;
  view: ExplorerMapView;
  canRecenter: boolean;
  onRecenter: () => void;
  points: ExplorerMapPoint[];
  selectedId: string | null;
  focusToken: number;
  onSelect: (id: string | null) => void;
};

function foldCategory(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

const CATEGORY_MARKS: Array<{ match: (name: string) => boolean; Icon: LucideIcon }> = [
  { match: (name) => name.includes("gastro") || name.includes("cafe"), Icon: Utensils },
  { match: (name) => name.includes("naturaleza") || name.includes("aventura"), Icon: Trees },
  { match: (name) => name.includes("bienestar") || name.includes("deport"), Icon: Dumbbell },
  { match: (name) => name.includes("arte") || name.includes("creativ") || name.includes("artist") || name.includes("taller") || name.includes("foto") || name.includes("music") || name.includes("danza") || name.includes("literat"), Icon: Palette },
  { match: (name) => name.includes("cultur") || name.includes("histor"), Icon: Landmark },
  { match: (name) => name.includes("recre") || name.includes("nocturn"), Icon: PartyPopper },
  { match: (name) => name.includes("turist") || name.includes("urbano") || name.includes("viaje"), Icon: Compass },
];

function categoryMark(name: string) {
  const folded = foldCategory(name);
  return CATEGORY_MARKS.find((item) => item.match(folded))?.Icon ?? Compass;
}

function popupRating(point: ExplorerMapPoint) {
  if (point.averageRating == null || !point.reviewCount) {
    return null;
  }
  const value = point.averageRating;
  const tone = value >= 4.5 ? "high" : value >= 4 ? "good" : value >= 3 ? "mid" : "low";
  const word = tone === "high" ? "Perfecto" : tone === "good" ? "Bueno" : tone === "mid" ? "Medio" : "Bajo";
  const score = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return { tone, word, score, value };
}

function PopupStars({ value }: { value: number }) {
  const shown = Math.round(value * 2) / 2;
  return (
    <span className="explorer-map-popup__stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => {
        const amount = Math.max(0, Math.min(1, shown - index));
        return (
          <span key={index} className="explorer-map-popup__star">
            <span className="explorer-map-popup__star-base">★</span>
            <span className="explorer-map-popup__star-fill" style={{ width: `${amount * 100}%` }}>★</span>
          </span>
        );
      })}
    </span>
  );
}

function placePopup(
  anchor: { x: number; y: number },
  card: { width: number; height: number },
  bounds: { left: number; top: number; right: number; bottom: number },
) {
  const tail = 8;
  const pinRise = 72;
  const gap = 14;
  const maxLeft = Math.max(bounds.left, bounds.right - card.width);
  const maxTop = Math.max(bounds.top, bounds.bottom - card.height);
  const left = Math.min(Math.max(anchor.x - card.width / 2, bounds.left), maxLeft);
  let top = anchor.y - pinRise - gap - tail - card.height;
  let pointing: "down" | "up" = "down";
  if (top < bounds.top) {
    const below = anchor.y + gap + tail;
    if (below + card.height <= bounds.bottom) {
      top = below;
      pointing = "up";
    } else {
      top = Math.min(Math.max(top, bounds.top), maxTop);
    }
  } else if (top > maxTop) {
    top = maxTop;
  }
  return { left, top, pointing };
}

export function ExplorerNearbyMap({
  enabled,
  preciseLocation,
  view,
  canRecenter,
  onRecenter,
  points,
  selectedId,
  focusToken,
  onSelect,
}: ExplorerNearbyMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const movedRef = useRef(false);
  const seenFocus = useRef(focusToken);
  const seenView = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  onSelectRef.current = onSelect;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [center, setCenter] = useState({ latitude: OVERVIEW.latitude, longitude: OVERVIEW.longitude });
  const [zoom, setZoom] = useState(OVERVIEW.zoom);
  const [grabbing, setGrabbing] = useState(false);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const [popupSize, setPopupSize] = useState({ width: 300, height: 158 });
  const popupRef = useRef<HTMLElement>(null);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  centerRef.current = center;
  zoomRef.current = zoom;

  useEffect(() => {
    if (!enabled || view.token === 0 || view.token === seenView.current) {
      return;
    }
    seenView.current = view.token;
    movedRef.current = true;
    setCenter({ latitude: view.latitude, longitude: view.longitude });
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom)));
  }, [enabled, view]);

  useEffect(() => {
    if (focusToken === seenFocus.current) {
      return;
    }
    seenFocus.current = focusToken;
    const point = points.find((item) => item.id === selectedId);
    if (!point) {
      return;
    }
    movedRef.current = true;
    setCenter({ latitude: point.latitude, longitude: point.longitude });
    setZoom((current) => (current < 13 ? 13 : current));
  }, [focusToken, points, selectedId]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    function measure() {
      const current = viewportRef.current;
      if (!current) {
        return;
      }
      const rect = current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      movedRef.current = true;
      const delta = event.deltaY < 0 ? 1 : -1;
      setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)));
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [enabled]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onSelectRef.current(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const world = useMemo(
    () => latLngToWorld(center.latitude, center.longitude, zoom),
    [center.latitude, center.longitude, zoom],
  );

  const tiles = useMemo(() => {
    if (!size.width || !size.height) {
      return [];
    }
    const left = world.x - size.width / 2;
    const top = world.y - size.height / 2;
    const x0 = Math.floor(left / TILE_SIZE);
    const y0 = Math.floor(top / TILE_SIZE);
    const x1 = Math.floor((left + size.width) / TILE_SIZE);
    const y1 = Math.floor((top + size.height) / TILE_SIZE);
    const maxIndex = 2 ** zoom;
    const next: Array<{ key: string; left: number; top: number; src: string }> = [];
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        if (y < 0 || y >= maxIndex) {
          continue;
        }
        const wrappedX = ((x % maxIndex) + maxIndex) % maxIndex;
        next.push({
          key: `${zoom}-${wrappedX}-${y}-${x}`,
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
          src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        });
      }
    }
    return next;
  }, [size.height, size.width, world.x, world.y, zoom]);

  const project = useCallback(
    (latitude: number, longitude: number) => {
      const point = latLngToWorld(latitude, longitude, zoom);
      return {
        x: size.width / 2 + (point.x - world.x),
        y: size.height / 2 + (point.y - world.y),
      };
    },
    [size.height, size.width, world.x, world.y, zoom],
  );

  const onWindowPointerMove = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const point = worldToLatLng(drag.originX - dx, drag.originY - dy, zoomRef.current);
    setCenter({ latitude: point.lat, longitude: point.lng });
  }, []);

  const onWindowPointerUp = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const moved = Math.hypot(dx, dy) >= 3;
    if (moved) {
      movedRef.current = true;
      const point = worldToLatLng(drag.originX - dx, drag.originY - dy, zoomRef.current);
      setCenter({ latitude: point.lat, longitude: point.lng });
    } else {
      onSelectRef.current(null);
    }
    dragRef.current = null;
    setGrabbing(false);
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
  }, [onWindowPointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, [onWindowPointerMove, onWindowPointerUp]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
    const origin = latLngToWorld(centerRef.current.latitude, centerRef.current.longitude, zoomRef.current);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
    };
    setGrabbing(true);
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
  }

  function changeZoom(delta: number) {
    movedRef.current = true;
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)));
  }

  function recenter() {
    if (!canRecenter) {
      return;
    }
    onRecenter();
  }

  const selected = points.find((point) => point.id === selectedId) ?? null;
  const selectedPos = selected ? project(selected.latitude, selected.longitude) : null;
  const popupVisible = Boolean(
    selected &&
      selectedPos &&
      selectedPos.x > -48 &&
      selectedPos.y > -48 &&
      selectedPos.x < size.width + 48 &&
      selectedPos.y < size.height + 48,
  );
  const popupRatingView = selected ? popupRating(selected) : null;
  const popupBounds = useMemo(() => {
    const margin = 10;
    const bounds = { left: margin, top: margin + 4, right: Math.max(margin + 180, size.width - 54), bottom: Math.max(margin + 140, size.height - margin) };
    const map = viewportRef.current?.getBoundingClientRect();
    const panel = document.querySelector(".explorer-map-page__panel");
    if (map && panel instanceof HTMLElement) {
      const panelRect = panel.getBoundingClientRect();
      const overlapLeft = panelRect.right - map.left;
      const overlapBottom = map.bottom - panelRect.top;
      if (overlapLeft > 24 && overlapLeft < map.width * 0.8 && panelRect.top <= map.top + 12) {
        bounds.left = Math.max(bounds.left, overlapLeft + 12);
      }
      if (overlapBottom > 24 && panelRect.top > map.top + 80) {
        bounds.bottom = Math.min(bounds.bottom, size.height - overlapBottom - 12);
      }
    }
    return bounds;
  }, [size.height, size.width, popupVisible]);
  const popupCard = {
    width: Math.min(300, Math.max(220, popupBounds.right - popupBounds.left)),
    height: popupSize.height,
  };
  const popupPlace = selectedPos
    ? placePopup(selectedPos, popupCard, popupBounds)
    : null;

  useLayoutEffect(() => {
    const node = popupRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    setPopupSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  }, [popupVisible, selectedId, popupCard.width, size.width, size.height]);

  return (
    <div className="explorer-nearby-map">
      {enabled ? (
        <div
          ref={viewportRef}
          className={`explorer-nearby-map__viewport${grabbing ? " is-grabbing" : ""}`}
          onPointerDown={onPointerDown}
          role="application"
          aria-label="Mapa de experiencias cerca de ti"
        >
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.src}
              alt=""
              draggable={false}
              className="explorer-nearby-map__tile"
              style={{ transform: `translate(${tile.left}px, ${tile.top}px)` }}
            />
          ))}
          {preciseLocation ? (
            <span
              className="explorer-nearby-map__user"
              role="img"
              aria-label="Tu ubicación actual"
              style={{ left: project(preciseLocation.latitude, preciseLocation.longitude).x, top: project(preciseLocation.latitude, preciseLocation.longitude).y }}
            >
              <span className="explorer-nearby-map__user-halo" />
              <span className="explorer-nearby-map__user-dot" />
            </span>
          ) : null}
          {points.map((point) => {
            const position = project(point.latitude, point.longitude);
            const active = point.id === selectedId;
            const Mark = categoryMark(point.categoryName);
            return (
              <button
                key={point.id}
                type="button"
                className={`explorer-nearby-map__pin${active ? " is-selected" : ""}${broken[point.id] ? " is-fallback" : ""}`}
                style={{ left: position.x, top: position.y }}
                aria-label={point.categoryName ? `${point.title}. ${point.categoryName}` : point.title}
                aria-pressed={active}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(point.id);
                }}
              >
                <span className="explorer-nearby-map__pin-photo">
                  {broken[point.id] ? null : (
                    <img
                      src={point.imageUrl}
                      alt=""
                      draggable={false}
                      onError={() => setBroken((current) => ({ ...current, [point.id]: true }))}
                    />
                  )}
                </span>
                <span className="explorer-nearby-map__pin-tail" aria-hidden="true" />
                <span className="explorer-nearby-map__pin-mark">
                  <Mark size={11} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </button>
            );
          })}
          {popupVisible && selected && popupPlace ? (
            <article
              ref={popupRef}
              className="explorer-map-popup"
              style={{ left: popupPlace.left, top: popupPlace.top, width: popupCard.width }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button type="button" className="explorer-map-popup__close" aria-label="Cerrar" onClick={() => onSelect(null)}>
                <X size={13} strokeWidth={1.8} />
              </button>
              <span className="explorer-map-popup__media">
                {broken[selected.id] ? (
                  <span className="explorer-map-popup__photo is-fallback" />
                ) : (
                  <img
                    className="explorer-map-popup__photo"
                    src={selected.imageUrl}
                    alt=""
                    onError={() => setBroken((current) => ({ ...current, [selected.id]: true }))}
                  />
                )}
                <Link
                  className="explorer-map-popup__link"
                  to={`/explorar/${selected.id}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  Ver más
                </Link>
              </span>
              <div className="explorer-map-popup__copy">
                <p className="explorer-map-popup__price">{selected.priceLabel}</p>
                <h2 className="explorer-map-popup__title">{selected.title}</h2>
                {selected.place ? <p className="explorer-map-popup__place">{selected.place}</p> : null}
                <p className={`explorer-map-popup__rating${popupRatingView ? ` is-${popupRatingView.tone}` : " is-empty"}`}>
                  {popupRatingView ? (
                    <>
                      <span className="explorer-map-popup__score">
                        <span className="explorer-map-popup__pill">{popupRatingView.score}</span>
                        <span>{popupRatingView.word}</span>
                      </span>
                      <PopupStars value={popupRatingView.value} />
                    </>
                  ) : (
                    "Sin reseñas"
                  )}
                </p>
              </div>
              <span className={`explorer-map-popup__tail${popupPlace.pointing === "up" ? " is-up" : ""}`} />
            </article>
          ) : null}
        </div>
      ) : (
        <div className="explorer-nearby-map__viewport is-quiet" />
      )}
      {enabled ? (
        <>
          <div className="explorer-nearby-map__controls">
            <button type="button" aria-label="Acercar" onClick={() => changeZoom(1)}>
              +
            </button>
            <button type="button" aria-label="Alejar" onClick={() => changeZoom(-1)}>
              −
            </button>
            {canRecenter ? (
              <button type="button" aria-label="Volver a tu zona" onClick={recenter}>
                <LocateFixed size={16} strokeWidth={1.7} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <a
            className="explorer-nearby-map__credit"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap
          </a>
        </>
      ) : null}
    </div>
  );
}
