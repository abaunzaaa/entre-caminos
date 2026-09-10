import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ExperienceLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  zoom?: number;
  interactive?: boolean;
  onChange?: (latitude: number, longitude: number) => void;
  onMoveEnd?: (latitude: number, longitude: number) => void;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;

function clampLat(value: number) {
  return Math.min(85, Math.max(-85, value));
}

function latLngToWorld(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((clampLat(lat) * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldToLatLng(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = ((x / scale) * 360) - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat: clampLat(lat), lng: ((lng + 540) % 360) - 180 };
}

function LocationPinIcon() {
  return (
    <svg className="dash-exps-map__pin-icon" viewBox="0 0 28 40" aria-hidden="true">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" />
      <circle cx="14" cy="14" r="5.4" />
    </svg>
  );
}

export function ExperienceLocationMap({
  latitude,
  longitude,
  zoom = 13,
  interactive = true,
  onChange,
  onMoveEnd,
}: ExperienceLocationMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onMoveEndRef = useRef(onMoveEnd);
  const worldRef = useRef({ x: 0, y: 0 });
  const viewZoomRef = useRef(zoom);
  const draggingRef = useRef(false);
  onChangeRef.current = onChange;
  onMoveEndRef.current = onMoveEnd;
  const [size, setSize] = useState({ width: 0, height: 420 });
  const [viewZoom, setViewZoom] = useState(zoom);
  const [pinOffset, setPinOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    mode: "map" | "pin";
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const lat = latitude ?? 4.570868;
  const lng = longitude ?? -74.297333;
  const world = useMemo(() => latLngToWorld(lat, lng, viewZoom), [lat, lng, viewZoom]);
  worldRef.current = world;
  viewZoomRef.current = viewZoom;

  useEffect(() => {
    if (draggingRef.current) {
      return;
    }
    setViewZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)));
  }, [zoom]);

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
  }, []);

  const tiles = useMemo(() => {
    if (!size.width) {
      return [];
    }
    const left = world.x - size.width / 2;
    const top = world.y - size.height / 2;
    const x0 = Math.floor(left / TILE_SIZE);
    const y0 = Math.floor(top / TILE_SIZE);
    const x1 = Math.floor((left + size.width) / TILE_SIZE);
    const y1 = Math.floor((top + size.height) / TILE_SIZE);
    const maxIndex = 2 ** viewZoom;
    const next: Array<{ key: string; left: number; top: number; src: string }> = [];
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        if (y < 0 || y >= maxIndex) {
          continue;
        }
        const wrappedX = ((x % maxIndex) + maxIndex) % maxIndex;
        next.push({
          key: `${viewZoom}-${wrappedX}-${y}-${x}`,
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
          src: `https://tile.openstreetmap.org/${viewZoom}/${wrappedX}/${y}.png`,
        });
      }
    }
    return next;
  }, [size.height, size.width, viewZoom, world.x, world.y]);

  const emitPoint = useCallback((x: number, y: number, ended: boolean) => {
    const point = worldToLatLng(x, y, viewZoomRef.current);
    const nextLat = Number(point.lat.toFixed(6));
    const nextLng = Number(point.lng.toFixed(6));
    onChangeRef.current?.(nextLat, nextLng);
    if (ended) {
      onMoveEndRef.current?.(nextLat, nextLng);
    }
  }, []);

  const onWindowPointerMove = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.mode === "map") {
      emitPoint(drag.originX - dx, drag.originY - dy, false);
      return;
    }
    setPinOffset({ x: dx, y: dy });
  }, [emitPoint]);

  const onWindowPointerUp = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const moved = Math.hypot(dx, dy) >= 3;
    if (drag.mode === "pin") {
      emitPoint(drag.originX + dx, drag.originY + dy, moved);
      setPinOffset({ x: 0, y: 0 });
    } else if (moved) {
      emitPoint(drag.originX - dx, drag.originY - dy, true);
    }
    dragRef.current = null;
    draggingRef.current = false;
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
  }, [emitPoint, onWindowPointerMove]);

  function onPointerDown(event: React.PointerEvent<HTMLElement>, mode: "map" | "pin") {
    event.preventDefault();
    event.stopPropagation();
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
    draggingRef.current = true;
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: worldRef.current.x,
      originY: worldRef.current.y,
    };
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, [onWindowPointerMove, onWindowPointerUp]);

  function shiftZoom(delta: number) {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewZoom + delta));
    setViewZoom(nextZoom);
  }

  return (
    <div className={`dash-exps-map${interactive ? "" : " is-readonly"}`}>
      <div
        ref={viewportRef}
        className="dash-exps-map__viewport"
        onPointerDown={interactive ? (event) => onPointerDown(event, "map") : undefined}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            draggable={false}
            className="dash-exps-map__tile"
            style={{ transform: `translate(${tile.left}px, ${tile.top}px)` }}
          />
        ))}
        <div className="dash-exps-map__pin-wrap" style={{ transform: `translate(${pinOffset.x}px, ${pinOffset.y}px)` }}>
          {interactive ? (
            <button
              type="button"
              className="dash-exps-map__pin"
              aria-label="Mover el marcador de ubicación"
              onPointerDown={(event) => onPointerDown(event, "pin")}
            >
              <span className="dash-exps-map__halo" aria-hidden="true" />
              <LocationPinIcon />
            </button>
          ) : (
            <span className="dash-exps-map__pin">
              <span className="dash-exps-map__halo" aria-hidden="true" />
              <LocationPinIcon />
            </span>
          )}
        </div>
      </div>
      <div className="dash-exps-map__zoom">
        <button type="button" aria-label="Acercar" onClick={() => shiftZoom(1)}>
          +
        </button>
        <button type="button" aria-label="Alejar" onClick={() => shiftZoom(-1)}>
          −
        </button>
      </div>
      <p className="dash-exps-map__credit">Mapa © OpenStreetMap</p>
    </div>
  );
}
