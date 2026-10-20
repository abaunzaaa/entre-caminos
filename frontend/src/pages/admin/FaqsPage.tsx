import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, CircleHelp, Search, X } from "lucide-react";
import { FAQ_ADMIN_ART } from "../../assets/faq-assets";
import { Panel, StatusDot } from "../../components/admin/Panel";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { SuccessConfirm } from "../../components/feedback/SuccessConfirm";
import { KeyConfirmDialog } from "../../components/ui/KeyConfirmDialog";
import { Pager } from "../../components/ui/Pager";
import { usePageScrollLock } from "../../hooks/usePageScrollLock";
import {
  FAQ_ANSWER_MAX,
  FAQ_ANSWER_MIN,
  FAQ_QUESTION_MAX,
  FAQ_QUESTION_MIN,
  FAQ_SUBJECT_MAX,
  FAQ_SUBJECT_MIN,
  answerAdminFaq,
  createAdminFaq,
  createFaqCategory,
  deleteAdminFaq,
  discardAdminFaq,
  getAdminFaq,
  getAdminFaqs,
  hideAdminFaq,
  publishAdminFaq,
  unpublishAdminFaq,
  updateAdminFaq,
} from "../../services/faq.service";
import type { AdminFaq, FaqCategory, FaqCounts, FaqSource, FaqStatus } from "../../types";
import { getApiErrorMessage } from "../../utils/api-error";
import "../../styles/admin-faqs.css";

const PAGE_SIZE = 8;

const STATUS_LABEL: Record<FaqStatus, string> = {
  PENDING: "Pendiente",
  ANSWERED: "Contestada",
  PUBLISHED: "Publicada",
  HIDDEN: "Oculta",
  DISCARDED: "Descartada",
};

const SOURCE_LABEL: Record<FaqSource, string> = {
  USER_SUBMISSION: "Usuario",
  ADMIN_CREATED: "Equipo",
};

type StatusFilter = "all" | FaqStatus;
type SourceFilter = "all" | FaqSource;
type DialogMode = "create" | "edit" | "answer" | "view";

