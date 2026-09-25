import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Sparkles } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import {
  featureExperience,
  getAdminExperiences,
  getAdminFeaturedExperiences,
  getFeaturedRanking,
  reorderFeaturedExperiences,
  unfeatureExperience,
  type FeaturedRankingCriterion,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import type { Experience, FeaturedExperienceCard } from "../../types";
import "../../styles/admin-featured.css";

type FinderMode = FeaturedRankingCriterion | "editorial";

const CRITERIA: Array<{ value: FinderMode; label: string }> = [
  { value: "rating", label: "⭐ Mejor calificadas" },
  { value: "visits", label: "👁 Más visitadas" },
  { value: "favorites", label: "❤️ Más guardadas" },
  { value: "reviews", label: "💬 Más reseñadas" },
  { value: "trending", label: "🔥 Mayor interacción reciente" },
  { value: "editorial", label: "✨ Selección editorial" },
];

function toIso(value: string) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function formatDay(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function periodLabel(from: string | null, until: string | null) {
  if (!from && !until) {
    return "Sin periodo definido";
  }
  return `${formatDay(from) || "sin inicio"} - ${formatDay(until) || "sin fin"}`;
}

function MetricList({ card, emphasize }: { card: FeaturedExperienceCard; emphasize?: FinderMode }) {
  return (
    <ul className="featured-admin__metrics">
      <li className={emphasize === "visits" ? "is-emphasis" : undefined}>👁 {card.metrics.visits} visitas</li>
      <li className={emphasize === "favorites" ? "is-emphasis" : undefined}>❤️ {card.metrics.favorites} favoritos</li>
      <li className={emphasize === "reviews" ? "is-emphasis" : undefined}>💬 {card.metrics.reviews} reseñas</li>
      <li className={emphasize === "rating" ? "is-emphasis" : undefined}>⭐ {card.metrics.rating.toFixed(1)} promedio</li>
      {emphasize === "trending" ? <li className="is-emphasis">🔥 Tendencia · {card.metrics.recentActivity ?? 0}</li> : null}
    </ul>
  );
}

export function FeaturedExperiencesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "SUPER_ADMIN";
  const [criterion, setCriterion] = useState<FinderMode>("visits");
  const [ranking, setRanking] = useState<FeaturedExperienceCard[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [featured, setFeatured] = useState<FeaturedExperienceCard[]>([]);
  const [published, setPublished] = useState<Experience[]>([]);
  const [experienceId, setExperienceId] = useState("");
  const [order, setOrder] = useState("1");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadFeatured() {
    const cards = await getAdminFeaturedExperiences();
    setFeatured(cards);
    return cards;
  }

  useEffect(() => {
    let cancelled = false;
    loadFeatured()
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "No se pudieron cargar las experiencias destacadas"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (criterion === "editorial") {
      setRanking([]);
      return;
    }
    let cancelled = false;
    setRankingLoading(true);
    getFeaturedRanking(criterion)
      .then((items) => {
        if (!cancelled) {
          setRanking(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRanking([]);
          setError(getApiErrorMessage(err, "No se pudo cargar el ranking"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRankingLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [criterion]);

  useEffect(() => {
    if (criterion !== "editorial") {
      return;
    }
    let cancelled = false;
    getAdminExperiences({ status: "PUBLISHED" })
      .then((items) => {
        if (!cancelled) {
          setPublished(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "No se pudieron cargar las experiencias publicadas"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [criterion]);

  const editorialOptions = useMemo(() => {
    const taken = new Set(featured.map((item) => item.experience.id));
    return published.filter((item) => !taken.has(item.id));
  }, [featured, published]);

  async function featureWith(id: string, payload: { featuredOrder?: number | null; featuredFrom?: string | null; featuredUntil?: string | null }) {
    setSaving(true);
    setError("");
    try {
      await featureExperience(id, payload);
      await loadFeatured();
      if (criterion !== "editorial") {
        setRanking(await getFeaturedRanking(criterion));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo destacar la experiencia"));
    } finally {
      setSaving(false);
    }
  }

  async function onEditorialFeature(event: FormEvent) {
    event.preventDefault();
    if (!experienceId) {
      setError("Elige una experiencia publicada");
      return;
    }
    await featureWith(experienceId, {
      featuredOrder: Number(order),
      featuredFrom: toIso(from),
      featuredUntil: toIso(until),
    });
    setExperienceId("");
    setFrom("");
    setUntil("");
  }

  async function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= featured.length) {
      return;
    }
    const reordered = [...featured];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(next, 0, moved);
    setSaving(true);
    setError("");
    try {
      setFeatured(
        await reorderFeaturedExperiences(
          reordered.map((item, position) => ({ id: item.experience.id, featuredOrder: position + 1 })),
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar el orden"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSaving(true);
    setError("");
    try {
      await unfeatureExperience(id);
      await loadFeatured();
      if (criterion !== "editorial") {
        setRanking(await getFeaturedRanking(criterion));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo retirar la experiencia destacada"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="featured-admin">
      <header className="featured-admin__head">
        <p className="admin-pagehead__kicker">Catálogo</p>
        <h1 className="admin-pagehead__title">Experiencias destacadas</h1>
        <p className="admin-pagehead__meta">
          {canEdit
            ? "Encuentra experiencias por rendimiento y decide cuáles destacar."
            : "Consulta rankings y destacadas. Solo un super administrador puede modificarlas."}
        </p>
      </header>

      {error ? <p className="featured-admin__error">{error}</p> : null}

      <section className="featured-admin__finder" aria-labelledby="featured-finder-title">
        <h2 id="featured-finder-title">Encontrar experiencias para destacar</h2>
        <label>
          Buscar experiencias por
          <select value={criterion} onChange={(event) => setCriterion(event.target.value as FinderMode)}>
            {CRITERIA.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {criterion === "editorial" && canEdit ? (
          <form className="featured-admin__form" onSubmit={(event) => void onEditorialFeature(event)}>
            <label>
              Experiencia publicada
              <select value={experienceId} onChange={(event) => setExperienceId(event.target.value)}>
                <option value="">Selecciona una experiencia</option>
                {editorialOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Orden
              <input type="number" min={0} max={999} value={order} onChange={(event) => setOrder(event.target.value)} />
            </label>
            <label>
              Desde
              <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              Hasta
              <input type="datetime-local" value={until} onChange={(event) => setUntil(event.target.value)} />
            </label>
            <Button type="submit" disabled={saving || !editorialOptions.length}>
              Destacar
            </Button>
          </form>
        ) : null}

        {criterion === "editorial" && !canEdit ? (
          <p className="featured-admin__empty">La selección editorial está reservada al super administrador.</p>
        ) : null}

        {criterion !== "editorial" && rankingLoading ? <p className="featured-admin__empty">Buscando experiencias…</p> : null}
        {criterion !== "editorial" && !rankingLoading && ranking.length === 0 ? (
          <p className="featured-admin__empty">No hay experiencias publicadas para este criterio.</p>
        ) : null}

        {criterion !== "editorial" ? (
          <div className="featured-admin__grid">
            {ranking.map((card) => (
              <article key={card.experience.id} className="featured-admin__card">
                <img src={mediaUrl(card.imageUrl, 640)} alt="" />
                <div className="featured-admin__body">
                  <p className="featured-admin__category">{card.category.name}</p>
                  <h2>{card.experience.title}</h2>
                  <p className="featured-admin__place">{card.experience.location}</p>
                  <MetricList card={card} emphasize={criterion} />
                  <p className="featured-admin__score">
                    Puntaje de destacamiento
                    <span>{card.score.toFixed(1)} puntos</span>
                  </p>
                  {canEdit ? (
                    <Button
                      type="button"
                      disabled={saving || card.experience.isFeatured}
                      onClick={() =>
                        void featureWith(card.experience.id, {
                          featuredOrder: card.experience.featuredOrder ?? featured.length + 1,
                        })
                      }
                    >
                      {card.experience.isFeatured ? "Ya destacada" : "Destacar"}
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="featured-current-title">
        <h2 id="featured-current-title" className="featured-admin__section-title">
          Experiencias destacadas actualmente
        </h2>
        {loading ? <p className="featured-admin__empty">Cargando destacadas…</p> : null}
        {!loading && featured.length === 0 ? (
          <p className="featured-admin__empty">
            No hay experiencias destacadas. En explorar se mostrarán automáticamente las mejores por puntuación.
          </p>
        ) : null}
        <div className="featured-admin__grid">
          {featured.map((card, index) => (
            <article key={card.experience.id} className="featured-admin__card">
              <img src={mediaUrl(card.imageUrl, 640)} alt="" />
              <div className="featured-admin__body">
                <p className="featured-admin__category">{card.category.name}</p>
                <h2>
                  {index + 1}. {card.experience.title}
                </h2>
                <p className="featured-admin__why">
                  <Sparkles size={14} aria-hidden="true" />
                  {card.highlight.emoji} {card.highlight.label}
                </p>
                <p className="featured-admin__period">Orden: {card.experience.featuredOrder ?? "—"}</p>
                <p className="featured-admin__period">
                  Visible: {periodLabel(card.experience.featuredFrom, card.experience.featuredUntil)}
                </p>
                <MetricList card={card} />
                {canEdit ? (
                  <div className="featured-admin__actions">
                    <button type="button" onClick={() => void move(index, -1)} disabled={saving || index === 0} aria-label="Subir prioridad">
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(index, 1)}
                      disabled={saving || index === featured.length - 1}
                      aria-label="Bajar prioridad"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button type="button" onClick={() => void remove(card.experience.id)} disabled={saving}>
                      Retirar
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
