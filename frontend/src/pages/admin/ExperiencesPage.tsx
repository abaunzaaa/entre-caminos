import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ExperienceCatalogCard } from "../../components/admin/ExperienceCatalogCard";
import { Panel } from "../../components/admin/Panel";
import {
  changeExperienceStatus,
  deleteExperience,
  getAdminCategories,
  getAdminExperiences,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import type { Category, Experience, ExperienceStatus } from "../../types";
import expeIlus from "../../assets/expe-agregadas.png";
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

function isCatalogActive(status: ExperienceStatus) {
  return status === "PUBLISHED";
}

export function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<"category" | "sort" | string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Experience | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState("");
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [nextExperiences, nextCategories] = await Promise.all([
      getAdminExperiences(),
      getAdminCategories().catch(() => [] as Category[]),
    ]);
    setExperiences(nextExperiences);
    setCategories(nextCategories);
  }

  useEffect(() => {
    load().catch((err) => setError(getApiErrorMessage(err, "No se pudieron cargar las experiencias")));
  }, []);

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
    if (!pendingDelete) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) {
        setPendingDelete(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingDelete, deleting]);

  async function onChangeStatus(experience: Experience, status: ExperienceStatus) {
    setError("");
    setOpenMenu(null);
    try {
      setStatusBusyId(experience.id);
      const updated = await changeExperienceStatus(experience.id, status);
      setExperiences((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setToast({ tone: "success", text: "Estado actualizado." });
    } catch (err) {
      const message = getApiErrorMessage(err, "Para publicar hace falta imagen y ubicación.");
      setError(message);
      setToast({ tone: "error", text: message });
    } finally {
      setStatusBusyId("");
    }
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
      setToast({ tone: "success", text: "Experiencia eliminada." });
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudo eliminar");
      setError(message);
      setToast({ tone: "error", text: message });
    } finally {
      setDeleting(false);
    }
  }

  const visibleExperiences = useMemo(() => {
    const term = query.trim().toLowerCase();
    const next = experiences.filter((experience) => {
      if (statusFilter === "active" && !isCatalogActive(experience.status)) {
        return false;
      }
      if (statusFilter === "inactive" && isCatalogActive(experience.status)) {
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
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return dateSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [experiences, statusFilter, categoryFilter, dateSort, query]);

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

      <section className="dash-team-board" aria-label="Gestión de experiencias">
        <section className="dash-split__panel dash-exps-create" aria-label="Crear experiencia">
          <div>
            <h2 className="dash-section__title">Crear experiencia</h2>
            <p className="dash-section__lead">Añade un nuevo plan al catálogo público de Entre Caminos.</p>
          </div>
          <Link to="/admin/experiencias/nueva" className="admin-cta">
            Crear experiencia
          </Link>
        </section>

        <section className="dash-split__panel" aria-label="Experiencias registradas">
          <div>
            <h2 className="dash-section__title">Experiencias registradas</h2>
            <p className="dash-section__lead">Consulta, edita y publica las experiencias del catálogo.</p>
          </div>
          <div className="dash-team-filters" role="toolbar" aria-label="Filtros de experiencias" ref={filtersRef}>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "all" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Ver todas
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "active" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Activas
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "inactive" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("inactive")}
            >
              Inactivas
            </button>
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
              <p>No hay coincidencias con estos filtros.</p>
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
