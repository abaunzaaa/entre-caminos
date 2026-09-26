import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExperienceEditorialView } from "../components/admin/ExperienceEditorialView";
import { useGuide } from "../components/guide/GuideContext";
import { useAuth } from "../hooks/useAuth";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const guide = useGuide();
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
    let cancelled = false;
    setLoading(true);
    setError("");
    setFavoriteOn(false);
    getPublicExperience(id)
      .then((item) => {
        if (cancelled) {
          return;
        }
        setExperience(item);
        void recordExperienceView(id).catch(() => undefined);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setExperience(null);
        setError("No se pudo cargar la experiencia");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
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
        onConsultAi={() => {
          if (!user) {
            navigate("/login");
            return;
          }
          guide.setCatalogFocus(experience);
          guide.openGuide({ experience, view: "chat", expanded: true });
        }}
      />
    </div>
  );
}
