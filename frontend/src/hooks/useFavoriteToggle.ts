import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { addFavorite, getFavoriteStatus, removeFavorite } from "../services/favorites.service";
import { notifyFavoritesChanged, showFavoriteToast } from "../services/favorites-sync";

type UseFavoriteToggleOptions = {
  /** When provided, skips per-card status fetch (prefer a shared batch on the page). */
  initialFavorited?: boolean;
  loginRedirectTo?: string;
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

    const previous = favorited;
    setFavorited(!previous);
    setBusy(true);
    try {
      if (previous) {
        await removeFavorite(experienceId);
        showFavoriteToast("Eliminado de favoritos");
      } else {
        await addFavorite(experienceId);
        showFavoriteToast("Añadido a favoritos");
      }
      notifyFavoritesChanged();
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
