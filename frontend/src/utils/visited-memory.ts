const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"] as const;

export type VisitMemoryReview = {
  experienceId: string;
  rating: number;
  comment: string;
  location: { id: string; label: string } | null;
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

/** Fecha en que la experiencia se marcó como visitada. Vacío si no hay una fecha real. */
export function formatVisitedStamp(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const year = parts.find((part) => part.type === "year")?.value;
  if (!day || !year || month < 1 || month > 12) {
    return "";
  }
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatVisitRating(value: number) {
  return new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

/**
 * Reseña del usuario para esa experiencia.
 * Si hay varias sedes, prefiere la que corresponde al municipio de la polaroid.
 * Si hay varias y ninguna coincide, no elige una al azar.
 */
export function pickVisitReview<T extends VisitMemoryReview>(reviews: T[], experienceId: string, municipality: string): T | null {
  const mine = reviews.filter((review) => review.experienceId === experienceId && Number.isFinite(review.rating) && review.rating > 0);
  if (!mine.length) {
    return null;
  }
  const city = fold(municipality);
  if (city) {
    const matched = mine.find((review) => fold(review.location?.label ?? "").includes(city));
    if (matched) {
      return matched;
    }
  }
  if (mine.length === 1) {
    return mine[0];
  }
  const unlocated = mine.filter((review) => !review.location);
  if (unlocated.length === 1) {
    return unlocated[0];
  }
  return null;
}
