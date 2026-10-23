import { useEffect, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { experienceCoverUrl } from "../explorer/explorer-media";
import type { VisitedJourneyStop } from "../../services/visits.service";
import { stopPlaceName } from "../../utils/visited-map";

type MemorySlot = {
  x: number;
  y: number;
  tilt: number;
};

type MemoryMode = "gallery" | "compact" | "stacked";

const GALLERY_SLOTS: MemorySlot[] = [
  { x: 3, y: 24, tilt: -4 },
  { x: 28, y: 4, tilt: 2 },
  { x: 52, y: 32, tilt: -2 },
  { x: 76, y: 8, tilt: 3 },
];

const COMPACT_SLOTS: MemorySlot[] = [
  { x: 4, y: 16, tilt: -4 },
  { x: 38, y: 2, tilt: 2 },
  { x: 68, y: 24, tilt: -2 },
];

const STACKED_SLOTS: MemorySlot[] = [
  { x: 0, y: 24, tilt: -4 },
  { x: 36, y: 0, tilt: 2 },
  { x: 70, y: 20, tilt: -2 },
];

const CARD_WIDTH: Record<MemoryMode, number> = {
  gallery: 14,
  compact: 18,
  stacked: 28,
};

function readMode(): MemoryMode {
  if (typeof window === "undefined") {
    return "gallery";
  }
  if (window.matchMedia("(max-width: 720px)").matches) {
    return "stacked";
  }
  if (window.matchMedia("(max-width: 1100px)").matches) {
    return "compact";
  }
  return "gallery";
}

function slotsFor(mode: MemoryMode) {
  if (mode === "stacked") {
    return STACKED_SLOTS;
  }
  if (mode === "compact") {
    return COMPACT_SLOTS;
  }
  return GALLERY_SLOTS;
}

function memoryCaption(stop: VisitedJourneyStop) {
  return stop.title.trim();
}

function trail(from: MemorySlot, to: MemorySlot, cardWidth: number) {
  const forward = to.x >= from.x;
  const startX = forward ? from.x + cardWidth + 1.5 : from.x - 1.5;
  const endX = forward ? to.x - 1.5 : to.x + cardWidth + 1.5;
  const startY = from.y + 16;
  const endY = to.y + 16;
  const bend = forward ? -7 : 8;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 + bend;
  return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
}

function trailsFor(slots: MemorySlot[], count: number, cardWidth: number) {
  const total = Math.min(count, slots.length);
  const lines: string[] = [];
  for (let index = 0; index < total - 1; index += 1) {
    lines.push(trail(slots[index], slots[index + 1], cardWidth));
  }
  return lines;
}

export function VisitedMemories({ stops }: { stops: VisitedJourneyStop[] }) {
  const [mode, setMode] = useState<MemoryMode>(readMode);
  const [page, setPage] = useState(0);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const slots = slotsFor(mode);
  const pageSize = slots.length;
  const pageCount = Math.max(1, Math.ceil(stops.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = stops.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const cardWidth = CARD_WIDTH[mode];
  const lines = trailsFor(slots, visible.length, cardWidth);

  useEffect(() => {
    const compact = window.matchMedia("(max-width: 1100px)");
    const stacked = window.matchMedia("(max-width: 720px)");
    const update = () => setMode(readMode());
    update();
    compact.addEventListener("change", update);
    stacked.addEventListener("change", update);
    return () => {
      compact.removeEventListener("change", update);
      stacked.removeEventListener("change", update);
    };
  }, []);

  if (stops.length === 0) {
    return null;
  }

  const showNav = stops.length > pageSize;

  return (
    <div className={`visited-memories-pager${showNav ? " has-nav" : ""}`}>
      {showNav ? (
        <button
          type="button"
          className="visited-memories__nav visited-memories__nav--prev"
          aria-label="Experiencias anteriores"
          disabled={safePage === 0}
          onClick={() => setPage(safePage - 1)}
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
      <aside className={`visited-memories is-${mode}`} aria-label="Recuerdos de viaje">
      <svg className="visited-memories__paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {lines.map((line) => (
          <path key={line} d={line} />
        ))}
      </svg>
      {visible.map((stop, index) => {
        const slot = slots[index];
        const caption = memoryCaption(stop);
        const place = stopPlaceName(stop);
        return (
          <Link
            key={stop.id}
            className="visited-memory"
            style={{ left: `${slot.x}%`, top: `${slot.y}%`, "--tilt": `${slot.tilt}deg` } as CSSProperties}
            to={`/explorar/${stop.id}`}
            aria-label={place && place !== caption ? `${stop.title}, ${place}` : stop.title}
          >
            <span className="visited-memory__photo">
              {broken[stop.id] ? null : (
                <img
                  src={experienceCoverUrl(stop, 240)}
                  alt=""
                  draggable={false}
                  onError={() => setBroken((current) => ({ ...current, [stop.id]: true }))}
                />
              )}
            </span>
            <span className="visited-memory__label">{caption}</span>
          </Link>
        );
      })}
      </aside>
      {showNav ? (
        <button
          type="button"
          className="visited-memories__nav visited-memories__nav--next"
          aria-label="Experiencias siguientes"
          disabled={safePage >= pageCount - 1}
          onClick={() => setPage(safePage + 1)}
        >
          <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
