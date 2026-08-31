import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

export function MapHeartLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "grid h-20 w-20 place-items-center rounded-full border border-black bg-white",
        className,
      )}
      aria-label="Entre Caminos"
    >
      <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden>
        <path d="M10 16l10-5 9 5 9-4v22l-9 4-9-5-10 5V16z" stroke="#111" strokeWidth="1.4" />
        <path d="M20 20c0-2.2 1.7-3.6 3.5-3.6S27 17.8 27 20c0 3.4-3.5 6.2-3.5 6.2S20 23.4 20 20z" stroke="#111" strokeWidth="1.3" />
      </svg>
    </Link>
  );
}

export function EmblemEC() {
  return (
    <div className="grid h-24 w-24 place-items-center rounded-full border border-black">
      <span className="font-serif text-3xl italic">EC</span>
    </div>
  );
}

export function CathedralMark() {
  return (
    <svg viewBox="0 0 160 120" className="mx-auto h-24 w-40 text-black" fill="none" aria-hidden>
      <path d="M80 8l8 16h-16L80 8z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M80 24v10" stroke="currentColor" />
      <path d="M52 42h56v62H52z" stroke="currentColor" />
      <path d="M40 56h80v48H40z" stroke="currentColor" />
      <path d="M68 104V72h24v32" stroke="currentColor" />
      <circle cx="80" cy="58" r="6" stroke="currentColor" />
      <path d="M28 104h104" stroke="currentColor" />
    </svg>
  );
}
