export const NEXT_PLANS_PAGE = 4;

export type DatedPlan = {
  id: string;
  plannedAt: string;
};

export function selectUpcomingPlans<T extends DatedPlan>(plans: T[], now: number, page: number, size = NEXT_PLANS_PAGE) {
  const seen = new Set<string>();
  const upcoming = plans
    .filter((plan) => {
      if (!plan.id || seen.has(plan.id)) {
        return false;
      }
      const start = new Date(plan.plannedAt).getTime();
      if (!Number.isFinite(start) || start < now) {
        return false;
      }
      seen.add(plan.id);
      return true;
    })
    .sort((left, right) => new Date(left.plannedAt).getTime() - new Date(right.plannedAt).getTime());

  const pageCount = Math.max(1, Math.ceil(upcoming.length / size));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const start = safePage * size;

  return {
    items: upcoming.slice(start, start + size),
    page: safePage,
    pageCount,
    total: upcoming.length,
    showPager: upcoming.length > size,
  };
}
