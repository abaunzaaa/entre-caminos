import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { SuccessConfirm } from "../../components/feedback/SuccessConfirm";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Panel, StatusDot } from "../../components/admin/Panel";
import { CategoryIconPicker } from "../../components/admin/CategoryIconPicker";
import { TeamInviteCarousel } from "../../components/admin/TeamInviteCarousel";
import {
  approveCategory,
  createCategory,
  deleteCategory,
  getAdminCategories,
  rejectCategory,
  updateCategory,
} from "../../services/catalog.service";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/api-error";
import { DEFAULT_CATEGORY_ICON, getCategoryIcon } from "../../utils/category-icons";
import type { Category } from "../../types";
import catIlus from "../../assets/cat-creadas.png";
import carrusel4 from "../../assets/carrusel4.jpg";
import carrusel5 from "../../assets/carrusel5.jpg";
import carrusel6 from "../../assets/carrusel6.jpg";
import "../../styles/admin-access.css";

const CATEGORY_CAROUSEL_SLIDES = [carrusel4, carrusel5, carrusel6] as const;

/** Visible window for Categorías registradas. The filtered list still renders in full; this size caps the scroll viewport and is the future pagination page size. */
const CATEGORY_DIRECTORY_PAGE_SIZE = 5;

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

function categoryStatusLabel(status: Category["status"]) {
  if (status === "APPROVED") {
    return "Aprobada";
  }
  if (status === "REJECTED") {
    return "Rechazada";
  }
  return "Pendiente de revisión";
}

const CATEGORY_STATUS_ORDER: Record<Category["status"], number> = {
  PENDING: 0,
  REJECTED: 1,
  APPROVED: 2,
};

type CategoryStatusFilter = "all" | Category["status"];

