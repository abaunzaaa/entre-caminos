type VisitedCheckIconProps = {
  filled: boolean;
  size?: number;
};

const CHECK_PATH = "M2.63 14.07L9.54 20.98L21.81 8.13L18.19 4.67L9.46 13.82L6.17 10.53Z";

export function VisitedCheckIcon({ filled, size = 16 }: VisitedCheckIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.05"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={CHECK_PATH} />
    </svg>
  );
}
