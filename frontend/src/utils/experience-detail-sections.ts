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
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
