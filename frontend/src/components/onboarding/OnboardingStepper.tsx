import { Check } from "lucide-react";
import { ONBOARDING_STEPS } from "../../utils/onboarding";

type OnboardingStepperProps = {
  currentStep: number;
  steps?: { id: string; label: string }[];
  onStepSelect?: (step: number) => void;
};

export function OnboardingStepper({
  currentStep,
  steps = ONBOARDING_STEPS.map((step) => ({ id: step.id, label: step.label })),
  onStepSelect,
}: OnboardingStepperProps) {
  return (
    <nav className="onboarding-stepper" aria-label="Progreso del perfil">
      {steps.map((step, index) => {
        const number = index + 1;
        const done = number < currentStep;
        const current = number === currentStep;
        const clickable = Boolean(onStepSelect) && number < currentStep;

        return (
          <div key={step.id} className="onboarding-stepper__group">
            <button
              type="button"
              className={`onboarding-stepper__item${current ? " is-current" : ""}${done ? " is-done" : ""}${clickable ? " is-clickable" : ""}`}
              aria-current={current ? "step" : undefined}
              aria-label={`${number} — ${step.label}`}
              disabled={number > currentStep}
              onClick={() => {
                if (clickable) {
                  onStepSelect?.(number);
                }
              }}
            >
              <span className="onboarding-stepper__node" aria-hidden="true">
                {done ? <Check size={13} strokeWidth={2.6} /> : number}
              </span>
              <span className="onboarding-stepper__label">{step.label}</span>
            </button>
            {index < steps.length - 1 ? (
              <span className={`onboarding-stepper__line${done ? " is-done" : ""}`} aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
