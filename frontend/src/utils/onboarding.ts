const KEY = "ec_onboarding";

export type OnboardingDraft = {
  name: string;
  location: string;
  avatar: string;
  photoMode: "upload" | "avatar";
  preferences: string[];
};

const empty: OnboardingDraft = {
  name: "",
  location: "",
  avatar: "",
  photoMode: "upload",
  preferences: [],
};

export function getOnboarding(): OnboardingDraft {
  try {
    return { ...empty, ...JSON.parse(sessionStorage.getItem(KEY) ?? "{}") };
  } catch {
    return empty;
  }
}

export function saveOnboarding(partial: Partial<OnboardingDraft>) {
  const next = { ...getOnboarding(), ...partial };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
