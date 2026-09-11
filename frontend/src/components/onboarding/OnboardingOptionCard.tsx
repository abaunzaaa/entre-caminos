import { Check, type LucideIcon } from "lucide-react";

type OnboardingOptionCardProps = {
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  variant?: "card" | "chip" | "row" | "company";
  hint?: string;
};

export function OnboardingOptionCard({
  label,
  icon: Icon,
  selected,
  onSelect,
  variant = "card",
  hint,
}: OnboardingOptionCardProps) {
  if (variant === "company") {
    return (
      <button
        type="button"
        className={`onboarding-company-card${selected ? " is-selected" : ""}`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {selected ? (
          <span className="onboarding-choice__check" aria-hidden="true">
            <Check size={11} strokeWidth={2.6} />
          </span>
        ) : null}
        <span className="onboarding-choice__icon" aria-hidden="true">
          <Icon size={28} strokeWidth={1.6} />
        </span>
        <span className="onboarding-choice__name">{label}</span>
        {hint ? <span className="onboarding-company-card__hint">{hint}</span> : null}
      </button>
    );
  }

  if (variant !== "card") {
    return (
      <button
        type="button"
        className={`${variant === "row" ? "onboarding-row" : "onboarding-chip"}${selected ? " is-selected" : ""}`}
        aria-pressed={selected}
        aria-label={`Seleccionar ${label}`}
        onClick={onSelect}
      >
        <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
        {label}
        {selected ? <Check size={14} strokeWidth={2.4} aria-hidden="true" /> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`onboarding-choice${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={`Seleccionar ${label}`}
      onClick={onSelect}
    >
      {selected ? (
        <span className="onboarding-choice__check" aria-hidden="true">
          <Check size={11} strokeWidth={2.6} />
        </span>
      ) : null}
      <span className="onboarding-choice__icon" aria-hidden="true">
        <Icon size={16} strokeWidth={1.7} />
      </span>
      <span className="onboarding-choice__name">{label}</span>
    </button>
  );
}
