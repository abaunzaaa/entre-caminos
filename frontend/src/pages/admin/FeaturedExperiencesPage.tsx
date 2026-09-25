import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import {
  featureExperience,
  generateFeaturedExperiences,
  getAdminExperiences,
  getAdminFeaturedExperiences,
  getFeaturedRanking,
  getOwnExperiencePerformance,
  reorderFeaturedExperiences,
  unfeatureExperience,
  type FeaturedRankingCriterion,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import type { Experience, FeaturedExperienceCard } from "../../types";
import viewsIcon from "../../assets/icons/metrics/views.svg";
import favoritesIcon from "../../assets/icons/metrics/favorites.svg";
import reviewsIcon from "../../assets/icons/metrics/reviews.svg";
import ratingIcon from "../../assets/icons/metrics/rating.svg";
import trendingIcon from "../../assets/icons/metrics/trending.svg";
import "../../styles/admin-featured.css";

type HighlightMode = "metrics" | "editorial";

const CRITERIA: Array<{ value: FeaturedRankingCriterion; label: string }> = [
  { value: "visits", label: "Más visitadas" },
  { value: "favorites", label: "Más guardadas" },
  { value: "reviews", label: "Más reseñadas" },
  { value: "rating", label: "Mejor calificadas" },
  { value: "trending", label: "Mayor interacción reciente" },
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

function MetricIcon({ src }: { src: string }) {
  return <img className="metric-icon" src={src} alt="" />;
}

function MetricList({ card, emphasize }: { card: FeaturedExperienceCard; emphasize?: FeaturedRankingCriterion }) {
  return (
    <ul className="featured-admin__metrics">
      <li className={emphasize === "visits" ? "is-emphasis" : undefined}>
        <MetricIcon src={viewsIcon} />
        {card.metrics.visits} visitas
      </li>
      <li className={emphasize === "favorites" ? "is-emphasis" : undefined}>
        <MetricIcon src={favoritesIcon} />
        {card.metrics.favorites} favoritos
      </li>
      <li className={emphasize === "reviews" ? "is-emphasis" : undefined}>
        <MetricIcon src={reviewsIcon} />
        {card.metrics.reviews} reseñas
      </li>
      <li className={emphasize === "rating" ? "is-emphasis" : undefined}>
        <MetricIcon src={ratingIcon} />
        {card.metrics.rating.toFixed(1)} promedio
      </li>
      {emphasize === "trending" ? (
        <li className="is-emphasis">
          <MetricIcon src={trendingIcon} />
          Tendencia · {card.metrics.recentActivity ?? 0}
        </li>
      ) : null}
    </ul>
  );
}

export function FeaturedExperiencesPage() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") {
    return <AdminOwnPerformance />;
  }
  return <SuperAdminFeaturedPage />;
}

