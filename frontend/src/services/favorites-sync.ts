type ChangeListener = () => void;
type ToastListener = (message: string) => void;
type SaveModalListener = (payload: { experienceId: string; experienceTitle?: string }) => void;
type FavoritedListener = (experienceId: string, favorited: boolean) => void;

const changeListeners = new Set<ChangeListener>();
const toastListeners = new Set<ToastListener>();
const saveModalListeners = new Set<SaveModalListener>();
const favoritedListeners = new Set<FavoritedListener>();

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

export function openFavoriteSaveModal(experienceId: string, experienceTitle?: string) {
  saveModalListeners.forEach((listener) => listener({ experienceId, experienceTitle }));
}

export function onFavoriteSaveModal(listener: SaveModalListener) {
  saveModalListeners.add(listener);
  return () => {
    saveModalListeners.delete(listener);
  };
}

export function notifyFavoriteStatus(experienceId: string, favorited: boolean) {
  favoritedListeners.forEach((listener) => listener(experienceId, favorited));
}

export function onFavoriteStatus(listener: FavoritedListener) {
  favoritedListeners.add(listener);
  return () => {
    favoritedListeners.delete(listener);
  };
}
