import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExperienceEditorialView } from "../components/admin/ExperienceEditorialView";
import { getPublicExperience, getPublicExperiences } from "../services/catalog.service";
import type { Experience } from "../types";
import "../styles/admin-ui.css";
import "../styles/admin-access.css";
import "../styles/experience-editorial-gallery.css";
import "../styles/experience-editorial-dossier.css";
import "../styles/experience-editorial-map.css";
import "../styles/experience-editorial-nearby.css";
import "../styles/explorer.css";

export function ExperienceDetailPage() {
  const { id } = useParams();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteOn, setFavoriteOn] = useState(false);

  const fetchNearby = useCallback(async () => {
    const { experiences } = await getPublicExperiences();
    return experiences;
  }, []);

  useEffect(() => {
    if (!id) {
      setExperience(null);
      setLoading(false);
      setError("Experiencia no encontrada");
      return;
    }
    setLoading(true);
    setError("");
    setFavoriteOn(false);
    getPublicExperience(id)
      .then(setExperience)
      .catch(() => {
        setExperience(null);
        setError("No se pudo cargar la experiencia");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="dash dash--exps dash--exps-preview tourist-editorial-shell">
        <p className="dash-section__lead" style={{ padding: "6rem 1.5rem" }}>
          Cargando experiencia…
        </p>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="dash dash--exps dash--exps-preview tourist-editorial-shell">
        <p className="dash-section__lead" style={{ padding: "6rem 1.5rem" }}>
          {error || "Experiencia no encontrada"}
        </p>
      </div>
    );
  }

  return (
    <div className="dash dash--exps dash--exps-preview tourist-editorial-shell">
      <ExperienceEditorialView
        experience={experience}
        mode="tourist"
        favoriteOn={favoriteOn}
        onFavoriteToggle={() => setFavoriteOn((value) => !value)}
        nearbyHref={(nearbyId) => `/explorar/${nearbyId}`}
        fetchNearby={fetchNearby}
      />
    </div>
  );
}
