export const EXPERIENCE_DETAIL_SECTIONS = {
  info: "experiencia-informacion",
  location: "experiencia-ubicacion",
  reviews: "experiencia-resenas",
  ownReview: "experiencia-resena-propia",
} as const;

export function experienceDetailTabFromHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (id === EXPERIENCE_DETAIL_SECTIONS.reviews || id === EXPERIENCE_DETAIL_SECTIONS.ownReview) {
    return EXPERIENCE_DETAIL_SECTIONS.reviews;
  }
  if (id === EXPERIENCE_DETAIL_SECTIONS.location || id === EXPERIENCE_DETAIL_SECTIONS.info) {
    return id;
  }
  return null;
}
