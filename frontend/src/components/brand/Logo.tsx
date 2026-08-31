import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

type LogoProps = {
  inverted?: boolean;
  compact?: boolean;
};

export function Logo({ inverted = false, compact = false }: LogoProps) {
  return (
    <Link to="/" className="group inline-flex items-center gap-3">
      <span
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-full border",
          inverted ? "border-cream/40 text-cream" : "border-forest/20 text-forest",
        )}
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M6 22c4-9 8-9 10-3s6 8 10-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="16" cy="10" r="1.6" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span>
          <span
            className={cn(
              "block font-serif text-lg tracking-wide",
              inverted ? "text-cream" : "text-forest",
            )}
          >
            Entre Caminos
          </span>
          <span
            className={cn(
              "block text-[10px] uppercase tracking-brand",
              inverted ? "text-cream/70" : "text-forest-soft",
            )}
          >
            Experiencias
          </span>
        </span>
      )}
    </Link>
  );
}
