import { PREFERENCE_GROUPS } from "../../data/onboarding";
import { OnboardingOptionCard } from "./OnboardingOptionCard";
import type { OnboardingForm } from "../../utils/onboarding";

type TabId = "ambientes" | "musica" | "presupuesto" | "clima";

const FIELD: Record<TabId, keyof Pick<OnboardingForm, "places" | "music" | "budget" | "climate">> = {
  ambientes: "places",
  musica: "music",
  presupuesto: "budget",
  clima: "climate",
};

export function PreferencesStep({
  form,
  tab,
  onTab,
  onToggle,
}: {
  form: OnboardingForm;
  tab: TabId;
  onTab: (tab: TabId) => void;
  onToggle: (field: keyof Pick<OnboardingForm, "places" | "music" | "budget" | "climate">, value: string, multiple: boolean) => void;
}) {
  const group = PREFERENCE_GROUPS.find((item) => item.id === tab) ?? PREFERENCE_GROUPS[0]!;
  const selected = form[FIELD[tab]];

  return (
    <div className="onboarding-prefs">
      <div className="onboarding-segment onboarding-segment--four" role="tablist" aria-label="Preferencias">
        {PREFERENCE_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`onboarding-segment__btn${tab === item.id ? " is-active" : ""}`}
            onClick={() => onTab(item.id as TabId)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <p className="onboarding-prefs__hint">{group.hint}</p>
      <div className="onboarding-chips onboarding-chips--prefs">
        {group.options.map((option) => (
          <OnboardingOptionCard
            key={option.value}
            variant="chip"
            label={option.label}
            icon={option.icon}
            selected={selected.includes(option.value)}
            onSelect={() => onToggle(FIELD[tab], option.value, group.multiple)}
          />
        ))}
      </div>
    </div>
  );
}
