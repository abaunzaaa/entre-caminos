import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { experienceCoverUrl } from "../explorer/explorer-media";
import type { VisitedJourneyStop } from "../../services/visits.service";
import { stopPlaceName } from "../../utils/visited-map";
import { stopMatchesCategory } from "../../utils/visited-filters";
import { placeVisitedPins } from "../../utils/world-cover-position";

const PIN_PATH = "M32 6C18.4 6 8 16.9 8 31.4C8 44.2 17.2 55.2 32 74.5C46.8 55.2 56 44.2 56 31.4C56 16.9 45.6 6 32 6Z";

type VisitedCoverMarkersProps = {
  stops: VisitedJourneyStop[];
  categoryId?: string | null;
};

function useFinePointer() {
  const [fine, setFine] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)").matches : false,
  );

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return fine;
}

type CardBox = {
  left: number;
  top: number;
  place: "above" | "below";
  arrow: number;
};

function PinShape({ id, src, broken }: { id: string; src: string; broken: boolean }) {
  return (
    <svg className="visited-drop__svg" viewBox="0 0 64 86" aria-hidden="true">
      <defs>
        <clipPath id={id} clipPathUnits="userSpaceOnUse">
          <path d={PIN_PATH} />
        </clipPath>
      </defs>
      <g className="visited-drop__body">
        <path d={PIN_PATH} fill="#fff" stroke="#fff" strokeWidth="4" />
        {broken ? (
          <path className="visited-drop__photo" d={PIN_PATH} fill="#e7eeea" />
        ) : (
          <image className="visited-drop__photo" href={src} x="4" y="4" width="56" height="68" clipPath={`url(#${id})`} preserveAspectRatio="xMidYMid slice" />
        )}
        <path className="visited-drop__fill" d={PIN_PATH} fill="#6b746f" stroke="#6b746f" strokeWidth="4" />
        <path d={PIN_PATH} fill="none" stroke="rgba(41, 73, 66, 0.32)" strokeWidth="1.15" />
      </g>
      <circle className="visited-drop__tip" cx="32" cy="82.2" r="2.15" fill="#1c332e" />
    </svg>
  );
}

