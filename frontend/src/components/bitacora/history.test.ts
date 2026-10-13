import { describe, expect, it } from "vitest";
import { createHistory, historyCommit, historyRedo, historyUndo } from "./history";

describe("historial de la bitácora", () => {
  it("deshace y rehace un cambio completo", () => {
    const start = createHistory([{ id: "a" }]);
    const added = historyCommit(start, [{ id: "a" }, { id: "b" }]);
    const undone = historyUndo(added);
    expect(undone.present).toEqual([{ id: "a" }]);
    expect(historyRedo(undone).present).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("no registra un estado idéntico", () => {
    const start = createHistory([1, 2]);
    expect(historyCommit(start, [1, 2]).past).toHaveLength(0);
  });
});