function formatWhen(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function CategoryFields({
  categories,
  categoryId,
  newCategory,
  onCategory,
  onNewCategory,
}: {
  categories: FaqCategory[];
  categoryId: string;
  newCategory: string;
  onCategory: (value: string) => void;
  onNewCategory: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((item) => item.id === categoryId)?.name ?? "Sin categoría";
  const options = [{ id: "", name: "Sin categoría" }, ...categories.map((item) => ({ id: item.id, name: item.name }))];
  return (
    <div className="faq-field">
      <span className="dash-faq-kicker">Categoría</span>
      <div className="dash-faq-picker">
        <button
          type="button"
          className="dash-faq-picker__trigger"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((current) => !current)}
        >
          <span>{selected}</span>
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className={`dash-team-filters__menu dash-faq-picker__menu${open ? " is-open" : ""}`} role="listbox">
          {options.map((item) => (
            <button
              key={item.id || "none"}
              type="button"
              role="option"
              aria-selected={item.id === categoryId}
              className={`dash-team-filters__option${item.id === categoryId ? " is-selected" : ""}`}
              onClick={() => {
                onCategory(item.id);
                setOpen(false);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      <Input
        label="Nueva categoría"
        value={newCategory}
        maxLength={40}
        placeholder="Opcional. Se crea si aún no existe."
        onChange={(event) => onNewCategory(event.target.value)}
      />
    </div>
  );
}

function summary(counts: FaqCounts | null) {
  if (!counts) return "Preparando el resumen…";
  const pending = counts.pending === 1 ? "1 pendiente" : `${counts.pending} pendientes`;
  const published = counts.published === 1 ? "1 publicada" : `${counts.published} publicadas`;
  return `${counts.total} en total · ${pending} · ${published}`;
}

function FilterMenu<T extends string>({
  label,
  open,
  options,
  onToggle,
  onSelect,
}: {
  label: string;
  open: boolean;
  options: Array<{ value: T; label: string }>;
  onToggle: () => void;
  onSelect: (value: T) => void;
}) {
  return (
    <div className={`dash-team-filters__menuwrap${open ? " is-active" : ""}`}>
      <button type="button" className="dash-team-filters__chip dash-team-filters__trigger" aria-expanded={open} onClick={onToggle}>
        <span>{label}</span>
        <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div className={`dash-team-filters__menu${open ? " is-open" : ""}`} role="listbox">
        {options.map((option) => (
          <button key={option.value} type="button" className="dash-team-filters__option" role="option" onClick={() => onSelect(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FaqsPage() {
  const [faqs, setFaqs] = useState<AdminFaq[]>([]);
  const [counts, setCounts] = useState<FaqCounts | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [openMenu, setOpenMenu] = useState<"source" | "sort" | "category" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [actingId, setActingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminFaq | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dialog, setDialog] = useState<{ mode: DialogMode; faq: AdminFaq | null } | null>(null);
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [draftStatus, setDraftStatus] = useState<FaqStatus>("HIDDEN");
  const [draftCategoryId, setDraftCategoryId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [publish, setPublish] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useSearchParams();
  const faqFromNotice = params.get("faq");

  usePageScrollLock(Boolean(dialog) || Boolean(pendingDelete));

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, source, sort, categoryId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminFaqs({
      q: debouncedQuery || undefined,
      status: status === "all" ? undefined : status,
      source: source === "all" ? undefined : source,
      categoryId: categoryId === "all" ? undefined : categoryId,
      sort,
      page,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        if (cancelled) return;
        setFaqs(data.faqs);
        setCategories(data.categories ?? []);
        setCounts(data.counts ?? null);
        setPageCount(data.pageCount);
        if (data.page !== page) setPage(data.page);
        setError("");
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "No pudimos cargar las preguntas."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, status, source, categoryId, sort, page, revision]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!filtersRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        event.preventDefault();
        setDialog(null);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const nodes = [...dialogRef.current.querySelectorAll<HTMLElement>("button, input, textarea, select, a[href]")].filter(
        (node) => !node.hasAttribute("disabled"),
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, saving]);

  useEffect(() => {
    if (!faqFromNotice) return;
    let cancelled = false;
    getAdminFaq(faqFromNotice)
      .then((faq) => {
        if (!cancelled) openDialog("view", faq);
      })
      .catch(() => {
        if (!cancelled) setToast({ tone: "error", text: "No encontramos esa pregunta." });
      })
      .finally(() => {
        if (cancelled) return;
        const next = new URLSearchParams(params);
        next.delete("faq");
        setParams(next, { replace: true });
      });
    return () => {
      cancelled = true;
    };
    // openDialog solo escribe estado a partir de la pregunta recibida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqFromNotice]);

  useEffect(() => {
    if (!dialog) return;
    const timer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>(".dash-faq-dialog__close")?.focus();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [dialog]);

  function openDialog(mode: DialogMode, faq: AdminFaq | null) {
    setDialog({ mode, faq });
    setSubject(faq?.subject ?? "");
    setQuestion(faq?.question ?? "");
    setAnswer(faq?.answer ?? "");
    setDraftStatus(faq?.status ?? "HIDDEN");
    setDraftCategoryId(faq?.category?.id ?? "");
    setNewCategory("");
    setPublish(faq?.status === "PUBLISHED");
    setFormError("");
  }

  function reload() {
    setRevision((value) => value + 1);
  }

  async function runRow(id: string, action: () => Promise<unknown>, title: string, text: string) {
    setActingId(id);
    try {
      await action();
      setConfirm({ title, text });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: getApiErrorMessage(err, "No pudimos completar la acción.") });
    } finally {
      setActingId(null);
    }
  }

  function validateDraft(mode: DialogMode) {
    const cleanSubject = subject.trim();
    const cleanQuestion = question.trim();
    const cleanAnswer = answer.trim();
    if (mode !== "answer") {
      if (cleanSubject.length < FAQ_SUBJECT_MIN) return "El asunto debe tener al menos 3 caracteres.";
      if (cleanSubject.length > FAQ_SUBJECT_MAX) return "El asunto es demasiado largo.";
      if (cleanQuestion.length < FAQ_QUESTION_MIN) return "La pregunta debe tener al menos 10 caracteres.";
      if (cleanQuestion.length > FAQ_QUESTION_MAX) return "La pregunta es demasiado larga.";
    }
    const needsAnswer = mode === "answer" || draftStatus === "PUBLISHED" || draftStatus === "ANSWERED";
    if (needsAnswer && cleanAnswer.length < FAQ_ANSWER_MIN) {
      return mode === "answer" || draftStatus === "PUBLISHED"
        ? "Para publicar o responder, escribe una respuesta de al menos 10 caracteres."
        : "Guarda una respuesta antes de marcarla como respondida.";
    }
    if (cleanAnswer.length > FAQ_ANSWER_MAX) return "La respuesta es demasiado larga.";
    return "";
  }

  async function onSave(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    if (!dialog || saving || dialog.mode === "view") return;
    const problem = validateDraft(dialog.mode);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const chosenCategory = newCategory.trim()
        ? (await createFaqCategory(newCategory.trim())).id
        : draftCategoryId || null;
      if (dialog.mode === "create") {
        await createAdminFaq({
          subject: subject.trim(),
          question: question.trim(),
          answer: answer.trim() || undefined,
          status: draftStatus,
          categoryId: chosenCategory,
        });
        setConfirm({
          title: "¡Pregunta frecuente creada correctamente!",
          text:
            draftStatus === "PUBLISHED"
              ? "La pregunta se guardó y ya está disponible en Preguntas Frecuentes."
              : "La pregunta se guardó y ya puedes gestionarla desde el panel.",
        });
      } else if (dialog.mode === "answer" && dialog.faq) {
        const saved = await answerAdminFaq(dialog.faq.id, { answer: answer.trim(), publish, categoryId: chosenCategory });
        setConfirm({
          title: "¡Respuesta guardada correctamente!",
          text: saved.notified
            ? "La respuesta se ha registrado correctamente. El usuario que la envió ya recibió el aviso."
            : "La respuesta se ha registrado correctamente.",
        });
      } else if (dialog.faq) {
        await updateAdminFaq(dialog.faq.id, {
          subject: subject.trim(),
          question: question.trim(),
          answer: answer.trim() ? answer.trim() : null,
          status: draftStatus,
          categoryId: chosenCategory,
        });
        setConfirm({ title: "¡Pregunta actualizada correctamente!", text: "Los cambios se guardaron con éxito." });
      }
      setDialog(null);
      reload();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No pudimos guardar la pregunta."));
    } finally {
      setSaving(false);
    }
  }

  async function runFromDialog(action: () => Promise<unknown>, title: string, text: string) {
    if (!dialog?.faq) return;
    const id = dialog.faq.id;
    setActingId(id);
    try {
      await action();
      setDialog(null);
      setConfirm({ title, text });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: getApiErrorMessage(err, "No pudimos completar la acción.") });
    } finally {
      setActingId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteAdminFaq(pendingDelete.id);
      setPendingDelete(null);
      setConfirm({ title: "¡Pregunta eliminada correctamente!", text: "La pregunta se eliminó del sistema." });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: getApiErrorMessage(err, "No pudimos eliminar la pregunta.") });
    } finally {
      setDeleting(false);
    }
  }

  const noFilters = !debouncedQuery && status === "all" && source === "all" && categoryId === "all";
  const categoryLabel = categories.find((item) => item.id === categoryId)?.name ?? "Categoría";
  const showEmpty = loaded && !loading && faqs.length === 0 && !error;
  const trulyEmpty = showEmpty && noFilters;
  const filteredEmpty = showEmpty && !noFilters;
  const dialogTitle =
    dialog?.mode === "create"
      ? "Crear FAQ"
      : dialog?.mode === "answer"
        ? dialog.faq?.answer
          ? "Editar respuesta"
          : "Responder"
        : dialog?.mode === "edit"
          ? "Editar pregunta"
          : "Detalle de la pregunta";

  return (
    <div className="dash dash--faqs">
      {toast ? (
        <p className={`dash-team-toast${toast.tone === "error" ? " is-error" : ""}`} role="status">
          {toast.text}
        </p>
      ) : null}

      <article className="dash-profile">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">Preguntas frecuentes</h1>
            <p className="dash-profile__row">
              <span>Gestiona las preguntas de los usuarios y la información que se comparte en la plataforma.</span>
            </p>
            <p className="dash-faq-summary">{summary(counts)}</p>
          </div>
          <Button type="button" className="dash-faq-create" onClick={() => openDialog("create", null)}>
            Crear FAQ
          </Button>
        </div>
        <div className="dash-access-hero" aria-hidden="true">
          <div className="dash-profile__stat dash-access-hero__frame">
            <img src={FAQ_ADMIN_ART} alt="" className="dash-profile__stat-art dash-access-hero__art dash-float-art" />
          </div>
        </div>
      </article>

      <section className="dash-team-board" aria-label="Gestión de preguntas frecuentes">
        <div className="dash-team-filters" role="toolbar" aria-label="Filtros de preguntas" ref={filtersRef}>
          {(
            [
              ["all", "Todas"],
              ["PENDING", "Pendientes"],
              ["ANSWERED", "Contestadas"],
              ["PUBLISHED", "Publicadas"],
              ["HIDDEN", "Ocultas"],
              ["DISCARDED", "Descartadas"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`dash-team-filters__chip${status === value ? " is-active" : ""}`}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
          <FilterMenu
            label={categoryId === "all" ? "Categoría" : categoryLabel}
            open={openMenu === "category"}
            options={[
              { value: "all", label: "Todas las categorías" },
              ...categories.map((item) => ({ value: item.id, label: item.name })),
            ]}
            onToggle={() => setOpenMenu((current) => (current === "category" ? null : "category"))}
            onSelect={(value) => {
              setCategoryId(value);
              setOpenMenu(null);
            }}
          />
          <FilterMenu
            label={source === "USER_SUBMISSION" ? "De usuarios" : source === "ADMIN_CREATED" ? "Del equipo" : "Origen"}
            open={openMenu === "source"}
            options={[
              { value: "all", label: "Todos los orígenes" },
              { value: "USER_SUBMISSION", label: "De usuarios" },
              { value: "ADMIN_CREATED", label: "Del equipo" },
            ]}
            onToggle={() => setOpenMenu((current) => (current === "source" ? null : "source"))}
            onSelect={(value) => {
              setSource(value);
              setOpenMenu(null);
            }}
          />
          <FilterMenu
            label={sort === "oldest" ? "Más antiguas" : "Más recientes"}
            open={openMenu === "sort"}
            options={[
              { value: "newest", label: "Más recientes" },
              { value: "oldest", label: "Más antiguas" },
            ]}
            onToggle={() => setOpenMenu((current) => (current === "sort" ? null : "sort"))}
            onSelect={(value) => {
              setSort(value);
              setOpenMenu(null);
            }}
          />
          <div className="dash-team-filters__search">
            <input type="search" value={query} placeholder="Buscar pregunta" aria-label="Buscar pregunta" onChange={(event) => setQuery(event.target.value)} />
            <span className="dash-team-filters__search-btn" aria-hidden="true">
              <Search size={16} strokeWidth={1.75} />
            </span>
          </div>
        </div>

        {loading && !loaded ? (
          <Panel className="dash-empty">
            <p>Cargando preguntas…</p>
          </Panel>
        ) : null}
        {error && !loaded ? (
          <Panel className="dash-empty">
            <p>{error}</p>
            <Button type="button" className="mt-4" onClick={reload}>
              Intentar de nuevo
            </Button>
          </Panel>
        ) : null}
        {trulyEmpty ? (
          <Panel className="dash-empty">
            <p>Aún no hay preguntas frecuentes</p>
            <p className="dash-section__lead">Cuando alguien escriba, o cuando crees la primera, aparecerá aquí.</p>
            <Button type="button" className="mt-4" onClick={() => openDialog("create", null)}>
              Crear FAQ
            </Button>
          </Panel>
        ) : null}
        {filteredEmpty ? (
          <Panel className="dash-empty">
            <p>No hay coincidencias con estos filtros.</p>
          </Panel>
        ) : null}
        {error && loaded ? <p className="dash-section__lead">{error}</p> : null}

        {faqs.length > 0 ? (
          <div className={`dash-team-board__people${loading ? " is-refreshing" : ""}`} aria-busy={loading}>
            {faqs.map((faq) => {
              const busy = actingId === faq.id;
              const hasAnswer = Boolean(faq.answer?.trim());
              return (
                <article key={faq.id} className="dash-team-card dash-faq-card">
                  <span className="dash-cat-card__icon" aria-hidden="true">
                    <CircleHelp size={20} strokeWidth={1.75} />
                  </span>
                  <div className="dash-team-card__info dash-faq-card__body">
                    <h3>{faq.question}</h3>
                    <p className="dash-team-card__email">{faq.subject}</p>
                    <div className="dash-team-card__facts">
                      <StatusDot active={faq.status === "PUBLISHED"}>{STATUS_LABEL[faq.status]}</StatusDot>
                      <StatusDot active={faq.source === "USER_SUBMISSION"}>{SOURCE_LABEL[faq.source]}</StatusDot>
                      <span>{faq.category?.name ?? "Sin categoría"}</span>
                      <span>{faq.user?.name ?? "Sin usuario"}</span>
                      <span>{formatWhen(faq.createdAt)}</span>
                      <span>{faq.status === "PUBLISHED" ? "Visible" : "No visible"}</span>
                    </div>
                  </div>
                  <div className="dash-faq-card__actions">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openDialog("view", faq)}>
                      Ver
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openDialog("edit", faq)}>
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openDialog("answer", faq)}>
                      {hasAnswer ? "Editar respuesta" : "Responder"}
                    </Button>
                    {faq.status === "PUBLISHED" ? (
                      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void runRow(faq.id, () => unpublishAdminFaq(faq.id), "¡Pregunta retirada de la sección pública!", "La pregunta sigue disponible para gestionarla desde el panel.")}>
                        Despublicar
                      </Button>
                    ) : hasAnswer ? (
                      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void runRow(faq.id, () => publishAdminFaq(faq.id), "¡Pregunta publicada correctamente!", "Ya está disponible en Preguntas Frecuentes.")}>
                        Publicar
                      </Button>
                    ) : null}
                    {faq.status !== "HIDDEN" && faq.status !== "DISCARDED" ? (
                      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void runRow(faq.id, () => hideAdminFaq(faq.id), "¡Pregunta ocultada correctamente!", "Ya no aparece en la sección pública.")}>
                        Ocultar
                      </Button>
                    ) : null}
                    {faq.status !== "DISCARDED" ? (
                      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void runRow(faq.id, () => discardAdminFaq(faq.id), "¡Pregunta descartada correctamente!", "Se conserva en el historial del panel.")}>
                        Descartar
                      </Button>
                    ) : null}
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPendingDelete(faq)}>
                      Eliminar
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {pageCount > 1 ? (
          <Pager page={page} pageCount={pageCount} onPageChange={setPage} label="Paginación de preguntas frecuentes" disabled={loading} />
        ) : null}
      </section>

      {dialog
        ? createPortal(
        <div
          className="dash-team-confirm dash-faq-confirm"
          role="presentation"
          onClick={() => {
            if (!saving) setDialog(null);
          }}
        >
          <div
            ref={dialogRef}
            className="dash-team-confirm__card dash-team-confirm__card--scroll dash-faq-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="faq-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dash-faq-dialog__head">
              <div>
                <p className="dash-faq-kicker">
                  {dialog.mode === "create" ? "Nueva pregunta" : dialog.faq?.category?.name ?? "Sin categoría"}
                </p>
                <h2 id="faq-dialog-title" className="dash-team-confirm__title">
                  {dialogTitle}
                </h2>
              </div>
              <button type="button" className="dash-faq-dialog__close" aria-label="Cerrar" disabled={saving} onClick={() => setDialog(null)}>
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            {dialog.faq ? (
              <div className="dash-faq-context">
                <p className="dash-faq-context__label">Pregunta que estás gestionando</p>
                <p className="dash-faq-context__question">{dialog.faq.question}</p>
                <div className="dash-faq-facts">
                  <div className="dash-faq-facts__row">
                    <StatusDot active={dialog.faq.status === "PUBLISHED"}>{STATUS_LABEL[dialog.faq.status]}</StatusDot>
                    <span>{SOURCE_LABEL[dialog.faq.source]}</span>
                    <span>{dialog.faq.category?.name ?? "Sin categoría"}</span>
                    <span className="dash-faq-facts__strong">{dialog.faq.user?.name ?? "Creada por el equipo"}</span>
                  </div>
                  <div className="dash-faq-facts__row">
                    {dialog.faq.user?.email ? <span className="dash-faq-facts__email">{dialog.faq.user.email}</span> : null}
                    <span>Creada el {formatWhen(dialog.faq.createdAt)}</span>
                    <span>{dialog.faq.status === "PUBLISHED" ? "Visible" : "No visible"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="dash-team-confirm__lead">Escribe la pregunta y, si ya tienes la respuesta, puedes publicarla desde aquí.</p>
            )}
            <form className="dash-team-confirm__scroll" onSubmit={onSave}>
              {dialog.mode === "view" && dialog.faq ? (
                <>
                  <p className="dash-faq-kicker">Respuesta</p>
                  <p className="dash-faq-copy">{dialog.faq.answer?.trim() || "Esta pregunta todavía no tiene respuesta."}</p>
                  {dialog.faq.subject ? <p className="dash-faq-kicker">Asunto interno: {dialog.faq.subject}</p> : null}
                </>
              ) : null}

              {dialog.mode === "create" || dialog.mode === "edit" ? (
                <>
                  <Input label="Asunto" value={subject} maxLength={FAQ_SUBJECT_MAX} onChange={(event) => setSubject(event.target.value)} />
                  <Textarea label="Pregunta" value={question} maxLength={FAQ_QUESTION_MAX} onChange={(event) => setQuestion(event.target.value)} />
                  <Textarea label="Respuesta" value={answer} maxLength={FAQ_ANSWER_MAX} onChange={(event) => setAnswer(event.target.value)} />
                  <CategoryFields
                    categories={categories}
                    categoryId={draftCategoryId}
                    newCategory={newCategory}
                    onCategory={setDraftCategoryId}
                    onNewCategory={setNewCategory}
                  />
                  <div className="faq-field">
                    <span className="dash-faq-kicker">Estado</span>
                    <div className="dash-faq-choices" role="radiogroup" aria-label="Estado">
                      {(["HIDDEN", "ANSWERED", "PUBLISHED", "PENDING", "DISCARDED"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={draftStatus === value ? "is-selected" : undefined}
                          aria-checked={draftStatus === value}
                          role="radio"
                          onClick={() => setDraftStatus(value)}
                        >
                          {STATUS_LABEL[value]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {dialog.mode === "answer" ? (
                <>
                  <Textarea label="Respuesta" value={answer} maxLength={FAQ_ANSWER_MAX} onChange={(event) => setAnswer(event.target.value)} />
                  <CategoryFields
                    categories={categories}
                    categoryId={draftCategoryId}
                    newCategory={newCategory}
                    onCategory={setDraftCategoryId}
                    onNewCategory={setNewCategory}
                  />
                  <label className="faq-admin-check">
                    <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} />
                    <span>Publicar en la página de preguntas frecuentes</span>
                  </label>
                </>
              ) : null}

              {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
            </form>
            <div className="dash-team-confirm__actions">
              <Button type="button" variant="secondary" disabled={saving} onClick={() => setDialog(null)}>
                {dialog.mode === "view" ? "Cerrar" : "Cancelar"}
              </Button>
              {dialog.mode === "view" && dialog.faq ? (
                <>
                  <Button type="button" variant="secondary" onClick={() => openDialog("edit", dialog.faq)}>
                    Editar
                  </Button>
                  <Button type="button" onClick={() => openDialog("answer", dialog.faq)}>
                    {dialog.faq.answer ? "Editar respuesta" : "Responder"}
                  </Button>
                </>
              ) : (
                <Button type="button" disabled={saving} onClick={(event) => void onSave(event)}>
                  {saving ? "Guardando…" : dialog.mode === "answer" ? "Guardar respuesta" : "Guardar"}
                </Button>
              )}
              {dialog.faq && dialog.mode !== "create" ? (
                <>
                  {dialog.faq.status === "PUBLISHED" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={actingId === dialog.faq.id}
                      onClick={() => void runFromDialog(() => unpublishAdminFaq(dialog.faq!.id), "¡Pregunta retirada de la sección pública!", "La pregunta sigue disponible para gestionarla desde el panel.")}
                    >
                      Despublicar
                    </Button>
                  ) : dialog.faq.answer?.trim() ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={actingId === dialog.faq.id}
                      onClick={() => void runFromDialog(() => publishAdminFaq(dialog.faq!.id), "¡Pregunta publicada correctamente!", "Ya está disponible en Preguntas Frecuentes.")}
                    >
                      Publicar
                    </Button>
                  ) : null}
                  {dialog.faq.status !== "HIDDEN" && dialog.faq.status !== "DISCARDED" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={actingId === dialog.faq.id}
                      onClick={() => void runFromDialog(() => hideAdminFaq(dialog.faq!.id), "¡Pregunta ocultada correctamente!", "Ya no aparece en la sección pública.")}
                    >
                      Ocultar
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const current = dialog.faq;
                      if (!current) return;
                      setDialog(null);
                      setPendingDelete(current);
                    }}
                  >
                    Eliminar
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}

      <KeyConfirmDialog
        open={Boolean(pendingDelete)}
        title="¿Deseas eliminar esta pregunta?"
        description="Esta acción eliminará la pregunta del sistema y no se podrá deshacer."
        confirmLabel="Eliminar pregunta"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />

      <SuccessConfirm
        open={Boolean(confirm)}
        className="faq-admin-sent"
        showIcon={false}
        title={confirm?.title ?? ""}
        text={confirm?.text ?? ""}
        actionLabel="Entendido"
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
