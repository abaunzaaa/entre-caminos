import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { getFavoriteStatus, removeFavorite } from "../services/favorites.service";
import {
  notifyFavoritesChanged,
  notifyFavoriteStatus,
  onFavoriteStatus,
  openFavoriteSaveModal,
  showFavoriteToast,
} from "../services/favorites-sync";

type UseFavoriteToggleOptions = {
  /** When provided, skips per-card status fetch (prefer a shared batch on the page). */
  initialFavorited?: boolean;
  loginRedirectTo?: string;
  experienceTitle?: string;
  /** If true, remove directly without the save modal when adding. */
  skipSaveModal?: boolean;
};

export function useFavoriteToggle(experienceId: string, options: UseFavoriteToggleOptions = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasInitial = typeof options.initialFavorited === "boolean";
  const [favorited, setFavorited] = useState(Boolean(options.initialFavorited));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hasInitial) {
      setFavorited(Boolean(options.initialFavorited));
    }
  }, [hasInitial, options.initialFavorited, experienceId]);

  useEffect(() => {
    if (hasInitial || !user || !experienceId) {
      if (!user && !hasInitial) {
        setFavorited(false);
      }
      return;
    }
    let cancelled = false;
    getFavoriteStatus(experienceId)
      .then((value) => {
        if (!cancelled) {
          setFavorited(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFavorited(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [experienceId, hasInitial, user?.id]);

  useEffect(() => {
    return onFavoriteStatus((id, value) => {
      if (id === experienceId) {
        setFavorited(value);
      }
    });
  }, [experienceId]);

  async function toggle() {
    if (!experienceId || busy) {
      return;
    }
    if (!user) {
      navigate("/login", {
        state: { from: options.loginRedirectTo ?? `/explorar/${experienceId}` },
      });
      return;
    }

    if (!favorited) {
      openFavoriteSaveModal(experienceId, options.experienceTitle);
      return;
    }

    const previous = favorited;
    setFavorited(false);
    setBusy(true);
    try {
      await removeFavorite(experienceId);
      showFavoriteToast("Eliminado de favoritos");
      notifyFavoriteStatus(experienceId, false);
      notifyFavoritesChanged();
      window.dispatchEvent(new Event("ec-favorite-collections-changed"));
    } catch {
      setFavorited(previous);
    } finally {
      setBusy(false);
    }
  }

  return {
    favorited,
    busy,
    toggle: () => {
      void toggle();
    },
  };
}
