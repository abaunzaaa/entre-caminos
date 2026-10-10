export const EXPERIENCE_DETAIL_SECTIONS = {
  info: "experiencia-informacion",
  location: "experiencia-ubicacion",
  reviews: "experiencia-resenas",
  ownReview: "experiencia-resena-propia",
} as const;

export function scrollToExperienceSection(id: string) {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }
  node.scrollIntoView({ behavior: "auto", block: "start" });
}
