import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TILE_SIZE, latLngToWorld, worldToLatLng } from "../../utils/map-projection";

type ExperienceLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  zoom?: number;
  interactive?: boolean;
  /** Pan the camera around a fixed marker. Does not move the saved location. */
  explore?: boolean;
  onChange?: (latitude: number, longitude: number) => void;
  onMoveEnd?: (latitude: number, longitude: number) => void;
};

const MIN_ZOOM = 5;
const MAX_ZOOM = 18;

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
  explore = false,
  onChange,
  onMoveEnd,
}: ExperienceLocationMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onMoveEndRef = useRef(onMoveEnd);
  const exploreRef = useRef(explore);
  const worldRef = useRef({ x: 0, y: 0 });
  const viewZoomRef = useRef(zoom);
  const draggingRef = useRef(false);
  onChangeRef.current = onChange;
  onMoveEndRef.current = onMoveEnd;
  exploreRef.current = explore;
  const [size, setSize] = useState({ width: 0, height: 420 });
  const [viewZoom, setViewZoom] = useState(zoom);
  const [pinOffset, setPinOffset] = useState({ x: 0, y: 0 });
  const [camera, setCamera] = useState<{ lat: number; lng: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);
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
  const cameraLat = explore && camera ? camera.lat : lat;
  const cameraLng = explore && camera ? camera.lng : lng;
  const centerWorld = useMemo(() => latLngToWorld(cameraLat, cameraLng, viewZoom), [cameraLat, cameraLng, viewZoom]);
  const markerWorld = useMemo(() => latLngToWorld(lat, lng, viewZoom), [lat, lng, viewZoom]);
  worldRef.current = centerWorld;
  viewZoomRef.current = viewZoom;

  useEffect(() => {
    setCamera(null);
  }, [lat, lng]);

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
    const left = centerWorld.x - size.width / 2;
    const top = centerWorld.y - size.height / 2;
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
  }, [centerWorld.x, centerWorld.y, size.height, size.width, viewZoom]);

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
      if (exploreRef.current) {
        const point = worldToLatLng(drag.originX - dx, drag.originY - dy, viewZoomRef.current);
        setCamera({ lat: point.lat, lng: point.lng });
        return;
      }
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
    } else if (moved && !exploreRef.current) {
      emitPoint(drag.originX - dx, drag.originY - dy, true);
    }
    dragRef.current = null;
    draggingRef.current = false;
    setGrabbing(false);
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
    setGrabbing(true);
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

  const canPan = interactive || explore;
  const markerShift = {
    x: markerWorld.x - centerWorld.x + pinOffset.x,
    y: markerWorld.y - centerWorld.y + pinOffset.y,
  };

  return (
    <div className={`dash-exps-map${canPan ? "" : " is-readonly"}${grabbing ? " is-grabbing" : ""}`}>
      <div
        ref={viewportRef}
        className="dash-exps-map__viewport"
        onPointerDown={canPan ? (event) => onPointerDown(event, "map") : undefined}
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
        <div className="dash-exps-map__pin-wrap" style={{ transform: `translate(${markerShift.x}px, ${markerShift.y}px)` }}>
          {interactive && !explore ? (
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
