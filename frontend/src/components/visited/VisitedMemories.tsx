import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { experienceCoverUrl } from "../explorer/explorer-media";
import type { VisitedJourneyStop } from "../../services/visits.service";
import { stopPlaceName } from "../../utils/visited-map";

type MemorySlot = {
  x: number;
  y: number;
  tilt: number;
};

type MemoryMode = "desktop" | "compact" | "stacked";

const DESKTOP_SLOTS: MemorySlot[] = [
  { x: 0, y: 0, tilt: -4 },
  { x: 66, y: 3, tilt: 2 },
  { x: 0, y: 58, tilt: -2 },
  { x: 62, y: 52, tilt: 3 },
];

const COMPACT_SLOTS: MemorySlot[] = [
  { x: 0, y: 0, tilt: -4 },
  { x: 56, y: 2, tilt: 2 },
  { x: 4, y: 56, tilt: -2 },
];

const STACKED_SLOTS: MemorySlot[] = [
  { x: 0, y: 24, tilt: -4 },
  { x: 36, y: 0, tilt: 2 },
  { x: 70, y: 20, tilt: -2 },
];

const CARD_WIDTH: Record<MemoryMode, number> = {
  desktop: 30,
  compact: 40,
  stacked: 28,
};

function readMode(): MemoryMode {
  if (typeof window === "undefined") {
    return "desktop";
  }
  if (window.matchMedia("(max-width: 920px)").matches) {
    return "stacked";
  }
  if (window.matchMedia("(max-width: 1100px)").matches) {
    return "compact";
  }
  return "desktop";
}

function slotsFor(mode: MemoryMode) {
  if (mode === "stacked") {
    return STACKED_SLOTS;
  }
  if (mode === "compact") {
    return COMPACT_SLOTS;
  }
  return DESKTOP_SLOTS;
}

function memoryCaption(stop: VisitedJourneyStop) {
  const place = stopPlaceName(stop);
  const title = stop.title.trim();
  if (place && place.length <= 28) {
    return place;
  }
  return title || place;
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
  const lines: string[] = [];
  if (count >= 2) {
    lines.push(trail(slots[0], slots[1], cardWidth));
  }
  if (count === 3) {
    lines.push(trail(slots[1], slots[2], cardWidth));
  }
  if (count >= 4) {
    lines.push(trail(slots[2], slots[3], cardWidth));
  }
  return lines;
}

export function VisitedMemories({ stops }: { stops: VisitedJourneyStop[] }) {
  const [mode, setMode] = useState<MemoryMode>(readMode);
  const [broken, setBroken] = useState<Record<string, true>>({});
  const slots = slotsFor(mode);
  const visible = stops.slice(-slots.length);
  const cardWidth = CARD_WIDTH[mode];
  const lines = trailsFor(slots, visible.length, cardWidth);

  useEffect(() => {
    const compact = window.matchMedia("(max-width: 1100px)");
    const stacked = window.matchMedia("(max-width: 920px)");
    const update = () => setMode(readMode());
    update();
    compact.addEventListener("change", update);
    stacked.addEventListener("change", update);
    return () => {
      compact.removeEventListener("change", update);
      stacked.removeEventListener("change", update);
    };
  }, []);

  if (visible.length === 0) {
    return null;
  }

  return (
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
  );
}
