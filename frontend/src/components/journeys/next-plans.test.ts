import { describe, expect, it } from "vitest";
import { selectUpcomingPlans } from "./next-plans";

const now = Date.parse("2026-10-12T12:00:00.000Z");

function plan(id: string, plannedAt: string) {
  return { id, plannedAt };
}

describe("selectUpcomingPlans", () => {
  it("no pagina cuando hay de 0 a 4 planes futuros", () => {
    for (const count of [0, 1, 2, 3, 4]) {
      const plans = Array.from({ length: count }, (_, index) => plan(`p${index}`, new Date(now + (index + 1) * 3_600_000).toISOString()));
      const result = selectUpcomingPlans(plans, now, 0);
      expect(result.total).toBe(count);
      expect(result.items).toHaveLength(count);
      expect(result.showPager).toBe(false);
      expect(result.pageCount).toBe(1);
    }
  });

  it("agrupa de a cuatro, en orden, y desborda a la página siguiente", () => {
    const plans = Array.from({ length: 9 }, (_, index) => plan(`p${index}`, new Date(now + (9 - index) * 3_600_000).toISOString()));
    const first = selectUpcomingPlans(plans, now, 0);
    const second = selectUpcomingPlans(plans, now, 1);
    const third = selectUpcomingPlans(plans, now, 2);

    expect(first.showPager).toBe(true);
    expect(first.pageCount).toBe(3);
    expect(first.items.map((item) => item.id)).toEqual(["p8", "p7", "p6", "p5"]);
    expect(second.items.map((item) => item.id)).toEqual(["p4", "p3", "p2", "p1"]);
    expect(third.items.map((item) => item.id)).toEqual(["p0"]);
  });

  it("excluye planes pasados y duplicados", () => {
    const result = selectUpcomingPlans(
      [
        plan("past", new Date(now - 60_000).toISOString()),
        plan("now", new Date(now).toISOString()),
        plan("later", new Date(now + 60_000).toISOString()),
        plan("later", new Date(now + 120_000).toISOString()),
      ],
      now,
      0,
    );

    expect(result.items.map((item) => item.id)).toEqual(["now", "later"]);
  });

  it("vuelve a una página válida si la actual ya no existe", () => {
    const plans = Array.from({ length: 5 }, (_, index) => plan(`p${index}`, new Date(now + (index + 1) * 3_600_000).toISOString()));
    const result = selectUpcomingPlans(plans, now, 4);
    expect(result.page).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
