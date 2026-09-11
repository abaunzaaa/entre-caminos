import { ArrowLeft } from "lucide-react";

type OnboardingActionsProps = {
  backLabel: string;
  continueLabel?: string;
  onBack: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLoading?: boolean;
};

export function OnboardingActions({
  backLabel,
  continueLabel = "Continuar",
  onBack,
  onContinue,
  continueDisabled = false,
  continueLoading = false,
}: OnboardingActionsProps) {
  return (
    <div className="onboarding-nav">
      <button type="button" className="onboarding-nav__btn onboarding-nav__btn--ghost" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        {backLabel}
      </button>
      <button
        type="button"
        className="onboarding-nav__btn onboarding-nav__btn--primary"
        onClick={onContinue}
        disabled={continueDisabled || continueLoading}
      >
        {continueLoading ? "Guardando…" : continueLabel}
      </button>
    </div>
  );
}
