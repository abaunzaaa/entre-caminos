type ChangeListener = () => void;
type ToastListener = (message: string) => void;

const changeListeners = new Set<ChangeListener>();
const toastListeners = new Set<ToastListener>();

/** Notify Favoritos / Inicio sections to refetch after a toggle. */
export function notifyFavoritesChanged() {
  changeListeners.forEach((listener) => listener());
}

export function onFavoritesChanged(listener: ChangeListener) {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function showFavoriteToast(message: string) {
  toastListeners.forEach((listener) => listener(message));
}

export function onFavoriteToast(listener: ToastListener) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}
