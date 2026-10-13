/** Experiencia general 70 %, organización 15 %, calidad-precio 15 %. */
export function reviewScore(
  rating: number,
  organizationRating: number | null | undefined,
  valueRating: number | null | undefined,
) {
  if (organizationRating == null || valueRating == null) {
    return rating;
  }
  const score = rating * 0.7 + organizationRating * 0.15 + valueRating * 0.15;
  return Math.round(score * 100) / 100;
}

export function roundRating(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  return Math.round(value * 10) / 10;
}

/** Estrellas pintadas: el score se acerca al paso de 0.5 más cercano. */
export function starsForScore(score: number) {
  return Math.round(score * 2) / 2;
}

export function ratingNumber(value: number | { toNumber: () => number } | null | undefined) {
  if (value == null) {
    return 0;
  }
  return typeof value === "number" ? value : value.toNumber();
}
