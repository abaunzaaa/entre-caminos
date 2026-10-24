import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import { experienceCoverUrl } from "../explorer/explorer-media";
import siluetamapa from "../../assets/siluetamapa.png";
import { buildColombiaMask } from "./colombia-mask";
import type { VisitedJourneyStop } from "../../services/visits.service";
import { TILE_SIZE, latLngToWorld, worldToLatLng } from "../../utils/map-projection";
import {
  VISITED_MAX_ZOOM,
  VISITED_MIN_ZOOM,
  curvePath,
  fitVisitedBounds,
  isMappable,
  orderJourney,
  stopPlaceName,
} from "../../utils/visited-map";

type VisitedPathsMapProps = {
  stops: VisitedJourneyStop[];
};

type PhotoPinProps = {
  stop: VisitedJourneyStop;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  delay: number;
  broken: boolean;
  onBroken: () => void;
};

function nudgeOverlaps(points: Array<{ x: number; y: number }>, gap = 30, maxOffset = 18) {
  const placed = points.map((point) => ({ ...point, ox: 0, oy: 0 }));
  for (let index = 0; index < placed.length; index += 1) {
    for (let other = 0; other < index; other += 1) {
      const dx = placed[index].x + placed[index].ox - (placed[other].x + placed[other].ox);
      const dy = placed[index].y + placed[index].oy - (placed[other].y + placed[other].oy);
      const distance = Math.hypot(dx, dy);
      if (distance >= gap) {
        continue;
      }
      const angle = distance < 0.5 ? (index * Math.PI * 2) / Math.max(placed.length, 1) : Math.atan2(dy, dx);
      const push = (gap - distance) / 2;
      placed[index].ox += Math.cos(angle) * push;
      placed[index].oy += Math.sin(angle) * push;
      placed[other].ox -= Math.cos(angle) * push;
      placed[other].oy -= Math.sin(angle) * push;
    }
  }
  return placed.map((point) => {
    const distance = Math.hypot(point.ox, point.oy);
    if (distance <= maxOffset) {
      return point;
    }
    const scale = maxOffset / distance;
    return { ...point, ox: point.ox * scale, oy: point.oy * scale };
  });
}

function PhotoPin({ stop, x, y, offsetX, offsetY, delay, broken, onBroken }: PhotoPinProps) {
  const style = {
    left: x,
    top: y,
    "--ox": `${offsetX}px`,
    "--oy": `${offsetY}px`,
    "--delay": delay,
  } as CSSProperties;
  const place = stopPlaceName(stop);
  const long = place.length > 16;

  return (
    <Link
      className="visited-pin"
      style={style}
      to={`/explorar/${stop.id}`}
      aria-label={place ? `${place}. ${stop.title}` : stop.title}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="visited-pin__photo">
        {broken ? (
          <span className="visited-pin__fallback" />
        ) : (
          <img src={experienceCoverUrl(stop, 160)} alt="" draggable={false} decoding="async" onError={onBroken} />
        )}
      </span>
      {place ? <span className={`visited-pin__name${long ? " is-long" : ""}`}>{place}</span> : null}
    </Link>
  );
}

