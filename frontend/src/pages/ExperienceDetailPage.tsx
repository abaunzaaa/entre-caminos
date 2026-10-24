import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ExperienceEditorialView } from "../components/admin/ExperienceEditorialView";
import { VisitLockedDialog, VisitMarkedDialog } from "../components/experiences/VisitReviewDialogs";
import { useGuide } from "../components/guide/GuideContext";
import { useAuth } from "../hooks/useAuth";
import { useFavoriteToggle } from "../hooks/useFavoriteToggle";
import { useVisitedToggle } from "../hooks/useVisitedToggle";
import { getNearbyExperiences, getPublicExperience, recordExperienceView } from "../services/catalog.service";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const guide = useGuide();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visitWelcomeOpen, setVisitWelcomeOpen] = useState(false);
  const [visitLockOpen, setVisitLockOpen] = useState(false);
  const [reviewExperienceId, setReviewExperienceId] = useState<string | null>(null);
  const [composeRequest, setComposeRequest] = useState(0);
  const [reviewFocusRequest, setReviewFocusRequest] = useState(0);
  const favorite = useFavoriteToggle(id ?? "", {
    loginRedirectTo: id ? `/explorar/${id}` : "/explorar",
    experienceTitle: experience?.title,
  });
  const visited = useVisitedToggle(id ?? "", {
    loginRedirectTo: id ? `/explorar/${id}` : "/explorar",
    onMarkedVisited: () => setVisitWelcomeOpen(true),
    onUnvisitBlocked: () => setVisitLockOpen(true),
  });

  const openReviewComposer = useCallback(() => {
    if (!id) {
      return;
    }
    setReviewExperienceId(id);
    setComposeRequest((value) => value + 1);
  }, [id]);

  useLayoutEffect(() => {
    setVisitWelcomeOpen(false);
    setVisitLockOpen(false);
    setReviewFocusRequest(0);
    if (searchParams.get("calificar") !== "1") {
      setReviewExperienceId(null);
      setComposeRequest(0);
    }
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!id || !user || visited.settledFor !== id || !visited.visited || searchParams.get("calificar") !== "1") {
      return;
    }
    openReviewComposer();
    const next = new URLSearchParams(searchParams);
    next.delete("calificar");
    setSearchParams(next, { replace: true });
  }, [id, openReviewComposer, searchParams, setSearchParams, user, visited.settledFor, visited.visited]);

  const fetchNearby = useCallback(async () => getNearbyExperiences(), []);

  useEffect(() => {
    if (experience) {
      guide.setCatalogFocus(experience);
    }
  }, [experience, guide]);

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

  const waitingForRoute = Boolean(id && experience && experience.id !== id);

  if (loading || waitingForRoute) {
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
        favoriteOn={favorite.favorited}
        favoriteBusy={favorite.busy}
        onFavoriteToggle={favorite.toggle}
        visitedOn={visited.visited}
        visitedBusy={visited.busy}
        onVisitedToggle={visited.toggle}
        reviewComposeRequest={reviewExperienceId === experience.id ? composeRequest : 0}
        reviewFocusRequest={reviewFocusRequest}
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
      <VisitMarkedDialog
        open={visitWelcomeOpen}
        onLater={() => setVisitWelcomeOpen(false)}
        onRate={() => {
          setVisitWelcomeOpen(false);
          openReviewComposer();
        }}
      />
      <VisitLockedDialog
        open={visitLockOpen}
        onClose={() => setVisitLockOpen(false)}
        onViewReview={() => {
          setVisitLockOpen(false);
          setReviewFocusRequest((value) => value + 1);
        }}
      />
    </div>
  );
}
