import type { DurationKey, PlannerItinerary, PlannerPreferences } from "../../services/planner.service";

const BAND: Record<DurationKey, [number, number]> = {
  "1-2": [60, 150],
  "3-5": [150, 330],
  "5-8": [300, 520],
  "8+": [480, 1440],
};

export type FitIcon = "leaf" | "home" | "walk" | "wallet" | "calendar";

export type FitBar = {
  key: string;
  label: string;
  hint: string;
  value: number;
  icon: FitIcon;
};

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

export function planMinutes(draft: PlannerItinerary) {
  return draft.stops.reduce((sum, stop) => sum + (stop.durationMinutes && stop.durationMinutes > 0 ? stop.durationMinutes : 0), 0);
}

export function durationCopy(draft: PlannerItinerary) {
  const minutes = planMinutes(draft);
  if (minutes <= 0) return draft.durationLabel?.trim() || "Por confirmar";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (rest === 0) return hours === 1 ? "1 hora" : `${hours} horas`;
  return `${hours} h ${rest} min`;
}

export function durationDots(draft: PlannerItinerary) {
  const minutes = planMinutes(draft);
  if (minutes > 0) {
    if (minutes < 90) return 1;
    if (minutes < 150) return 2;
    if (minutes < 240) return 3;
    if (minutes < 420) return 4;
    return 5;
  }
  if (draft.durationKey === "1-2") return 2;
  if (draft.durationKey === "3-5") return 3;
  if (draft.durationKey === "5-8") return 4;
  if (draft.durationKey === "8+") return 5;
  return 0;
}

export function effortEstimate(draft: PlannerItinerary) {
  const minutes = planMinutes(draft);
  if (minutes <= 0) return { label: "Sin estimar", dots: 0 };
  if (minutes < 150) return { label: "Suave", dots: 2 };
  if (minutes < 300) return { label: "Moderado", dots: 3 };
  if (minutes < 480) return { label: "Alto", dots: 4 };
  return { label: "Intenso", dots: 5 };
}

export function atmosphereCopy(draft: PlannerItinerary) {
  const venue = draft.venue;
  const source = venue?.environments?.length ? venue.environments : venue?.categories?.length ? venue.categories : draft.stops.map((stop) => stop.category);
  const unique = [...new Set(source.map((item) => item.trim()).filter(Boolean))].slice(0, 3);
  if (!unique.length) return "";
  return unique.map((item) => item.toLocaleLowerCase("es")).join(", ");
}

export function planFit(draft: PlannerItinerary, prefs: PlannerPreferences) {
  const bars: FitBar[] = [];
  const venue = draft.venue;
  const selected = prefs.interests.map((item) => item.trim()).filter(Boolean);
  if (selected.length && venue?.interests?.length) {
    const known = new Set(venue.interests.map(fold));
    const hits = selected.filter((name) => known.has(fold(name))).length;
    bars.push({
      key: "intereses",
      label: "Intereses",
      icon: "leaf",
      value: hits / selected.length,
      hint: `${hits} de ${selected.length} intereses elegidos aparecen en la experiencia.`,
    });
  }
  const asked = (draft.requestedMunicipality || prefs.municipality || "").trim();
  const got = draft.municipality.trim();
  if (asked && got) {
    const same = fold(asked) === fold(got);
    bars.push({
      key: "municipio",
      label: "Municipio",
      icon: "home",
      value: same ? 1 : 0.4,
      hint: same ? `El plan queda en ${got}, el municipio pedido.` : `Pediste ${asked} y el plan usa ${got}.`,
    });
  }
  const minutes = planMinutes(draft);
  const band = BAND[draft.durationKey];
  if (minutes > 0 && band) {
    const inside = minutes >= band[0] && minutes <= band[1];
    bars.push({
      key: "duracion",
      label: "Duración",
      icon: "walk",
      value: inside ? 1 : 0.35,
      hint: inside
        ? `El recorrido suma ${minutes} min y entra en la duración elegida.`
        : `El recorrido suma ${minutes} min y queda fuera de la duración elegida.`,
    });
  }
  const price = draft.estimatedCop;
  const budget = draft.budgetCop || prefs.budgetCop;
  if (price > 0 && budget > 0 && prefs.budgetChosen !== false) {
    const inside = price <= budget;
    bars.push({
      key: "presupuesto",
      label: "Presupuesto",
      icon: "wallet",
      value: inside ? 1 : 0.3,
      hint: inside ? "El precio publicado cabe en el presupuesto elegido." : "El precio publicado supera el presupuesto elegido.",
    });
  }
  if (venue && venue.available != null) {
    bars.push({
      key: "fecha",
      label: "Fecha",
      icon: "calendar",
      value: venue.available ? 1 : 0,
      hint: venue.available
        ? "La sede indica disponibilidad para la fecha del plan."
        : "La sede no confirma disponibilidad para esa fecha.",
    });
  }
  if (!bars.length) return { score: null as number | null, bars };
  const score = Math.round((bars.reduce((sum, bar) => sum + bar.value, 0) / bars.length) * 100);
  return { score, bars };
}