export function VisitedPathsMap({ stops }: VisitedPathsMapProps) {
  const ordered = useMemo(() => orderJourney(stops), [stops]);
  const mappable = useMemo(() => ordered.filter(isMappable), [ordered]);
  const signature = useMemo(
    () => mappable.map((stop) => `${stop.id}:${stop.latitude}:${stop.longitude}`).join("|"),
    [mappable],
  );
  const began = ordered.length === 1 && mappable.length === 1;

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const flyRef = useRef<number | null>(null);
  const wheelTargetRef = useRef<number | null>(null);
  const wheelFrameRef = useRef<number | null>(null);
  const stopWheelRef = useRef(() => {});
  const userMovedRef = useRef(false);
  const appliedSignature = useRef("");
  const forceAnimate = useRef(false);
  const runId = useRef(0);
  const centerRef = useRef({ latitude: mappable[0]?.latitude ?? 6.25, longitude: mappable[0]?.longitude ?? -75.56 });
  const zoomRef = useRef(13);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [center, setCenter] = useState(centerRef.current);
  const [zoom, setZoom] = useState(zoomRef.current);
  const [grabbing, setGrabbing] = useState(false);
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(false);
  const [fitToken, setFitToken] = useState(0);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const [silhouette, setSilhouette] = useState<{ mask: string; border: string } | null>(null);

  centerRef.current = center;
  zoomRef.current = zoom;

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
      setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size.width || !size.height || !mappable.length) {
      return;
    }
    const id = runId.current + 1;
    runId.current = id;
    const padding = size.width < 760 ? { x: 52, y: 72 } : { x: 110, y: 148 };
    const frame = fitVisitedBounds(mappable, size.width, size.height, padding);
    const signatureChanged = appliedSignature.current !== "" && appliedSignature.current !== signature;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = (forceAnimate.current || signatureChanged) && !reduced;
    const skip = userMovedRef.current && appliedSignature.current === signature && !forceAnimate.current;
    const timeout = window.setTimeout(() => {
      if (id !== runId.current || skip) {
        return;
      }
      forceAnimate.current = false;
      appliedSignature.current = signature;
      userMovedRef.current = false;
      stopWheelRef.current();
      if (!animate) {
        setCenter({ latitude: frame.latitude, longitude: frame.longitude });
        setZoom(frame.zoom);
        setReady(true);
        return;
      }
      const from = { latitude: centerRef.current.latitude, longitude: centerRef.current.longitude, zoom: zoomRef.current };
      const started = performance.now();
      const step = (now: number) => {
        if (id !== runId.current) {
          return;
        }
        const progress = Math.min(1, (now - started) / 700);
        const eased = 1 - (1 - progress) ** 3;
        setCenter({
          latitude: from.latitude + (frame.latitude - from.latitude) * eased,
          longitude: from.longitude + (frame.longitude - from.longitude) * eased,
        });
        const nextZoom = from.zoom + (frame.zoom - from.zoom) * eased;
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        if (progress < 1) {
          flyRef.current = requestAnimationFrame(step);
        } else {
          flyRef.current = null;
          zoomRef.current = frame.zoom;
          setCenter({ latitude: frame.latitude, longitude: frame.longitude });
          setZoom(frame.zoom);
        }
      };
      setReady(true);
      flyRef.current = requestAnimationFrame(step);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      if (flyRef.current != null) {
        cancelAnimationFrame(flyRef.current);
        flyRef.current = null;
      }
    };
  }, [fitToken, mappable, signature, size.height, size.width]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setIntro(false);
      return;
    }
    setIntro(true);
    const timeout = window.setTimeout(() => setIntro(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [ready, signature]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    function stopWheel() {
      if (wheelFrameRef.current != null) {
        cancelAnimationFrame(wheelFrameRef.current);
        wheelFrameRef.current = null;
      }
      wheelTargetRef.current = null;
    }
    stopWheelRef.current = stopWheel;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      userMovedRef.current = true;
      if (flyRef.current != null) {
        cancelAnimationFrame(flyRef.current);
        flyRef.current = null;
      }
      let pixels = event.deltaY;
      if (event.deltaMode === 1) {
        pixels *= 16;
      } else if (event.deltaMode === 2) {
        pixels *= node.clientHeight || 400;
      }
      const base = wheelTargetRef.current ?? zoomRef.current;
      const target = Math.min(VISITED_MAX_ZOOM, Math.max(VISITED_MIN_ZOOM, base - pixels / 560));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        stopWheel();
        zoomRef.current = target;
        setZoom(target);
        return;
      }
      wheelTargetRef.current = target;
      if (wheelFrameRef.current != null) {
        return;
      }
      const step = () => {
        const goal = wheelTargetRef.current;
        if (goal == null) {
          wheelFrameRef.current = null;
          return;
        }
        const delta = goal - zoomRef.current;
        if (Math.abs(delta) < 0.004) {
          zoomRef.current = goal;
          setZoom(goal);
          wheelTargetRef.current = null;
          wheelFrameRef.current = null;
          return;
        }
        const next = zoomRef.current + delta * 0.28;
        zoomRef.current = next;
        setZoom(next);
        wheelFrameRef.current = requestAnimationFrame(step);
      };
      wheelFrameRef.current = requestAnimationFrame(step);
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      stopWheel();
    };
  }, []);

  const world = useMemo(
    () => latLngToWorld(center.latitude, center.longitude, zoom),
    [center.latitude, center.longitude, zoom],
  );

  const tileZoom = Math.round(Math.min(VISITED_MAX_ZOOM, Math.max(VISITED_MIN_ZOOM, zoom)));
  const tileScale = 2 ** (zoom - tileZoom);
  const tileWorld = useMemo(
    () => latLngToWorld(center.latitude, center.longitude, tileZoom),
    [center.latitude, center.longitude, tileZoom],
  );

  const tiles = useMemo(() => {
    if (!size.width || !size.height) {
      return [];
    }
    const left = tileWorld.x - size.width / 2;
    const top = tileWorld.y - size.height / 2;
    const x0 = Math.floor(left / TILE_SIZE);
    const y0 = Math.floor(top / TILE_SIZE);
    const x1 = Math.floor((left + size.width) / TILE_SIZE);
    const y1 = Math.floor((top + size.height) / TILE_SIZE);
    const maxIndex = 2 ** tileZoom;
    const next: Array<{ key: string; left: number; top: number; src: string }> = [];
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        if (y < 0 || y >= maxIndex) {
          continue;
        }
        const wrappedX = ((x % maxIndex) + maxIndex) % maxIndex;
        next.push({
          key: `${tileZoom}-${wrappedX}-${y}-${x}`,
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
          src: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${tileZoom}/${y}/${wrappedX}`,
        });
      }
    }
    return next;
  }, [size.height, size.width, tileWorld.x, tileWorld.y, tileZoom]);

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

  const route = useMemo(() => curvePath(mappable.map((stop) => project(stop.latitude, stop.longitude))), [mappable, project]);
  const indexById = useMemo(() => new Map(mappable.map((stop, index) => [stop.id, index])), [mappable]);
  const nudged = useMemo(() => {
    const projected = mappable.map((stop) => project(stop.latitude, stop.longitude));
    const offsets = nudgeOverlaps(projected, size.width > 0 && size.width < 760 ? 26 : 30, size.width > 0 && size.width < 760 ? 16 : 18);
    return mappable.map((stop, index) => ({ stop, ...offsets[index] }));
  }, [mappable, project, size.width]);

  useEffect(() => {
    let cancelled = false;
    buildColombiaMask(siluetamapa)
      .then((images) => {
        if (!cancelled) {
          setSilhouette(images);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSilhouette(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onWindowPointerMove = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const point = worldToLatLng(drag.originX - (event.clientX - drag.startX), drag.originY - (event.clientY - drag.startY), zoomRef.current);
    setCenter({ latitude: point.lat, longitude: point.lng });
  }, []);

  const onWindowPointerUp = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 3;
    if (moved) {
      userMovedRef.current = true;
      const point = worldToLatLng(drag.originX - (event.clientX - drag.startX), drag.originY - (event.clientY - drag.startY), zoomRef.current);
      setCenter({ latitude: point.lat, longitude: point.lng });
    }
    dragRef.current = null;
    setGrabbing(false);
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
  }, [onWindowPointerMove]);

  useEffect(() => {
    return () => {
      if (flyRef.current != null) {
        cancelAnimationFrame(flyRef.current);
      }
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, [onWindowPointerMove, onWindowPointerUp]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    if (flyRef.current != null) {
      cancelAnimationFrame(flyRef.current);
      flyRef.current = null;
    }
    stopWheelRef.current();
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
    userMovedRef.current = true;
    stopWheelRef.current();
    if (flyRef.current != null) {
      cancelAnimationFrame(flyRef.current);
      flyRef.current = null;
    }
    const from = zoomRef.current;
    const to = Math.min(VISITED_MAX_ZOOM, Math.max(VISITED_MIN_ZOOM, from + delta));
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / 280);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (to - from) * eased;
      zoomRef.current = next;
      setZoom(next);
      if (progress < 1) {
        flyRef.current = requestAnimationFrame(step);
      } else {
        flyRef.current = null;
        zoomRef.current = to;
        setZoom(to);
      }
    };
    flyRef.current = requestAnimationFrame(step);
  }

  function showAll() {
    stopWheelRef.current();
    if (flyRef.current != null) {
      cancelAnimationFrame(flyRef.current);
      flyRef.current = null;
    }
    userMovedRef.current = false;
    forceAnimate.current = true;
    setFitToken((value) => value + 1);
  }

  function markBroken(id: string) {
    setBroken((current) => (current[id] ? current : { ...current, [id]: true }));
  }

  return (
    <div className={`visited-paths-map colombia-map-wrapper${ready && silhouette ? " is-ready" : ""}${intro ? " is-intro" : ""}`} aria-label="Mapa de caminos recorridos">
      <div
        className="colombia-map-wrapper__stage"
        style={
          silhouette
            ? ({
                maskImage: `url("${silhouette.mask}")`,
                WebkitMaskImage: `url("${silhouette.mask}")`,
              } as CSSProperties)
            : undefined
        }
      >
        <div
          ref={viewportRef}
          className={`visited-paths-map__viewport${grabbing ? " is-grabbing" : ""}`}
          onPointerDown={onPointerDown}
          role="application"
          aria-label="Mapa de tus caminos recorridos"
        >
          <div className="visited-paths-map__land">
            <div className="visited-paths-map__scaler" style={{ transform: `scale(${tileScale})` }}>
              {tiles.map((tile) => (
                <img
                  key={tile.key}
                  src={tile.src}
                  alt=""
                  draggable={false}
                  className="visited-paths-map__tile"
                  style={{ transform: `translate(${tile.left}px, ${tile.top}px)` }}
                />
              ))}
            </div>
            {route ? (
              <svg className="visited-route" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
                <path className="visited-route__line" d={route} pathLength={1} />
              </svg>
            ) : null}
          </div>
          {nudged.map(({ stop, x, y, ox, oy }) => (
            <PhotoPin
              key={stop.id}
              stop={stop}
              x={x}
              y={y}
              offsetX={ox}
              offsetY={oy}
              delay={Math.min(indexById.get(stop.id) ?? 0, 8) * 70}
              broken={Boolean(broken[stop.id])}
              onBroken={() => markBroken(stop.id)}
            />
          ))}
        </div>
      </div>
      {silhouette ? <img className="colombia-map-wrapper__border" src={silhouette.border} alt="" draggable={false} /> : null}
      {ready ? (
        <div className="visited-paths-map__controls">
          <button type="button" aria-label="Acercar" onClick={() => changeZoom(0.7)}>
            +
          </button>
          <button type="button" aria-label="Alejar" onClick={() => changeZoom(-0.7)}>
            −
          </button>
          <button type="button" aria-label="Ver todo el recorrido" onClick={showAll}>
            <LocateFixed size={15} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <p className="visited-paths-map__credit">
        <a href="https://www.esri.com/en-us/legal/copyright-trademarks" target="_blank" rel="noreferrer">
          © Esri
        </a>
        {" · "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
      </p>
      {began ? <p className="visited-paths-map__began">Aquí comenzó tu camino.</p> : null}
    </div>
  );
}
