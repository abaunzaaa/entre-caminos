export type VisitCategory = {
  id: string;
  name: string;
};

export type VisitedCategoryFilter = {
  id: string;
  name: string;
  count: number;
};

type FilterStop = {
  categories?: VisitCategory[] | null;
};

export function stopMatchesCategory(stop: FilterStop, categoryId: string | null) {
  if (!categoryId) {
    return true;
  }
  return (stop.categories ?? []).some((category) => category.id === categoryId);
}

/** Solo categorías que aparecen en las experiencias visitadas, ordenadas por nombre. */
export function visitedCategoryFilters(stops: FilterStop[]): VisitedCategoryFilter[] {
  const counts = new Map<string, VisitedCategoryFilter>();
  for (const stop of stops) {
    const seen = new Set<string>();
    for (const category of stop.categories ?? []) {
      const id = category.id?.trim() ?? "";
      const name = category.name?.trim() ?? "";
      if (!id || !name || seen.has(id)) {
        continue;
      }
      seen.add(id);
      const current = counts.get(id);
      if (current) {
        current.count += 1;
      } else {
        counts.set(id, { id, name, count: 1 });
      }
    }
  }
  return [...counts.values()].sort((left, right) => left.name.localeCompare(right.name, "es"));
}
