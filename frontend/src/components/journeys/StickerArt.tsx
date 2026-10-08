import type { JourneyStickerKey } from "../../services/journey.service";

export const STICKER_GROUPS: Array<{ id: string; label: string; keys: JourneyStickerKey[] }> = [
  { id: "viajes", label: "Viajes", keys: ["compass", "camera", "sun"] },
  { id: "naturaleza", label: "Naturaleza", keys: ["leaf", "bloom", "sprig", "fern"] },
  { id: "mesa", label: "Gastronomía", keys: ["cup"] },
  { id: "fiesta", label: "Celebraciones", keys: ["ribbon", "star"] },
  { id: "corazon", label: "Corazones", keys: ["heart"] },
];

export const PLANNER_STICKERS: Array<{ key: JourneyStickerKey; label: string }> = [
  { key: "leaf", label: "Hoja" },
  { key: "bloom", label: "Flor" },
  { key: "sprig", label: "Rama" },
  { key: "fern", label: "Helecho" },
  { key: "sun", label: "Sol" },
  { key: "ribbon", label: "Cinta" },
  { key: "compass", label: "Brújula" },
  { key: "cup", label: "Taza" },
  { key: "heart", label: "Corazón" },
  { key: "star", label: "Estrella" },
  { key: "camera", label: "Cámara" },
];

const sage = "#A8AE94";
const olive = "#505840";
const beige = "#D6C7AC";

export function StickerArt({ stickerKey, className = "" }: { stickerKey: string; className?: string }) {
  const common = { viewBox: "0 0 64 64", className, "aria-hidden": true as const };
  if (stickerKey === "bloom") {
    return (
      <svg {...common}>
        <circle cx="32" cy="34" r="5" fill={beige} />
        <path d="M32 14c6 6 6 10 0 14-6-4-6-8 0-14Zm14 8c2 8-2 12-8 12 2-8 4-10 8-12Zm4 16c-6 6-10 4-12-2 8 0 10-2 12 2ZM32 50c-6-6-4-12 0-14 4 2 6 8 0 14ZM14 38c6-2 10 2 10 8-6-2-10-4-10-8Zm2-14c8 2 10 6 8 12-6-2-8-6-8-12Z" fill={sage} />
      </svg>
    );
  }
  if (stickerKey === "sprig" || stickerKey === "fern") {
    return (
      <svg {...common}>
        <path d="M18 50c10-6 16-18 16-32" fill="none" stroke={olive} strokeWidth="1.6" />
        <path d="M30 22c8-2 12 2 10 8-6 0-10-2-10-8Zm4 12c8 0 12 6 8 10-6-2-10-4-8-10Zm-8 8c8 2 10 8 4 12-6-2-8-6-4-12Z" fill={sage} />
      </svg>
    );
  }
  if (stickerKey === "sun") {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="8" fill="none" stroke={olive} strokeWidth="1.5" />
        <path d="M32 10v6M32 48v6M10 32h6M48 32h6M16 16l4 4M44 44l4 4M48 16l-4 4M20 44l-4 4" stroke={beige} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (stickerKey === "ribbon") {
    return (
      <svg {...common}>
        <path d="M10 26h44v8H10z" fill={beige} />
        <path d="M16 34l-4 14 8-5 8 5 8-5 8 5 8-5 8 5-4-14" fill={sage} />
      </svg>
    );
  }
  if (stickerKey === "compass") {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="16" fill="none" stroke={olive} strokeWidth="1.4" />
        <path d="M32 18l4 14-4 4-4-4 4-14Z" fill={olive} />
        <path d="M32 46l-4-14 4-4 4 4-4 14Z" fill={beige} />
      </svg>
    );
  }
  if (stickerKey === "cup") {
    return (
      <svg {...common}>
        <path d="M16 22h26v14a10 10 0 0 1-10 10h-6a10 10 0 0 1-10-10V22Z" fill="none" stroke={olive} strokeWidth="1.6" />
        <path d="M42 26h6a6 6 0 0 1 0 12h-6" fill="none" stroke={olive} strokeWidth="1.6" />
        <path d="M22 50h16" stroke={beige} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (stickerKey === "heart") {
    return (
      <svg {...common}>
        <path d="M32 50s-16-10-16-22a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 12-16 22-16 22Z" fill={beige} stroke={olive} strokeWidth="1.2" />
      </svg>
    );
  }
  if (stickerKey === "star") {
    return (
      <svg {...common}>
        <path d="M32 12l4 12h12l-10 7 4 12-10-7-10 7 4-12-10-7h12l4-12Z" fill={sage} stroke={olive} strokeWidth="1" />
      </svg>
    );
  }
  if (stickerKey === "camera") {
    return (
      <svg {...common}>
        <rect x="12" y="22" width="40" height="26" rx="2" fill="none" stroke={olive} strokeWidth="1.6" />
        <path d="M24 22l3-6h10l3 6" fill="none" stroke={olive} strokeWidth="1.6" />
        <circle cx="32" cy="35" r="7" fill="none" stroke={beige} strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M34 52C16 38 12 24 22 14c6 8 8 8 12-2 4 10 6 10 12 2-4 14-8 26-12 38Z" fill={olive} />
      <path d="M32 48c2-10 2-18 0-26" stroke={beige} strokeWidth="1.2" fill="none" />
    </svg>
  );
}
