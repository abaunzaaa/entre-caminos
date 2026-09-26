type NamedCategory = { name?: string | null };

export type ExperienceCategorySource = {
  category?: NamedCategory | null;
  categories?: Array<NamedCategory | null> | null;
  experienceCategories?: Array<{
    position?: number;
    categoryId?: string;
    category?: (NamedCategory & { id?: string }) | null;
  }> | null;
  categoryId?: string | null;
};

function cleanName(name?: string | null) {
  return name?.trim() || "";
}

/** Todas las categorías, en el orden registrado. La primera es la principal. */
export function experienceCategoryNames(experience: ExperienceCategorySource) {
  const links = [...(experience.experienceCategories ?? [])].sort(
    (left, right) => (left.position ?? 0) - (right.position ?? 0),
  );
  const fromLinks = links.map((link) => cleanName(link.category?.name)).filter(Boolean);
  if (fromLinks.length) {
    return fromLinks;
  }
  const fromList = (experience.categories ?? []).map((category) => cleanName(category?.name)).filter(Boolean);
  if (fromList.length) {
    return fromList;
  }
  const single = cleanName(experience.category?.name);
  return single ? [single] : [];
}

export function formatExperienceCategories(experience: ExperienceCategorySource, fallback = "") {
  const names = experienceCategoryNames(experience);
  return names.length ? names.join(" · ") : fallback;
}

/** Clave de la primera categoría registrada. Solo para validar destacadas. */
export function primaryCategoryKey(experience: ExperienceCategorySource) {
  const links = [...(experience.experienceCategories ?? [])].sort(
    (left, right) => (left.position ?? 0) - (right.position ?? 0),
  );
  const first = links[0];
  return (
    first?.categoryId ||
    first?.category?.id ||
    experience.categoryId ||
    cleanName(experience.category?.name).toLocaleLowerCase("es") ||
    "sin-categoria"
  );
}
