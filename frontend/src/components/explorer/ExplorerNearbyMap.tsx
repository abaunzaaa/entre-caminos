import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, X } from "lucide-react";
import { TILE_SIZE, latLngToWorld, worldToLatLng } from "../../utils/map-projection";

const MIN_ZOOM = 5;
const MAX_ZOOM = 18;
const OVERVIEW_ZOOM = 6;
/** Vista general de Colombia. No representa la ubicación de una persona. */
const OVERVIEW = { latitude: 4.570868, longitude: -74.297333 };

export type ExplorerMapPoint = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  place: string;
  priceLabel: string;
  distanceKm: number;
};

type ExplorerNearbyMapProps = {
  enabled: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  points: ExplorerMapPoint[];
  selectedId: string | null;
  focusToken: number;
  onSelect: (id: string | null) => void;
};

function samePoint(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  return Math.abs(left.latitude - right.latitude) < 0.000001 && Math.abs(left.longitude - right.longitude) < 0.000001;
}

function homeZoomFor(points: ExplorerMapPoint[], width: number, height: number) {
  const nearby = points.filter((point) => point.distanceKm <= 12);
  if (!nearby.length || width < 40 || height < 40) {
    return 13;
  }
  const farthest = Math.max(1.2, ...nearby.map((point) => point.distanceKm));
  const radius = Math.max(1.6, farthest * 1.35);
  const targetPx = Math.max(180, Math.min(width, height) * 0.42);
  const zoom = Math.log2((156543.03392 * targetPx) / (radius * 1000));
  if (!Number.isFinite(zoom)) {
    return 13;
  }
  return Math.min(14, Math.max(12, Math.round(zoom)));
}

export function ExplorerNearbyMap({
  enabled,
  userLocation,
  points,
  selectedId,
  focusToken,
  onSelect,
}: ExplorerNearbyMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const movedRef = useRef(false);
  const seenFocus = useRef(focusToken);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  onSelectRef.current = onSelect;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [center, setCenter] = useState(userLocation ?? OVERVIEW);
  const [zoom, setZoom] = useState(userLocation ? 13 : OVERVIEW_ZOOM);
  const [grabbing, setGrabbing] = useState(false);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  centerRef.current = center;
  zoomRef.current = zoom;

  useEffect(() => {
    if (!enabled || size.width < 20 || movedRef.current) {
      return;
    }
    if (userLocation) {
      const nextZoom = homeZoomFor(points, size.width, size.height);
      setCenter((current) => (samePoint(current, userLocation) ? current : userLocation));
      setZoom((current) => (current === nextZoom ? current : nextZoom));
      return;
    }
    setCenter((current) => (samePoint(current, OVERVIEW) ? current : OVERVIEW));
    setZoom((current) => (current === OVERVIEW_ZOOM ? current : OVERVIEW_ZOOM));
  }, [enabled, points, size.height, size.width, userLocation]);

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
    if (!userLocation) {
      return;
    }
    movedRef.current = true;
    setCenter({ latitude: userLocation.latitude, longitude: userLocation.longitude });
  }

  const selected = points.find((point) => point.id === selectedId) ?? null;
  const selectedPos = selected ? project(selected.latitude, selected.longitude) : null;
  const popupVisible = Boolean(
    selected &&
      selectedPos &&
      selectedPos.x > -20 &&
      selectedPos.y > -20 &&
      selectedPos.x < size.width + 20 &&
      selectedPos.y < size.height + 20,
  );
  const popupBelow = Boolean(selectedPos && selectedPos.y < 132);
  const popupLeft = selectedPos ? Math.min(Math.max(selectedPos.x, 132), Math.max(132, size.width - 132)) : 0;

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
          {userLocation ? (
            <span
              className="explorer-nearby-map__user"
              role="img"
              aria-label="Tu ubicación"
              style={{ left: project(userLocation.latitude, userLocation.longitude).x, top: project(userLocation.latitude, userLocation.longitude).y }}
            >
              <span className="explorer-nearby-map__user-halo" />
              <span className="explorer-nearby-map__user-dot" />
            </span>
          ) : null}
          {points.map((point) => {
            const position = project(point.latitude, point.longitude);
            const active = point.id === selectedId;
            return (
              <button
                key={point.id}
                type="button"
                className={`explorer-nearby-map__pin${active ? " is-selected" : ""}${broken[point.id] ? " is-fallback" : ""}`}
                style={{ left: position.x, top: position.y }}
                aria-label={point.title}
                aria-pressed={active}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(point.id);
                }}
              >
                {broken[point.id] ? null : (
                  <img
                    src={point.imageUrl}
                    alt=""
                    draggable={false}
                    onError={() => setBroken((current) => ({ ...current, [point.id]: true }))}
                  />
                )}
              </button>
            );
          })}
          {popupVisible && selected && selectedPos ? (
            <article
              className={`explorer-map-popup${popupBelow ? " is-below" : ""}`}
              style={{ left: popupLeft, top: selectedPos.y }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button type="button" className="explorer-map-popup__close" aria-label="Cerrar" onClick={() => onSelect(null)}>
                <X size={14} strokeWidth={1.8} />
              </button>
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
              <div className="explorer-map-popup__copy">
                <h2 className="explorer-map-popup__title">{selected.title}</h2>
                {selected.place ? <p className="explorer-map-popup__place">{selected.place}</p> : null}
                <p className="explorer-map-popup__price">{selected.priceLabel}</p>
                <Link className="explorer-map-popup__link" to={`/explorar/${selected.id}`}>
                  Ver experiencia
                </Link>
              </div>
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
            {userLocation ? (
              <button type="button" aria-label="Volver a tu ubicación" onClick={recenter}>
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
