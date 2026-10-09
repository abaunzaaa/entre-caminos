type ChangeListener = () => void;
type VisitedListener = (experienceId: string, visited: boolean) => void;

const changeListeners = new Set<ChangeListener>();
const visitedListeners = new Set<VisitedListener>();

export function notifyVisitsChanged() {
  changeListeners.forEach((listener) => listener());
}

export function onVisitsChanged(listener: ChangeListener) {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function notifyVisitedStatus(experienceId: string, visited: boolean) {
  visitedListeners.forEach((listener) => listener(experienceId, visited));
}

export function onVisitedStatus(listener: VisitedListener) {
  visitedListeners.add(listener);
  return () => {
    visitedListeners.delete(listener);
  };
}