function AdminOwnPerformance() {
  const [criterion, setCriterion] = useState<FeaturedRankingCriterion>("visits");
  const [items, setItems] = useState<FeaturedExperienceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOwnExperiencePerformance(criterion)
      .then((cards) => {
        if (!cancelled) {
          setItems(cards);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setError(getApiErrorMessage(err, "No se pudo cargar el rendimiento de tus experiencias"));
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
  }, [criterion]);

  return (
    <section className="featured-admin">
      <header className="featured-admin__head">
        <p className="admin-pagehead__kicker">Catálogo</p>
        <h1 className="admin-pagehead__title">Rendimiento de tus experiencias</h1>
        <p className="admin-pagehead__meta">Solo ves las experiencias publicadas que tú creaste.</p>
      </header>
      {error ? <p className="featured-admin__error">{error}</p> : null}
      <section className="featured-admin__finder">
        <label>
          Ordenar por
          <select value={criterion} onChange={(event) => setCriterion(event.target.value as FeaturedRankingCriterion)}>
            {CRITERIA.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {loading ? <p className="featured-admin__empty">Cargando tus experiencias…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="featured-admin__empty">Todavía no tienes experiencias publicadas.</p>
        ) : null}
        <div className="featured-admin__grid">
          {items.map((card) => (
            <article key={card.experience.id} className="featured-admin__card">
              <img src={mediaUrl(card.imageUrl, 640)} alt="" />
              <div className="featured-admin__body">
                <p className="featured-admin__category">{card.category.name}</p>
                <h2>{card.experience.title}</h2>
                <ul className="featured-admin__metrics">
                  <li className={criterion === "visits" ? "is-emphasis" : undefined}>
                    <MetricIcon src={viewsIcon} />
                    {card.metrics.visits} visitas
                  </li>
                  <li className={criterion === "favorites" ? "is-emphasis" : undefined}>
                    <MetricIcon src={favoritesIcon} />
                    {card.metrics.favorites} guardados
                  </li>
                  <li className={criterion === "reviews" ? "is-emphasis" : undefined}>
                    <MetricIcon src={reviewsIcon} />
                    {card.metrics.reviews} reseñas
                  </li>
                  <li className={criterion === "rating" ? "is-emphasis" : undefined}>
                    <MetricIcon src={ratingIcon} />
                    {card.metrics.rating.toFixed(1)} promedio
                  </li>
                  <li className={criterion === "trending" ? "is-emphasis" : undefined}>
                    <MetricIcon src={trendingIcon} />
                    {card.metrics.recentActivity ?? 0} interacción reciente
                  </li>
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function SuperAdminFeaturedPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "SUPER_ADMIN";
  const [mode, setMode] = useState<HighlightMode>("metrics");
  const [criterion, setCriterion] = useState<FeaturedRankingCriterion>("visits");
  const [count, setCount] = useState("10");
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
    if (mode !== "metrics") {
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
  }, [criterion, mode]);

  useEffect(() => {
    if (mode !== "editorial") {
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
  }, [mode]);

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
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo destacar la experiencia"));
    } finally {
      setSaving(false);
    }
  }

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    const limit = Number(count);
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
      setError("La cantidad debe estar entre 1 y 10");
      return;
    }
    setSaving(true);
    setError("");
    try {
      setFeatured(await generateFeaturedExperiences(criterion, limit));
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron generar las destacadas"));
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
            ? "Genera el carrusel por métricas o arma una selección editorial."
            : "Consulta rankings y destacadas. Solo un super administrador puede modificarlas."}
        </p>
      </header>

      {error ? <p className="featured-admin__error">{error}</p> : null}

      <section className="featured-admin__finder" aria-labelledby="featured-finder-title">
        <h2 id="featured-finder-title">Modo de destacado</h2>
        <label>
          Modo de destacado
          <select value={mode} onChange={(event) => setMode(event.target.value as HighlightMode)}>
            <option value="metrics">Por métricas</option>
            <option value="editorial">Selección editorial</option>
          </select>
        </label>

        {mode === "metrics" ? (
          <form className="featured-admin__form featured-admin__form--metrics" onSubmit={(event) => void onGenerate(event)}>
            <label>
              Criterio
              <select value={criterion} onChange={(event) => setCriterion(event.target.value as FeaturedRankingCriterion)}>
                {CRITERIA.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cantidad
              <input type="number" min={1} max={10} value={count} onChange={(event) => setCount(event.target.value)} />
            </label>
            {canEdit ? (
              <Button type="submit" disabled={saving || rankingLoading || ranking.length === 0}>
                Generar destacadas
              </Button>
            ) : (
              <p className="featured-admin__empty">Solo un super administrador puede generar destacadas.</p>
            )}
          </form>
        ) : null}

        {mode === "editorial" && canEdit ? (
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

        {mode === "editorial" && !canEdit ? (
          <p className="featured-admin__empty">La selección editorial está reservada al super administrador.</p>
        ) : null}

        {mode === "metrics" && rankingLoading ? <p className="featured-admin__empty">Buscando experiencias…</p> : null}
        {mode === "metrics" && !rankingLoading && ranking.length === 0 ? (
          <p className="featured-admin__empty">No hay experiencias publicadas para este criterio.</p>
        ) : null}

        {mode === "metrics" && ranking.length > 0 ? (
          <div className="featured-admin__grid">
            {ranking.slice(0, Number(count) || 10).map((card, index) => (
              <article key={card.experience.id} className="featured-admin__card">
                <img src={mediaUrl(card.imageUrl, 640)} alt="" />
                <div className="featured-admin__body">
                  <p className="featured-admin__category">{card.category.name}</p>
                  <h2>
                    {index + 1}. {card.experience.title}
                  </h2>
                  <p className="featured-admin__place">{card.experience.location}</p>
                  <MetricList card={card} emphasize={criterion} />
                  <p className="featured-admin__score">
                    Puntaje de destacamiento
                    <span>{card.score.toFixed(1)} puntos</span>
                  </p>
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
            No hay experiencias destacadas en el carrusel.
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
                <p className="featured-admin__period">Orden: {card.experience.featuredOrder ?? "—"}</p>
                <p className="featured-admin__period">
                  Visible: {periodLabel(card.experience.featuredFrom, card.experience.featuredUntil)}
                </p>
                <MetricList card={card} />
                {canEdit && mode === "editorial" ? (
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
