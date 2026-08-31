import { Link } from "react-router-dom";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-3">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full border ${
          inverted ? "border-cream/40 text-cream" : "border-forest/20 text-forest"
        }`}
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M6 22c6-10 14-10 20 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M8 18c5-7 11-7 16 0"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <circle cx="16" cy="10" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span className="leading-tight">
        <span
          className={`block font-serif text-lg tracking-wide ${inverted ? "text-cream" : "text-forest"}`}
        >
          Entre Caminos
        </span>
        <span className={`block text-[10px] uppercase tracking-[0.28em] ${inverted ? "text-cream/70" : "text-forest/60"}`}>
          experiencias
        </span>
      </span>
    </Link>
  );
}
