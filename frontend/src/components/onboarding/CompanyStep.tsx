import { COMPANY_OPTIONS } from "../../data/onboarding";
import { OnboardingOptionCard } from "./OnboardingOptionCard";

export function CompanyStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="onboarding-company-grid">
      {COMPANY_OPTIONS.map((option) => (
        <OnboardingOptionCard
          key={option.value}
          variant="company"
          label={option.label}
          hint={option.hint}
          icon={option.icon}
          selected={selected.includes(option.value)}
          onSelect={() => onToggle(option.value)}
        />
      ))}
    </div>
  );
}
