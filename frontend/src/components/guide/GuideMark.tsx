export function GuideMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 7.2c-6.55 0-11.8 5.15-11.8 11.45 0 8.7 11.8 22.15 11.8 22.15s11.8-13.45 11.8-22.15C35.8 12.35 30.55 7.2 24 7.2z"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinejoin="round"
      />
      <path
        d="M20.6 16.05c.7-2.15 2.45-3.45 4.85-3.45 2.85 0 4.9 1.7 4.9 4.2 0 2.05-1.05 3.15-2.85 4.2-1.35.8-1.95 1.5-1.95 2.75"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
      />
      <circle cx="24" cy="27.15" r="1.55" fill="currentColor" />
    </svg>
  );
}