export function VisitedCoverMarkers({ stops, categoryId = null }: VisitedCoverMarkersProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const finePointer = useFinePointer();
  const [broken, setBroken] = useState<Record<string, true>>({});
  const [cardBox, setCardBox] = useState<CardBox | null>(null);
  const [cardMeasure, setCardMeasure] = useState(0);
  const clipBase = useId().replace(/:/g, "");

  const placed = useMemo(() => {
    const slots = placeVisitedPins(stops);
    return stops.map((stop, index) => ({ stop, ...slots[index] }));
  }, [stops]);

  const selected = placed.find((pin) => pin.stop.id === selectedId) ?? null;
  const visibleCount = placed.filter((pin) => stopMatchesCategory(pin.stop, categoryId)).length;

  useLayoutEffect(() => {
    if (selectedId) {
      const stop = stops.find((item) => item.id === selectedId);
      if (!stop || !stopMatchesCategory(stop, categoryId)) {
        setSelectedId(null);
      }
    }
    if (hoveredId) {
      const stop = stops.find((item) => item.id === hoveredId);
      if (!stop || !stopMatchesCategory(stop, categoryId)) {
        setHoveredId(null);
      }
    }
  }, [selectedId, hoveredId, categoryId, stops]);

  useEffect(() => {
    const node = layerRef.current;
    if (!node) {
      return;
    }
    function measure() {
      const current = layerRef.current;
      if (!current) {
        return;
      }
      const rect = current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const card = cardRef.current;
    if (!selected || !layer || !card) {
      setCardBox(null);
      return;
    }
    const layerRect = layer.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const pinX = (selected.xPercent / 100) * layerRect.width;
    const pinY = (selected.yPercent / 100) * layerRect.height;
    const navRaw = getComputedStyle(document.documentElement).getPropertyValue("--explorer-nav-height").trim();
    const nav = navRaw.endsWith("rem") ? parseFloat(navRaw) * 16 : parseFloat(navRaw) || 76;
    const margin = 8;
    const boundsTop = Math.max(0, nav + margin - layerRect.top);
    const boundsBottom = Math.min(layerRect.height, window.innerHeight - margin - layerRect.top);
    const boundsLeft = Math.max(0, margin - layerRect.left);
    const boundsRight = Math.min(layerRect.width, window.innerWidth - margin - layerRect.left);
    const width = cardRect.width;
    const height = cardRect.height;
    const aboveTop = pinY - height - 12;
    let top = aboveTop;
    let place: CardBox["place"] = "above";
    if (top < boundsTop) {
      top = pinY + 14;
      place = "below";
    }
    if (top + height > boundsBottom) {
      if (aboveTop >= boundsTop) {
        top = aboveTop;
        place = "above";
      } else {
        top = Math.max(boundsTop, Math.min(top, boundsBottom - height));
      }
    }
    top = Math.round(Math.max(boundsTop, Math.min(top, Math.max(boundsTop, boundsBottom - height))) * 10) / 10;
    let left = pinX - width / 2;
    left = Math.round(Math.max(boundsLeft, Math.min(left, Math.max(boundsLeft, boundsRight - width))) * 10) / 10;
    const arrow = width > 0 ? Math.round(Math.min(86, Math.max(14, ((pinX - left) / width) * 100)) * 10) / 10 : 50;
    setCardBox((current) => {
      if (current && current.left === left && current.top === top && current.place === place && current.arrow === arrow) {
        return current;
      }
      return { left, top, place, arrow };
    });
  }, [selected, size.height, size.width, cardMeasure]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        setSelectedId(null);
        return;
      }
      if (target.closest(".visited-float-slot, .visited-drop, .visited-filters")) {
        return;
      }
      setSelectedId(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedId]);

  const placeName = selected ? stopPlaceName(selected.stop) : "";

  function hoverFromPointer(id: string, event: ReactPointerEvent) {
    if (!finePointer || event.pointerType !== "mouse") {
      return;
    }
    setHoveredId(id);
  }

  return (
    <div className="visited-hero__markers" ref={layerRef}>
      {visibleCount === 0 ? (
        <p className="visited-cover__empty">
          {stops.length === 0 ? "No tienes experiencias visitadas." : "No tienes experiencias visitadas en esta categoría."}
        </p>
      ) : null}
      {placed.map((pin) => {
        const visible = stopMatchesCategory(pin.stop, categoryId);
        return (
        <button
          key={pin.stop.id}
          type="button"
          className={`visited-drop${visible ? "" : " is-muted"}${visible && hoveredId === pin.stop.id && selectedId !== pin.stop.id ? " is-hot" : ""}${visible && selectedId === pin.stop.id ? " is-open" : ""}`}
          style={{ left: `${pin.xPercent}%`, top: `${pin.yPercent}%` }}
          aria-label={pin.stop.title}
          aria-expanded={selectedId === pin.stop.id}
          aria-hidden={visible ? undefined : true}
          tabIndex={visible ? undefined : -1}
          onPointerEnter={(event) => {
            if (visible) {
              hoverFromPointer(pin.stop.id, event);
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") {
              setHoveredId((current) => (current === pin.stop.id ? null : current));
            }
          }}
          onFocus={() => {
            if (visible && finePointer) {
              setHoveredId(pin.stop.id);
            }
          }}
          onBlur={() => {
            if (finePointer) {
              setHoveredId((current) => (current === pin.stop.id ? null : current));
            }
          }}
          onClick={() => {
            if (!visible) {
              return;
            }
            setHoveredId(null);
            setSelectedId(pin.stop.id);
          }}
        >
          <PinShape id={`${clipBase}-${pin.stop.id}`} src={experienceCoverUrl(pin.stop, 160)} broken={Boolean(broken[pin.stop.id])} />
          <img src={experienceCoverUrl(pin.stop, 160)} alt="" hidden onError={() => setBroken((current) => ({ ...current, [pin.stop.id]: true }))} />
        </button>
        );
      })}
      {selected ? (
        <article className="visited-float-slot" style={{ left: cardBox?.left ?? 0, top: cardBox?.top ?? 0, visibility: cardBox ? "visible" : "hidden" }}>
          <Link
            ref={cardRef}
            className={`visited-float__link is-${cardBox?.place ?? "above"}`}
            style={{ "--arrow": `${cardBox?.arrow ?? 50}%` } as CSSProperties}
            to={`/explorar/${selected.stop.id}`}
          >
            <span className="visited-float__media">
              <img src={experienceCoverUrl(selected.stop, 320)} alt="" onLoad={() => setCardMeasure((value) => value + 1)} />
            </span>
            <span className="visited-float__title">{selected.stop.title}</span>
            {placeName ? <span className="visited-float__place">{placeName}</span> : null}
          </Link>
        </article>
      ) : null}
    </div>
  );
}
