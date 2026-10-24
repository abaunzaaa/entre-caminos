import type { ReactNode } from "react";

type CategoryGlyph = "art" | "culture" | "food" | "nature" | "wellness" | "city" | "neutral";

function glyphFor(name: string): CategoryGlyph {
  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (key.includes("arte") || key.includes("creativ")) return "art";
  if (key.includes("cultura") || key.includes("historia")) return "culture";
  if (key.includes("gastronom")) return "food";
  if (key.includes("naturaleza") || key.includes("aventura")) return "nature";
  if (key.includes("bienestar") || key.includes("deporte")) return "wellness";
  if (key.includes("urbano") || key.includes("ciudad")) return "city";
  return "neutral";
}

function Mark({ children }: { children: ReactNode }) {
  return (
    <svg className="caminos-boleto__mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function TicketCategoryIcon({ name }: { name: string }) {
  switch (glyphFor(name || "")) {
    case "art":
      return (
        <Mark>
          <path {...stroke} d="M15 8l1.1 3 3 1.1-3 1.1L15 16.2l-1.1-3-3-1.1 3-1.1z" />
          <ellipse {...stroke} cx="27" cy="38" rx="15" ry="10.5" transform="rotate(-34 27 38)" />
          <circle {...stroke} cx="20" cy="34" r="1.7" />
          <circle {...stroke} cx="25" cy="40" r="1.7" />
          <circle {...stroke} cx="22" cy="44" r="1.7" />
          <circle {...stroke} cx="29" cy="32" r="1.7" />
          <path {...stroke} d="M24 50c7-9 14-18 24-28" />
          <path {...stroke} d="M46 18l7-6 3.2 2.6-6.2 6.4z" />
          <path {...stroke} d="M38 46c5 2 9 1 11-3" />
        </Mark>
      );
    case "culture":
      return (
        <Mark>
          <circle {...stroke} cx="50" cy="11" r="3" />
          <path {...stroke} d="M16 20h32" />
          <path {...stroke} d="M13 27c5-8 11-10 19-10s14 2 19 10" />
          <path {...stroke} d="M13 27c-2 4 .6 7 4.4 6.2" />
          <path {...stroke} d="M51 27c2 4-.6 7-4.4 6.2" />
          <path {...stroke} d="M20 33h24" />
          <path {...stroke} d="M24 33v16M32 33v16M40 33v16" />
          <path {...stroke} d="M18 49c5 4 10 5.2 14 5.2S41 53 46 49" />
          <path {...stroke} d="M14 54h36" />
        </Mark>
      );
    case "food":
      return (
        <Mark>
          <path {...stroke} d="M12 8h12" />
          <path {...stroke} d="M13.5 8l1 13c.4 4.4 2.2 7 3.5 7s3.1-2.6 3.5-7l1-13" />
          <path {...stroke} d="M18 28v12" />
          <path {...stroke} d="M13 40h10" />
          <ellipse {...stroke} cx="38" cy="27" rx="12" ry="8.5" />
          <ellipse {...stroke} cx="38" cy="27" rx="7" ry="4.6" />
          <path {...stroke} d="M54 10c1.4 0 2.2 2.2 2 8-.2 4.2-1 8-1.6 10.5" />
          <path {...stroke} d="M54.4 28.5v14" />
          <path {...stroke} d="M58.5 10v6.5M60.6 10v6.5M62.7 10v6.5" />
          <path {...stroke} d="M60.6 16.5v26" />
        </Mark>
      );
    case "nature":
      return (
        <Mark>
          <path {...stroke} d="M3 42 18 24l8 10 12-18 8 12 15 14" />
          <circle {...stroke} cx="52" cy="14" r="4" />
          <path {...stroke} d="M4 52c8-7 13-3 17 2 4 5 7 3 11-2 5-6 11-7 17 0 4 5 8 4 11-1" />
        </Mark>
      );
    case "wellness":
      return (
        <Mark>
          <path {...stroke} d="M32 18 26 10M36 16V8M28 22l-8-4" />
          <path {...stroke} d="M44 14h7v4h-7z" />
          <path {...stroke} d="M42 18h11v22c0 2-1.2 3.2-3 3.2h-5c-1.8 0-3-1.2-3-3.2z" />
          <ellipse {...stroke} cx="22" cy="36" rx="13" ry="7.5" />
          <circle {...stroke} cx="16" cy="36" r="2.3" />
          <path {...stroke} d="M16 36c1.4-1.6 3-1.2 3.1.6" />
          <path {...stroke} d="M8 44h30l6 8H14z" />
        </Mark>
      );
    case "city":
      return (
        <Mark>
          <path {...stroke} d="M15 50V27" />
          <path {...stroke} d="M10 27h10l-1.4-6.5H11.4z" />
          <path {...stroke} d="M15 20.5V15" />
          <path {...stroke} d="M12.4 15h5.2" />
          <path {...stroke} d="M28 50V30h18v20" />
          <path {...stroke} d="M33 30v-3c0-5 3.6-7.5 5.5-7.5S44 22 44 27v3" />
          <path {...stroke} d="M38.5 19.5V15" />
          <path {...stroke} d="M32 36h2.4M37.2 36h2.4M32 41h2.4M37.2 41h2.4" />
          <path {...stroke} d="M30 50v-4.2c0-1.8 1.4-3 2.8-3s2.8 1.2 2.8 3V50" />
          <path {...stroke} d="M37.6 50v-4.2c0-1.8 1.4-3 2.8-3s2.8 1.2 2.8 3V50" />
          <path {...stroke} d="M46 36h8v14" />
          <path {...stroke} d="M8 50h50" />
          <path {...stroke} d="M12 50c5-4 9-3 14 1" />
        </Mark>
      );
    default:
      return (
        <Mark>
          <circle {...stroke} cx="32" cy="32" r="11" />
          <path {...stroke} d="M32 26.5v7" />
        </Mark>
      );
  }
}
