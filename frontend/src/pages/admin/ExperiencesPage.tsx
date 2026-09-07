import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, Clock, Compass, Plus, Search } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ExperienceCatalogCard } from "../../components/admin/ExperienceCatalogCard";
import { Panel } from "../../components/admin/Panel";
import { useAuth } from "../../hooks/useAuth";
import {
  changeExperienceStatus,
  deleteExperience,
  getAdminCategories,
  getAdminExperiences,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { experienceImages, mediaUrl } from "../../utils/media";
import type { Category, Experience, ExperienceStatus } from "../../types";
import crearExp from "../../assets/crear-exp.png";
import expeIlus from "../../assets/expe-agregadas.png";
import sinRevisar from "../../assets/sinrevisar.png";
import sinRevisar2 from "../../assets/sinrevisar2.png";
import superadmIlus2 from "../../assets/superadm-ilus2.png";
import "../../styles/admin-access.css";

type FilterMenuOption<T extends string> = { value: T; label: string };

function FilterMenu<T extends string>({
  label,
  active,
  open,
  options,
  onToggle,
  onSelect,
}: {
  label: string;
  active: boolean;
  open: boolean;
  options: FilterMenuOption<T>[];
  onToggle: () => void;
  onSelect: (value: T) => void;
}) {
  return (
    <div className={`dash-team-filters__menuwrap${active || open ? " is-active" : ""}`}>
      <button
        type="button"
        className="dash-team-filters__chip dash-team-filters__trigger"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{label}</span>
        <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div className={`dash-team-filters__menu${open ? " is-open" : ""}`} role="listbox">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="dash-team-filters__option"
            role="option"
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SUMMARY_PREVIEW_LIMIT = 3;

function SummaryPreviewCard({ experience, meta }: { experience: Experience; meta: string }) {
  const photo = mediaUrl(experienceImages(experience)[0] ?? null);
  return (
    <Link
      to={`/admin/experiencias/${experience.id}/ver`}
      className="dash-team-card"
      aria-label={`${experience.title}. ${meta}`}
    >
      <span className="dash-team-card__avatar">
        <img src={photo} alt="" />
      </span>
      <div className="dash-team-card__info">
        <h3>{experience.title}</h3>
        <p>{meta}</p>
      </div>
    </Link>
  );
}

export function ExperiencesPage() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission("experiences.review");
  const [searchParams, setSearchParams] = useSearchParams();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [pendingPreview, setPendingPreview] = useState<Experience[]>([]);
  const [publishedPreview, setPublishedPreview] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "pending">(
    searchParams.get("vista") === "pendientes" && canReview ? "pending" : "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<"category" | "sort" | string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Experience | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<Experience | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState("");
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  async function refreshSummaryPreviews() {
    const [pending, published] = await Promise.all([
      getAdminExperiences({ status: "PENDING", limit: SUMMARY_PREVIEW_LIMIT }),
      getAdminExperiences({ status: "PUBLISHED", limit: SUMMARY_PREVIEW_LIMIT }),
    ]);
    setPendingPreview(pending);
    setPublishedPreview(published);
  }

  async function load() {
    const [nextExperiences, nextCategories, nextPendingPreview, nextPublishedPreview] = await Promise.all([
      getAdminExperiences(),
      getAdminCategories().catch(() => [] as Category[]),
      getAdminExperiences({ status: "PENDING", limit: SUMMARY_PREVIEW_LIMIT }),
      getAdminExperiences({ status: "PUBLISHED", limit: SUMMARY_PREVIEW_LIMIT }),
    ]);
    setExperiences(nextExperiences);
    setCategories(nextCategories);
    setPendingPreview(nextPendingPreview);
    setPublishedPreview(nextPublishedPreview);
  }

  useEffect(() => {
    load().catch((err) => setError(getApiErrorMessage(err, "No se pudieron cargar las experiencias")));
  }, []);

  useEffect(() => {
    if (searchParams.get("vista") === "pendientes" && canReview) {
      setStatusFilter("pending");
      return;
    }
    if (searchParams.get("vista") === "pendientes" && !canReview) {
      setStatusFilter("all");
      setSearchParams({}, { replace: true });
    }
  }, [canReview, searchParams, setSearchParams]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (filtersRef.current?.contains(target) || target.closest("[data-exp-status]")) {
        return;
      }
      setOpenMenu(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!pendingDelete && !pendingDeactivate) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting && !statusBusyId) {
        setPendingDelete(null);
        setPendingDeactivate(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingDelete, pendingDeactivate, deleting, statusBusyId]);

  async function applyStatusChange(experience: Experience, status: ExperienceStatus) {
    setError("");
    setOpenMenu(null);
    try {
      setStatusBusyId(experience.id);
      const updated = await changeExperienceStatus(experience.id, status);
      setExperiences((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setToast({
        tone: "success",
        text:
          status === "ARCHIVED"
            ? "Experiencia desactivada. Ya no aparece en el catálogo público."
            : "Experiencia activada. Ya está visible en el catálogo público.",
      });
      setPendingDeactivate(null);
      await refreshSummaryPreviews().catch(() => undefined);
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudo actualizar el estado.");
      setError(message);
      setToast({ tone: "error", text: message });
    } finally {
      setStatusBusyId("");
    }
  }

  function onChangeStatus(experience: Experience, status: ExperienceStatus) {
    setOpenMenu(null);
    if (status === experience.status) {
      return;
    }
    if (status === "ARCHIVED") {
      setPendingDeactivate(experience);
      return;
    }
    void applyStatusChange(experience, status);
  }

  async function confirmDeactivate() {
    if (!pendingDeactivate) {
      return;
    }
    await applyStatusChange(pendingDeactivate, "ARCHIVED");
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setError("");
    try {
      setDeleting(true);
      await deleteExperience(pendingDelete.id);
      setExperiences((current) => current.filter((item) => item.id !== pendingDelete.id));
      setPendingDelete(null);
      await refreshSummaryPreviews().catch(() => undefined);
      setToast({ tone: "success", text: "Experiencia eliminada." });
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudo eliminar");
      setError(message);
      setToast({ tone: "error", text: message });
    } finally {
      setDeleting(false);
    }
  }

  function scrollToCatalog() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("experiencias-catalogo")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  const visibleExperiences = useMemo(() => {
    const term = query.trim().toLowerCase();
    const next = experiences.filter((experience) => {
      if (statusFilter === "active" && experience.status !== "PUBLISHED") {
        return false;
      }
      if (statusFilter === "inactive" && experience.status !== "ARCHIVED") {
        return false;
      }
      if (statusFilter === "pending" && experience.status !== "PENDING") {
        return false;
      }
      if (categoryFilter && experience.categoryId !== categoryFilter) {
        return false;
      }
      if (term && !experience.title.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
    return [...next].sort((left, right) => {
      const leftTime = new Date(left.submittedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.submittedAt || right.createdAt || 0).getTime();
      return dateSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [categoryFilter, dateSort, experiences, query, statusFilter]);

  const selectedCategoryName = categories.find((item) => item.id === categoryFilter)?.name;

  return (
    <div className="dash dash--exps">
      {toast ? (
        <p className={`dash-team-toast${toast.tone === "error" ? " is-error" : ""}`} role="status">
          {toast.text}
        </p>
      ) : null}

      <article className="dash-profile">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">Experiencias</h1>
            <p className="dash-profile__row">
              <span>Gestiona los planes y actividades que hacen parte del catálogo de Entre Caminos.</span>
            </p>
          </div>
        </div>
        <div className="dash-access-hero" aria-hidden="true">
          <div className="dash-profile__stat dash-access-hero__frame">
            <img src={superadmIlus2} alt="" className="dash-profile__stat-art dash-access-hero__art dash-float-art" />
          </div>
        </div>
      </article>

      <section className="admin-kpi-grid dash-exps-summary" aria-label="Resumen de experiencias">
        <article className={`admin-kpi-card dash-exps-summary__pending${pendingPreview.length ? "" : " is-empty"}`}>
          {pendingPreview.length ? (
            <>
              <div className="dash-exps-pending-empty__head">
                <span className="dash-kpi__icon" aria-hidden="true">
                  <Clock size={18} strokeWidth={1.7} />
                </span>
                <div className="dash-exps-pending-empty__copy">
                  <p className="admin-kpi-card__label">Pendientes de revisión</p>
                  <p className="dash-exps-summary__lead">Últimas en revisión</p>
                </div>
              </div>
              <div className="dash-exps-summary__preview" aria-label="Últimas experiencias pendientes de revisión">
                {pendingPreview.map((experience) => (
                  <SummaryPreviewCard key={experience.id} experience={experience} meta="En revisión" />
                ))}
              </div>
              <div className="dash-exps-summary__action dash-exps-pending-empty__action">
                {canReview ? (
                  <Link
                    to="/admin/experiencias?vista=pendientes"
                    className="dash-section__glass"
                    onClick={() => {
                      window.setTimeout(scrollToCatalog, 40);
                    }}
                  >
                    Gestionar
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="dash-exps-pending-empty__head">
                <span className="dash-kpi__icon" aria-hidden="true">
                  <Clock size={18} strokeWidth={1.7} />
                </span>
                <div className="dash-exps-pending-empty__copy">
                  <p className="admin-kpi-card__label">Pendientes de revisión</p>
                  <p className="dash-exps-summary__lead">Últimas en revisión</p>
                </div>
              </div>
              <div className="dash-exps-pending-empty__body">
                <div className="dash-exps-pending-empty__visual">
                  <img src={sinRevisar} alt="" />
                </div>
                <p className="dash-exps-pending-empty__msg">No hay experiencias pendientes de revisión.</p>
              </div>
              <div className="dash-exps-summary__action dash-exps-pending-empty__action">
                {canReview ? (
                  <Link
                    to="/admin/experiencias?vista=pendientes"
                    className="dash-section__glass"
                    onClick={() => {
                      window.setTimeout(scrollToCatalog, 40);
                    }}
                  >
                    Gestionar
                  </Link>
                ) : null}
              </div>
            </>
          )}
        </article>

        <article className="admin-kpi-card dash-exps-summary__visual" aria-label="Crear experiencia">
          <img src={crearExp} alt="" className="dash-exps-summary__visual-img" />
          <div className="dash-exps-summary__visual-info">
            <Link
              to="/admin/experiencias/nueva"
              className="dash-section__glass dash-exps-summary__visual-add"
              aria-label="Añadir experiencia"
            >
              <Plus size={18} strokeWidth={1.7} aria-hidden="true" />
            </Link>
            <div className="dash-exps-summary__visual-info-copy">
              <p className="admin-kpi-card__label">Crear experiencia</p>
              <p className="dash-exps-summary__lead">Añade un nuevo plan al catálogo.</p>
            </div>
          </div>
        </article>

        <article className={`admin-kpi-card dash-exps-summary__published${publishedPreview.length ? "" : " is-empty"}`}>
          {publishedPreview.length ? (
            <>
              <div className="dash-exps-pending-empty__head">
                <span className="dash-kpi__icon" aria-hidden="true">
                  <Compass size={18} strokeWidth={1.7} />
                </span>
                <div className="dash-exps-pending-empty__copy">
                  <p className="admin-kpi-card__label">Publicadas</p>
                  <p className="dash-exps-summary__lead">Últimas publicadas</p>
                </div>
              </div>
              <div className="dash-exps-summary__preview" aria-label="Últimas experiencias publicadas">
                {publishedPreview.map((experience) => (
                  <SummaryPreviewCard key={experience.id} experience={experience} meta="Publicada" />
                ))}
              </div>
              <div className="dash-exps-summary__action dash-exps-pending-empty__action">
                <button
                  type="button"
                  className="dash-section__glass"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchParams({}, { replace: true });
                    window.setTimeout(scrollToCatalog, 40);
                  }}
                >
                  Ver catálogo
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="dash-exps-pending-empty__head">
                <span className="dash-kpi__icon" aria-hidden="true">
                  <Compass size={18} strokeWidth={1.7} />
                </span>
                <div className="dash-exps-pending-empty__copy">
                  <p className="admin-kpi-card__label">Publicadas</p>
                  <p className="dash-exps-summary__lead">Últimas publicadas</p>
                </div>
              </div>
              <div className="dash-exps-pending-empty__body">
                <div className="dash-exps-pending-empty__visual">
                  <img src={sinRevisar2} alt="" />
                </div>
                <p className="dash-exps-pending-empty__msg">No hay experiencias publicadas.</p>
              </div>
              <div className="dash-exps-summary__action dash-exps-pending-empty__action">
                <button
                  type="button"
                  className="dash-section__glass"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchParams({}, { replace: true });
                    window.setTimeout(scrollToCatalog, 40);
                  }}
                >
                  Ver catálogo
                </button>
              </div>
            </>
          )}
        </article>
      </section>

      <section className="dash-team-board" aria-label="Gestión de experiencias">
        <section id="experiencias-catalogo" className="dash-split__panel" aria-label="Experiencias registradas">
          <div>
            <h2 className="dash-section__title">Experiencias registradas</h2>
            <p className="dash-section__lead">Consulta, edita y envía a revisión las experiencias del catálogo.</p>
          </div>
          <div className="dash-team-filters" role="toolbar" aria-label="Filtros de experiencias" ref={filtersRef}>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "all" ? " is-active" : ""}`}
              onClick={() => {
                setStatusFilter("all");
                setSearchParams({}, { replace: true });
              }}
            >
              Ver todas
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "active" ? " is-active" : ""}`}
              onClick={() => {
                setStatusFilter("active");
                setSearchParams({}, { replace: true });
              }}
            >
              Activas
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "inactive" ? " is-active" : ""}`}
              onClick={() => {
                setStatusFilter("inactive");
                setSearchParams({}, { replace: true });
              }}
            >
              Inactivas
            </button>
            {canReview ? (
              <button
                type="button"
                className={`dash-team-filters__chip${statusFilter === "pending" ? " is-active" : ""}`}
                onClick={() => {
                  setStatusFilter("pending");
                  setSearchParams({ vista: "pendientes" }, { replace: true });
                }}
              >
                Pendientes de revisión
              </button>
            ) : null}
            <FilterMenu
              label={selectedCategoryName || "Categoría"}
              active={Boolean(categoryFilter) || openMenu === "category"}
              open={openMenu === "category"}
              options={[
                { value: "", label: "Todas las categorías" },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
              onToggle={() => setOpenMenu((current) => (current === "category" ? null : "category"))}
              onSelect={(value) => {
                setCategoryFilter(value);
                setOpenMenu(null);
              }}
            />
            <FilterMenu
              label={dateSort === "oldest" ? "Más antiguas" : "Más recientes"}
              active={dateSort === "oldest" || openMenu === "sort"}
              open={openMenu === "sort"}
              options={[
                { value: "newest", label: "Más recientes" },
                { value: "oldest", label: "Más antiguas" },
              ]}
              onToggle={() => setOpenMenu((current) => (current === "sort" ? null : "sort"))}
              onSelect={(value) => {
                setDateSort(value as "newest" | "oldest");
                setOpenMenu(null);
              }}
            />
            <div className="dash-team-filters__search">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre"
              />
              <button
                type="button"
                className="dash-team-filters__search-btn"
                aria-label="Buscar por nombre"
                onClick={() => searchRef.current?.focus()}
              >
                <Search size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {experiences.length === 0 ? (
            <Panel className="dash-empty dash-exps-empty">
              <img src={expeIlus} alt="" className="dash-exps-empty__art dash-float-art" />
              <p className="dash-exps-empty__title">Aún no tienes experiencias creadas</p>
              <p className="dash-section__lead">
                Crea la primera experiencia para comenzar a construir el catálogo de Entre Caminos.
              </p>
              <Link to="/admin/experiencias/nueva" className="admin-cta mt-4">
                Crear experiencia
              </Link>
            </Panel>
          ) : visibleExperiences.length === 0 ? (
            <Panel className="dash-empty">
              <p>
                {statusFilter === "pending"
                  ? "No hay experiencias pendientes de revisión."
                  : "No hay coincidencias con estos filtros."}
              </p>
            </Panel>
          ) : (
            <div className="dash-exps-catalog">
              {visibleExperiences.map((experience) => {
                const statusMenu = `status-${experience.id}`;
                return (
                  <ExperienceCatalogCard
                    key={experience.id}
                    experience={experience}
                    statusOpen={openMenu === statusMenu}
                    statusBusy={statusBusyId === experience.id}
                    canReview={canReview}
                    onToggleStatus={() => setOpenMenu((current) => (current === statusMenu ? null : statusMenu))}
                    onChangeStatus={(status) => void onChangeStatus(experience, status)}
                    onDelete={() => setPendingDelete(experience)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </section>

      {pendingDeactivate ? (
        <div
          className="dash-team-confirm"
          role="presentation"
          onClick={() => {
            if (!statusBusyId) {
              setPendingDeactivate(null);
            }
          }}
        >
          <div
            className="dash-team-confirm__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exp-deactivate-title"
            aria-describedby="exp-deactivate-copy"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="exp-deactivate-title" className="dash-team-confirm__title">
              ¿Seguro que quieres desactivar esta experiencia?
            </h2>
            <p id="exp-deactivate-copy" className="dash-team-confirm__lead">
              Al desactivarla, dejará de estar visible en el catálogo público de Entre Caminos.
            </p>
            <div className="dash-team-confirm__actions">
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(statusBusyId)}
                onClick={() => setPendingDeactivate(null)}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={Boolean(statusBusyId)} onClick={() => void confirmDeactivate()}>
                {statusBusyId ? "Desactivando..." : "Desactivar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="dash-team-confirm"
          role="presentation"
          onClick={() => {
            if (!deleting) {
              setPendingDelete(null);
            }
          }}
        >
          <div
            className="dash-team-confirm__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exp-delete-title"
            aria-describedby="exp-delete-copy"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="exp-delete-title" className="dash-team-confirm__title">
              ¿Estás seguro de eliminar esta experiencia?
            </h2>
            <p id="exp-delete-copy" className="dash-team-confirm__lead">
              Esta acción quita la experiencia del catálogo y no se puede deshacer.
            </p>
            <div className="dash-team-confirm__actions">
              <Button type="button" variant="secondary" disabled={deleting} onClick={() => setPendingDelete(null)}>
                Cancelar
              </Button>
              <Button type="button" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
