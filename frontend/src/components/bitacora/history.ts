export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] };
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function historyCommit<T>(state: HistoryState<T>, next: T, limit = 60): HistoryState<T> {
  if (same(state.present, next)) {
    return state;
  }
  return {
    past: [...state.past, state.present].slice(-limit),
    present: next,
    future: [],
  };
}

export function historyReplace<T>(state: HistoryState<T>, next: T): HistoryState<T> {
  return { ...state, present: next };
}

export function historyUndo<T>(state: HistoryState<T>): HistoryState<T> {
  const previous = state.past[state.past.length - 1];
  if (!previous) {
    return state;
  }
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function historyRedo<T>(state: HistoryState<T>): HistoryState<T> {
  const next = state.future[0];
  if (!next) {
    return state;
  }
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}
