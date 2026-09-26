import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { FeaturedMenuSelect } from "../../components/admin/FeaturedFieldControls";
import { AuthKeyIcon } from "../../components/auth/AuthKeyIcon";
import { SuccessConfirmDialog } from "../../components/ui/SuccessConfirmDialog";
import { Button } from "../../components/ui/Button";
import {
  featureExperience,
  generateFeaturedExperiences,
  getAdminExperiences,
  getAdminFeaturedExperiences,
  getFeaturedRanking,
  getOwnExperiencePerformance,
  getPublicCategories,
  reorderFeaturedExperiences,
  unfeatureExperience,
  type FeaturedRankingCriterion,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import type { Experience, FeaturedExperienceCard } from "../../types";
import featuredHeader from "../../assets/images/admin/featured-experiences-header.png";
import viewsIcon from "../../assets/icons/metrics/views.svg";
import favoritesIcon from "../../assets/icons/metrics/favorites.svg";
import reviewsIcon from "../../assets/icons/metrics/reviews.svg";
import ratingIcon from "../../assets/icons/metrics/rating.svg";
import trendingIcon from "../../assets/icons/metrics/trending.svg";
import "../../styles/admin-featured.css";
import "../../styles/auth-recovery-modal.css";

type HighlightMode = "metrics" | "editorial";

const CRITERIA: Array<{ value: FeaturedRankingCriterion; label: string }> = [
  { value: "visits", label: "Más visitadas" },
  { value: "favorites", label: "Más guardadas" },
  { value: "reviews", label: "Más reseñadas" },
  { value: "rating", label: "Mejor calificadas" },
  { value: "trending", label: "Mayor interacción reciente" },
];

function FeaturedPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <article className="dash-profile">
      <div className="dash-profile__top">
        <div className="dash-profile__identity">
          <h1 className="dash-profile__name">{title}</h1>
          <p className="dash-profile__row">
            <span>{description}</span>
          </p>
        </div>
      </div>
      <div className="dash-access-hero" aria-hidden="true">
        <div className="dash-profile__stat dash-access-hero__frame">
          <img src={featuredHeader} alt="" className="dash-profile__stat-art dash-access-hero__art dash-float-art featured-header__art" />
        </div>
      </div>
    </article>
  );
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
    <div className="dash dash--exps">
      <FeaturedPageHeader
        title="Rendimiento de tus experiencias"
        description="Solo ves las experiencias publicadas que tú creaste."
      />
    <section className="featured-admin">
      {error ? <p className="featured-admin__error">{error}</p> : null}
      <section className="featured-admin__finder">
        <FeaturedMenuSelect
          label="Ordenar por"
          value={criterion}
          options={CRITERIA}
          onChange={(next) => setCriterion(next as FeaturedRankingCriterion)}
        />
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
    </div>
  );
}

function SuperAdminFeaturedPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "SUPER_ADMIN";
  const [mode, setMode] = useState<HighlightMode>("metrics");
  const [criterion, setCriterion] = useState<FeaturedRankingCriterion>("visits");
  const [count, setCount] = useState("5");
  const [ranking, setRanking] = useState<FeaturedExperienceCard[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [featured, setFeatured] = useState<FeaturedExperienceCard[]>([]);
  const [published, setPublished] = useState<Experience[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);
  const [editorialIds, setEditorialIds] = useState<string[]>([]);
  const [limitOpen, setLimitOpen] = useState(false);
  const [featuredSaved, setFeaturedSaved] = useState(false);
  const [editorialQuery, setEditorialQuery] = useState("");
  const [editorialCategory, setEditorialCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [rankingPage, setRankingPage] = useState(1);

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
    Promise.all([getAdminExperiences({ status: "PUBLISHED" }), getPublicCategories()])
      .then(([items, categories]) => {
        if (cancelled) {
          return;
        }
        setPublished(items);
        setCatalogCategories(categories.map((category) => category.name.trim()).filter(Boolean));
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

  const pageSize = 8;
  const rankingPageCount = Math.max(1, Math.ceil(ranking.length / pageSize));
  const rankingCurrentPage = Math.min(rankingPage, rankingPageCount);
  const rankingStart = (rankingCurrentPage - 1) * pageSize;
  const visibleRanking = ranking.slice(rankingStart, rankingStart + pageSize);

  const pageCount = Math.max(1, Math.ceil(featured.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleFeatured = featured.slice(pageStart, pageStart + pageSize);

  const editorialOptions = published;

  const editorialCategories = useMemo(() => {
    const names = new Set(catalogCategories);
    for (const item of published) {
      const name = item.category?.name?.trim();
      if (name) {
        names.add(name);
      }
    }
    return [...names].sort((left, right) => left.localeCompare(right, "es"));
  }, [catalogCategories, published]);

  const visibleEditorial = useMemo(() => {
    const query = editorialQuery.trim().toLowerCase();
    return editorialOptions.filter((item) => {
      if (editorialCategory && item.category?.name !== editorialCategory) {
        return false;
      }
      if (!query) {
        return true;
      }
      return item.title.toLowerCase().includes(query);
    });
  }, [editorialCategory, editorialOptions, editorialQuery]);

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    const limit = Number(count);
    if (!Number.isInteger(limit) || limit < 1 || limit > 5) {
      setError("La cantidad debe estar entre 1 y 5");
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

  function toggleEditorial(id: string) {
    setEditorialIds((current) => {
      const index = current.indexOf(id);
      if (index >= 0) {
        return current.filter((item) => item !== id);
      }
      if (current.length >= 5) {
        setLimitOpen(true);
        return current;
      }
      setError("");
      return [...current, id];
    });
  }

  async function onEditorialFeature(event: FormEvent) {
    event.preventDefault();
    if (editorialIds.length === 0) {
      setError("Elige al menos una experiencia publicada");
      return;
    }
    setSaving(true);
    setError("");
    try {
      for (const [index, id] of editorialIds.entries()) {
        await featureExperience(id, { featuredOrder: index + 1, featuredFrom: null, featuredUntil: null });
      }
      const selected = new Set(editorialIds);
      for (const card of featured) {
        if (!selected.has(card.experience.id)) {
          await unfeatureExperience(card.experience.id);
        }
      }
      setFeatured(await getAdminFeaturedExperiences());
      setEditorialIds([]);
      setFeaturedSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo destacar la experiencia"));
    } finally {
      setSaving(false);
    }
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
    <div className="dash dash--exps">
      <FeaturedPageHeader
        title="Experiencias destacadas"
        description="Selecciona y gestiona las experiencias destacadas mediante métricas o curaduría editorial."
      />
    <section className="featured-admin">

      {error ? <p className="featured-admin__error">{error}</p> : null}
      <SuccessConfirmDialog
        open={limitOpen}
        className="contact-success--subtle"
        icon={<AuthKeyIcon className="auth-reset-success__mark" />}
        title="Máximo de experiencias alcanzado"
        description="Solo puedes seleccionar hasta 5 experiencias destacadas."
        actionLabel="Entendido"
        initialFocus="action"
        onClose={() => setLimitOpen(false)}
      />
      <SuccessConfirmDialog
        open={featuredSaved}
        className="contact-success--subtle"
        icon={<AuthKeyIcon className="auth-reset-success__mark" />}
        title="Experiencias destacadas exitosamente"
        description="Las experiencias seleccionadas ahora hacen parte de las experiencias destacadas."
        actionLabel="Aceptar"
        initialFocus="action"
        onClose={() => setFeaturedSaved(false)}
      />

      <section className="featured-admin__finder" aria-labelledby="featured-finder-title">
        <h2 id="featured-finder-title">Modo de destacado</h2>
        <FeaturedMenuSelect
          label="Modo de destacado"
          value={mode}
          options={[
            { value: "metrics", label: "Por métricas" },
            { value: "editorial", label: "Selección editorial" },
          ]}
          onChange={(next) => setMode(next as HighlightMode)}
        />

        {mode === "metrics" ? (
          <form className="featured-admin__form featured-admin__form--metrics" onSubmit={(event) => void onGenerate(event)}>
            <FeaturedMenuSelect
              label="Criterio"
              value={criterion}
              options={CRITERIA}
              onChange={(next) => {
                setCriterion(next as FeaturedRankingCriterion);
                setRankingPage(1);
              }}
            />
            <label>
              Cantidad
              <input type="number" min={1} max={5} value={count} onChange={(event) => setCount(event.target.value)} />
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
          <form className="featured-admin__form featured-admin__form--editorial" onSubmit={(event) => void onEditorialFeature(event)}>
            <div className="featured-admin__filters">
              <label>
                Buscar por nombre
                <input
                  type="search"
                  value={editorialQuery}
                  placeholder="Nombre de la experiencia"
                  onChange={(event) => setEditorialQuery(event.target.value)}
                />
              </label>
              <FeaturedMenuSelect
                label="Categoría"
                value={editorialCategory}
                options={[
                  { value: "", label: "Todas las categorías" },
                  ...editorialCategories.map((name) => ({ value: name, label: name })),
                ]}
                onChange={setEditorialCategory}
              />
            </div>
            <div className="featured-admin__picker" role="listbox" aria-multiselectable="true" aria-label="Experiencias publicadas">
              {visibleEditorial.length === 0 ? (
                <p className="featured-admin__empty">No hay experiencias publicadas con ese filtro.</p>
              ) : (
                visibleEditorial.map((item) => {
                  const place = item.location?.trim() || "Sin ubicación";
                  const selectedIndex = editorialIds.indexOf(item.id);
                  const selected = selectedIndex >= 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`featured-admin__pick${selected ? " is-selected" : ""}`}
                      onClick={() => toggleEditorial(item.id)}
                    >
                      <img src={mediaUrl(item.imageUrl, 320)} alt="" />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.category?.name || "Sin categoría"}</small>
                        <small>{place}</small>
                      </span>
                      {selected ? <span className="featured-admin__pick-order">{selectedIndex + 1}</span> : null}
                    </button>
                  );
                })
              )}
            </div>
            <Button type="submit" className="featured-admin__submit" disabled={saving || editorialIds.length === 0}>
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
          <>
          <div className="featured-admin__grid">
            {visibleRanking.map((card) => (
              <article key={card.experience.id} className="featured-admin__card">
                <img src={mediaUrl(card.imageUrl, 640)} alt="" />
                <div className="featured-admin__body">
                  <p className="featured-admin__category">{card.category.name}</p>
                  <h2>
                    {card.experience.title}
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
          <div className="featured-admin__pager">
            <button type="button" onClick={() => setRankingPage(rankingCurrentPage - 1)} disabled={rankingCurrentPage <= 1}>
              Anterior
            </button>
            <span>Página {rankingCurrentPage}</span>
            <button
              type="button"
              onClick={() => setRankingPage(rankingCurrentPage + 1)}
              disabled={rankingCurrentPage >= rankingPageCount}
            >
              Siguiente
            </button>
          </div>
          </>
        ) : null}
      </section>

      <section className="featured-admin__current" aria-labelledby="featured-current-title">
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
          {visibleFeatured.map((card, index) => {
            const position = pageStart + index;
            return (
            <article key={card.experience.id} className="featured-admin__card">
              <img src={mediaUrl(card.imageUrl, 640)} alt="" />
              <div className="featured-admin__body">
                <p className="featured-admin__category">{card.category.name}</p>
                <h2>
                  {card.experience.title}
                </h2>
                <p className="featured-admin__period">Orden: {card.experience.featuredOrder ?? "—"}</p>
                <MetricList card={card} />
                {canEdit && mode === "editorial" ? (
                  <div className="featured-admin__actions">
                    <button type="button" onClick={() => void move(position, -1)} disabled={saving || position === 0} aria-label="Subir prioridad">
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(position, 1)}
                      disabled={saving || position === featured.length - 1}
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
            );
          })}
        </div>
        {featured.length > 0 ? (
          <div className="featured-admin__pager">
            <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>
              Anterior
            </button>
            <span>Página {currentPage}</span>
            <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount}>
              Siguiente
            </button>
          </div>
        ) : null}
      </section>
    </section>
    </div>
  );
}
