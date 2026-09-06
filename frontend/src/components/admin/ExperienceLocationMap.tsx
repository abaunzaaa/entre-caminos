import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ExperienceLocationMapProps = {
  latitude: number | null;
  longitude: number | null;
  zoom?: number;
  interactive?: boolean;
  onChange?: (latitude: number, longitude: number) => void;
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

export function ExperienceLocationMap({
  latitude,
  longitude,
  zoom = 13,
  interactive = true,
  onChange,
}: ExperienceLocationMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 420 });
  const [viewZoom, setViewZoom] = useState(zoom);
  const [pinOffset, setPinOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    mode: "map" | "pin";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const lat = latitude ?? 4.570868;
  const lng = longitude ?? -74.297333;
  const world = useMemo(() => latLngToWorld(lat, lng, viewZoom), [lat, lng, viewZoom]);

  useEffect(() => {
    setViewZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)));
  }, [zoom]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    function measure() {
      const rect = node.getBoundingClientRect();
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

  const commitWorld = useCallback(
    (x: number, y: number) => {
      if (!onChange) {
        return;
      }
      const point = worldToLatLng(x, y, viewZoom);
      onChange(Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6)));
    },
    [onChange, viewZoom],
  );

  function onPointerDown(event: React.PointerEvent<HTMLElement>, mode: "map" | "pin") {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      originX: world.x,
      originY: world.y,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.mode === "map") {
      commitWorld(drag.originX - dx, drag.originY - dy);
      return;
    }
    setPinOffset({ x: dx, y: dy });
  }

  function onPointerUp(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (drag?.mode === "pin") {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      commitWorld(drag.originX + dx, drag.originY + dy);
      setPinOffset({ x: 0, y: 0 });
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

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
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive ? onPointerUp : undefined}
        onPointerCancel={interactive ? onPointerUp : undefined}
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
              onPointerDown={(event) => {
                event.stopPropagation();
                onPointerDown(event, "pin");
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <span className="dash-exps-map__halo" aria-hidden="true" />
              <span className="dash-exps-map__dot" aria-hidden="true" />
            </button>
          ) : (
            <span className="dash-exps-map__pin">
              <span className="dash-exps-map__halo" aria-hidden="true" />
              <span className="dash-exps-map__dot" aria-hidden="true" />
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
