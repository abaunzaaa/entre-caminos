import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Panel, StatusDot } from "../../components/admin/Panel";
import { CategoryIconPicker } from "../../components/admin/CategoryIconPicker";
import { TeamInviteCarousel } from "../../components/admin/TeamInviteCarousel";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { DEFAULT_CATEGORY_ICON, getCategoryIcon } from "../../utils/category-icons";
import type { Category } from "../../types";
import catIlus from "../../assets/cat-creadas.png";
import carrusel4 from "../../assets/carrusel4.jpg";
import carrusel5 from "../../assets/carrusel5.jpg";
import carrusel6 from "../../assets/carrusel6.jpg";
import "../../styles/admin-access.css";

const CATEGORY_CAROUSEL_SLIDES = [carrusel4, carrusel5, carrusel6] as const;

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

function experiencesLabel(count: number) {
  return count === 1 ? "1 experiencia" : `${count} experiencias`;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [icon, setIcon] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "INACTIVE">("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<"sort" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLElement>(null);

  async function load() {
    setCategories(await getAdminCategories());
  }

  useEffect(() => {
    load().catch((err) => setError(getApiErrorMessage(err, "No se pudieron cargar las categorías")));
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!filtersRef.current?.contains(target)) {
        setOpenMenu(null);
      }
      if (!statusRef.current?.contains(target)) {
        setStatusOpen(false);
      }
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

  function startEdit(category: Category) {
    setEditing(category);
    setStatus(category.status);
    setIcon(category.icon && category.icon !== DEFAULT_CATEGORY_ICON ? category.icon : "");
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditing(null);
    setStatus("ACTIVE");
    setIcon("");
    setStatusOpen(false);
    setError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    const payload = {
      name: String(form.get("name")),
      description: String(form.get("description")),
      icon: icon || DEFAULT_CATEGORY_ICON,
      ...(editing ? { status } : {}),
    };

    try {
      setSaving(true);
      if (editing) {
        await updateCategory(editing.id, payload);
        setToast({ tone: "success", text: "Categoría actualizada correctamente." });
        setEditing(null);
        setStatus("ACTIVE");
      } else {
        await createCategory(payload);
        setToast({ tone: "success", text: "Categoría creada y guardada." });
      }
      formElement.reset();
      setStatus("ACTIVE");
      setIcon("");
      await load();
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudo guardar");
      setError(message);
      setToast({ tone: "error", text: message });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setError("");
    try {
      setDeleting(true);
      await deleteCategory(pendingDelete.id);
      if (editing?.id === pendingDelete.id) {
        cancelEdit();
      }
      setPendingDelete(null);
      setToast({ tone: "success", text: "Categoría eliminada." });
      await load();
    } catch (err) {
      const message = getApiErrorMessage(err, "No se puede eliminar");
      setError(message);
      setToast({ tone: "error", text: message });
    } finally {
      setDeleting(false);
    }
  }

  const visibleCategories = useMemo(() => {
    const term = query.trim().toLowerCase();
    const next = categories.filter((category) => {
      if (statusFilter !== "all" && category.status !== statusFilter) {
        return false;
      }
      if (term && !category.name.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
    return [...next].sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return dateSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [categories, dateSort, query, statusFilter]);

  return (
    <div className="dash dash--cats">
      {toast ? (
        <p className={`dash-team-toast${toast.tone === "error" ? " is-error" : ""}`} role="status">
          {toast.text}
        </p>
      ) : null}

      <article className="dash-profile">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">Categorías del catálogo</h1>
            <p className="dash-profile__row">
              <span>Organiza las experiencias de Entre Caminos para facilitar su exploración y descubrimiento.</span>
            </p>
          </div>
        </div>
        <div className="dash-access-hero" aria-hidden="true">
          <div className="dash-profile__stat dash-access-hero__frame">
            <img src={catIlus} alt="" className="dash-profile__stat-art dash-access-hero__art dash-float-art" />
          </div>
        </div>
      </article>

      <section className="dash-team-board" aria-label="Gestión de categorías">
        <div className="dash-team-compose">
          <section className="dash-split__panel" aria-label="Añadir categoría" ref={formRef}>
            <div>
              <h2 className="dash-section__title">{editing ? "Editar categoría" : "Añadir categoría"}</h2>
              <p className="dash-section__lead">
                {editing
                  ? "Actualiza los datos de esta categoría."
                  : "Agrega nuevas formas de organizar las experiencias."}
              </p>
            </div>
          <form key={editing?.id ?? "create"} className="dash-team-invite" onSubmit={onSubmit}>
            <Input name="name" label="Nombre" defaultValue={editing?.name} required />
            {editing ? (
            <div className="dash-team-role" ref={statusRef}>
              <span className="dash-team-role__label">Estado</span>
              <input type="hidden" name="status" value={status} />
              <button
                type="button"
                className={`dash-team-role__trigger${statusOpen ? " is-open" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => setStatusOpen((open) => !open)}
              >
                <span>{status === "ACTIVE" ? "Activa" : "Inactiva"}</span>
                <ChevronDown size={18} strokeWidth={1.7} aria-hidden="true" />
              </button>
              <div className={`dash-team-role__menu${statusOpen ? " is-open" : ""}`} role="listbox">
                <button
                  type="button"
                  role="option"
                  aria-selected={status === "ACTIVE"}
                  className={`dash-team-role__option${status === "ACTIVE" ? " is-active" : ""}`}
                  onClick={() => {
                    setStatus("ACTIVE");
                    setStatusOpen(false);
                  }}
                >
                  Activa
                </button>
                <button
                  type="button"
                  role="option"
                  aria-selected={status === "INACTIVE"}
                  className={`dash-team-role__option${status === "INACTIVE" ? " is-active" : ""}`}
                  onClick={() => {
                    setStatus("INACTIVE");
                    setStatusOpen(false);
                  }}
                >
                  Inactiva
                </button>
              </div>
            </div>
            ) : null}
            <div className="dash-team-invite__full">
              <CategoryIconPicker value={icon} onChange={setIcon} />
            </div>
            <div className="dash-team-invite__full">
              <Textarea
                name="description"
                label="Descripción"
                className="dash-cats-desc min-h-0 resize-none overflow-y-auto"
                defaultValue={editing?.description ?? ""}
              />
            </div>
            {error ? <p className="text-sm text-red-700 dash-team-invite__full">{error}</p> : null}
            <div className="dash-team-invite__full dash-cats-actions">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Añadir categoría"}
              </Button>
              {editing ? (
                <Button type="button" variant="secondary" disabled={saving} onClick={cancelEdit}>
                  Cancelar edición
                </Button>
              ) : null}
            </div>
          </form>
          </section>
          <TeamInviteCarousel
            slides={CATEGORY_CAROUSEL_SLIDES}
            label="Galería de categorías"
          />
        </div>

        <section className="dash-split__panel" aria-label="Categorías registradas">
          <div>
            <h2 className="dash-section__title">Categorías registradas</h2>
            <p className="dash-section__lead">Gestiona las categorías disponibles para clasificar experiencias.</p>
          </div>
          <div className="dash-team-filters" role="toolbar" aria-label="Filtros de categorías" ref={filtersRef}>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "all" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Ver todas
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "ACTIVE" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Activas
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "INACTIVE" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("INACTIVE")}
            >
              Inactivas
            </button>
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
                placeholder="Buscar categoría"
              />
              <button
                type="button"
                className="dash-team-filters__search-btn"
                aria-label="Buscar categoría"
                onClick={() => searchRef.current?.focus()}
              >
                <Search size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>
          {categories.length === 0 ? (
            <Panel className="dash-empty">
              <p>Aún no tienes categorías creadas</p>
              <p className="dash-section__lead">Empieza creando la primera categoría para organizar tus experiencias.</p>
              <Button
                type="button"
                className="mt-4"
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                Crear categoría
              </Button>
            </Panel>
          ) : visibleCategories.length === 0 ? (
            <Panel className="dash-empty">
              <p>No hay coincidencias con estos filtros.</p>
            </Panel>
          ) : (
            <div className="dash-team-board__people">
              {visibleCategories.map((category) => {
                const count = category._count?.experiences ?? 0;
                const Icon = getCategoryIcon(category.icon);
                return (
                  <article key={category.id} className="dash-team-card dash-cats-card">
                    <span className="dash-cat-card__icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                    <div className="dash-team-card__info">
                      <h3>{category.name}</h3>
                      {category.description ? <p className="dash-team-card__email">{category.description}</p> : null}
                      <div className="dash-team-card__facts">
                        <StatusDot active={category.status === "ACTIVE"}>
                          {category.status === "ACTIVE" ? "Activa" : "Inactiva"}
                        </StatusDot>
                        <StatusDot active={count > 0}>{experiencesLabel(count)}</StatusDot>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="ml-auto shrink-0" onClick={() => startEdit(category)}>
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setPendingDelete(category)}>
                      Eliminar
                    </Button>
                  </article>
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
            aria-labelledby="cat-delete-title"
            aria-describedby="cat-delete-copy"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cat-delete-title" className="dash-team-confirm__title">
              ¿Estás seguro de eliminar esta categoría?
            </h2>
            <p id="cat-delete-copy" className="dash-team-confirm__lead">
              Las categorías con experiencias asociadas no pueden eliminarse.
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
