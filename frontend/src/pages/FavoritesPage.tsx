import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FavoritesLibrary } from "../components/explorer/FavoritesLibrary";
import { useAuth } from "../hooks/useAuth";
import { listFavoriteExperiences } from "../services/favorites.service";
import { onFavoritesChanged } from "../services/favorites-sync";
import type { Experience } from "../types";
import "../styles/explorer.css";

export function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setExperiences([]);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    function loadFavorites(showSpinner = true) {
      if (showSpinner) {
        setLoading(true);
      }
      setError("");
      listFavoriteExperiences()
        .then((items) => {
          if (!cancelled) {
            setExperiences(items);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setExperiences([]);
            setError("No pudimos cargar tus favoritos. Intenta de nuevo.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }

    loadFavorites(true);
    const unsubscribe = onFavoritesChanged(() => loadFavorites(false));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.id, authLoading]);

  return (
    <main className="favorites-library" aria-labelledby="favorites-page-title">
      {authLoading || loading ? (
        <div className="favorites-library__status">
          <p className="favorites-library__status-text">Cargando tus favoritos…</p>
        </div>
      ) : !user ? (
        <div className="favorites-library__status">
          <h1 className="favorites-library__title" id="favorites-page-title">
            Favoritos
          </h1>
          <p className="favorites-library__lead">Inicia sesión para guardar y ver tus favoritos</p>
          <Link to="/login" className="explorer-empty__cta">
            Acceder
          </Link>
        </div>
      ) : error ? (
        <div className="favorites-library__status">
          <h1 className="favorites-library__title" id="favorites-page-title">
            Favoritos
          </h1>
          <p className="favorites-library__status-text">{error}</p>
        </div>
      ) : (
        <FavoritesLibrary experiences={experiences} />
      )}
    </main>
  );
}