export function CategoriesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [icon, setIcon] = useState("");
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<"sort" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [pendingReject, setPendingReject] = useState<Category | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [createdOpen, setCreatedOpen] = useState(false);
  const [createdPendingReview, setCreatedPendingReview] = useState(true);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
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
    if (!pendingDelete && !pendingReject) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting && !reviewing) {
        setPendingDelete(null);
        setPendingReject(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingDelete, pendingReject, deleting, reviewing]);

  function startEdit(category: Category) {
    if (!isSuperAdmin) {
      return;
    }
    setEditing(category);
    setIcon(category.icon && category.icon !== DEFAULT_CATEGORY_ICON ? category.icon : "");
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditing(null);
    setIcon("");
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
    };

    try {
      setSaving(true);
      if (editing) {
        if (!isSuperAdmin) {
          setError("Solo un super administrador puede editar categorías");
          return;
        }
        await updateCategory(editing.id, payload);
        setToast({ tone: "success", text: "Categoría actualizada correctamente." });
        setEditing(null);
      } else {
        const created = await createCategory(payload);
        setCreatedPendingReview(created.status === "PENDING");
        setCreatedOpen(true);
      }
      formElement.reset();
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
    if ((pendingDelete._count?.experiences ?? 0) > 0) {
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

  async function confirmApprove(category: Category) {
    setError("");
    try {
      setReviewing(true);
      await approveCategory(category.id);
      setToast({ tone: "success", text: "Categoría aprobada." });
      await load();
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudo aprobar");
      setError(message);
      setToast({ tone: "error", text: message });
    } finally {
      setReviewing(false);
    }
  }

  async function confirmReject() {
    if (!pendingReject) {
      return;
    }
    if (!rejectReason.trim()) {
      setRejectError("Debes ingresar un motivo para rechazar la categoría.");
      return;
    }
    setRejectError("");
    try {
      setReviewing(true);
      await rejectCategory(pendingReject.id, rejectReason.trim());
      setPendingReject(null);
      setRejectReason("");
      setToast({ tone: "success", text: "Categoría rechazada." });
      await load();
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudo rechazar");
      setRejectError(message);
      setToast({ tone: "error", text: message });
    } finally {
      setReviewing(false);
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
      if (statusFilter === "all") {
        const rank = CATEGORY_STATUS_ORDER[left.status] - CATEGORY_STATUS_ORDER[right.status];
        if (rank !== 0) {
          return rank;
        }
      }
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return dateSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [categories, dateSort, query, statusFilter]);

  const directoryRef = useRef<HTMLDivElement>(null);
  const directoryScrollable = visibleCategories.length > CATEGORY_DIRECTORY_PAGE_SIZE;

  useLayoutEffect(() => {
    const node = directoryRef.current;
    if (!node) {
      return;
    }
    if (!directoryScrollable) {
      node.style.removeProperty("--team-list-max");
      return;
    }

    const list = node.querySelector<HTMLElement>(".dash-team-board__people");

    function applyViewportHeight() {
      const cards = node.querySelectorAll<HTMLElement>(".dash-cats-card");
      const first = cards[0];
      const last = cards[CATEGORY_DIRECTORY_PAGE_SIZE - 1];
      if (!first || !last) {
        return;
      }
      const height = Math.ceil(last.getBoundingClientRect().bottom - first.getBoundingClientRect().top);
      const next = `${height}px`;
      if (node.style.getPropertyValue("--team-list-max") !== next) {
        node.style.setProperty("--team-list-max", next);
      }
    }

    applyViewportHeight();
    const observer = new ResizeObserver(applyViewportHeight);
    observer.observe(node);
    if (list) {
      observer.observe(list);
    }
    window.addEventListener("resize", applyViewportHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyViewportHeight);
    };
  }, [directoryScrollable, visibleCategories]);

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

        <section
          className={`dash-split__panel dash-cats-roster${directoryScrollable ? " is-scrollable" : ""}`}
          aria-label="Categorías registradas"
        >
          <header className="dash-cats-roster__head">
            <h2 className="dash-section__title">Categorías registradas</h2>
            <p className="dash-section__lead">Gestiona las categorías disponibles para clasificar experiencias.</p>
          </header>
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
              className={`dash-team-filters__chip${statusFilter === "APPROVED" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("APPROVED")}
            >
              Aprobadas
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "PENDING" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("PENDING")}
            >
              Pendientes
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "REJECTED" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("REJECTED")}
            >
              Rechazadas
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
            <div
              ref={directoryRef}
              className={`dash-cats-roster__viewport${directoryScrollable ? " is-scrollable" : ""}`}
              tabIndex={directoryScrollable ? 0 : undefined}
              role="region"
              aria-label="Listado de categorías"
              aria-describedby={directoryScrollable ? "cat-directory-scroll-hint" : undefined}
              data-page-size={CATEGORY_DIRECTORY_PAGE_SIZE}
            >
              {directoryScrollable ? (
                <p id="cat-directory-scroll-hint" className="sr-only">
                  Desplázate para ver más categorías.
                </p>
              ) : null}
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
                        <StatusDot active={category.status === "APPROVED"}>
                          {categoryStatusLabel(category.status)}
                        </StatusDot>
                        <StatusDot active={count > 0}>{experiencesLabel(count)}</StatusDot>
                      </div>
                      {category.status === "REJECTED" && category.rejectionReason ? (
                        <p className="dash-team-card__email">{category.rejectionReason}</p>
                      ) : null}
                    </div>
                    {isSuperAdmin ? (
                      <Button type="button" variant="ghost" size="sm" className="ml-auto shrink-0" onClick={() => startEdit(category)}>
                        Editar
                      </Button>
                    ) : null}
                    {isSuperAdmin && category.status === "PENDING" ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          disabled={reviewing}
                          onClick={() => void confirmApprove(category)}
                        >
                          Aprobar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          disabled={reviewing}
                          onClick={() => {
                            setPendingReject(category);
                            setRejectReason("");
                            setRejectError("");
                          }}
                        >
                          Rechazar
                        </Button>
                      </>
                    ) : null}
                    {isSuperAdmin ? (
                      <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setPendingDelete(category)}>
                        Eliminar
                      </Button>
                    ) : null}
                  </article>
                );
              })}
              </div>
            </div>
          )}
        </section>
      </section>

      {pendingReject
        ? createPortal(
            <div
              className="dash-team-confirm"
              role="presentation"
              onClick={() => {
                if (!reviewing) {
                  setPendingReject(null);
                  setRejectError("");
                }
              }}
            >
              <div
                className="dash-team-confirm__card dash-team-confirm__card--scroll"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cat-reject-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="cat-reject-title" className="dash-team-confirm__title">
                  ¿Rechazar categoría?
                </h2>
                <div className="dash-team-confirm__scroll">
                  <p className="dash-team-confirm__lead">Motivo del rechazo *</p>
                  <textarea
                    className="dash-exps-review-reason"
                    value={rejectReason}
                    onChange={(event) => {
                      setRejectReason(event.target.value);
                      if (rejectError) {
                        setRejectError("");
                      }
                    }}
                    placeholder="Explica por qué esta categoría no puede publicarse"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(rejectError)}
                  />
                  {rejectError ? <p className="text-sm text-red-700">{rejectError}</p> : null}
                </div>
                <div className="dash-team-confirm__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={reviewing}
                    onClick={() => {
                      setPendingReject(null);
                      setRejectReason("");
                      setRejectError("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" disabled={reviewing} onClick={() => void confirmReject()}>
                    {reviewing ? "Rechazando..." : "Rechazar categoría"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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
            aria-describedby={(pendingDelete._count?.experiences ?? 0) > 0 ? "cat-delete-copy" : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            {(pendingDelete._count?.experiences ?? 0) > 0 ? (
              <>
                <h2 id="cat-delete-title" className="dash-team-confirm__title">
                  ¿No puedes eliminar esta categoría?
                </h2>
                <p id="cat-delete-copy" className="dash-team-confirm__lead">
                  Esta categoría tiene experiencias asociadas y debe conservarse para mantener la información de las
                  experiencias registradas.
                </p>
                <div className="dash-team-confirm__actions">
                  <Button type="button" variant="secondary" disabled={deleting} onClick={() => setPendingDelete(null)}>
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 id="cat-delete-title" className="dash-team-confirm__title">
                  ¿Estás seguro de eliminar esta categoría?
                </h2>
                <div className="dash-team-confirm__actions">
                  <Button type="button" variant="secondary" disabled={deleting} onClick={() => setPendingDelete(null)}>
                    Cancelar
                  </Button>
                  <Button type="button" disabled={deleting} onClick={() => void confirmDelete()}>
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <SuccessConfirm
        open={createdOpen}
        variant="category"
        title="Categoría creada correctamente"
        text={
          createdPendingReview
            ? "La categoría quedó pendiente de revisión."
            : "La categoría fue publicada correctamente."
        }
        onClose={() => setCreatedOpen(false)}
      />
    </div>
  );
}
