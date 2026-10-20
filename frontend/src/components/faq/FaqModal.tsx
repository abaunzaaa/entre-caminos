import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { SuccessConfirm } from "../feedback/SuccessConfirm";
import { FAQ_HERO_IMAGE } from "../../assets/faq-assets";
import { useAuth } from "../../hooks/useAuth";
import { usePageScrollLock } from "../../hooks/usePageScrollLock";
import { FAQ_QUESTION_MAX, FAQ_QUESTION_MIN, getMyFaqAnswer, getPublicFaqs, submitFaq } from "../../services/faq.service";
import type { FaqCategory, PublicFaq } from "../../types";
import { getApiErrorCode, getApiErrorMessage } from "../../utils/api-error";
import "../../styles/faq.css";

const PAGE_SIZE = 5;
const DRAFT_KEY = "ec-faq-draft";

type Notice = { kind: "success" | "error" | "login"; text: string };

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { question?: unknown };
    return typeof parsed.question === "string" ? parsed.question : "";
  } catch {
    return "";
  }
}

function validateQuestion(question: string) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return "Escribe tu pregunta.";
  if (cleanQuestion.length < FAQ_QUESTION_MIN) return "La pregunta debe tener al menos 10 caracteres.";
  if (cleanQuestion.length > FAQ_QUESTION_MAX) return "La pregunta es demasiado larga.";
  return "";
}

export function FaqModal({
  open,
  onClose,
  focusId = null,
}: {
  open: boolean;
  onClose: () => void;
  focusId?: string | null;
}) {
  const { user, loading: authLoading } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [question, setQuestion] = useState(readDraft);
  const [questionError, setQuestionError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [faqs, setFaqs] = useState<PublicFaq[]>([]);
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [listPhase, setListPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [askOpen, setAskOpen] = useState(false);
  const [highlight, setHighlight] = useState<PublicFaq | null>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);

  usePageScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (sent) return;
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const nodes = [...dialog.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select")].filter(
        (node) => !node.hasAttribute("disabled"),
      );
      if (nodes.length === 0) return;
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
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, sent]);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ question }));
  }, [question]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
    setOpenId(focusId);
  }, [debouncedQuery, category, focusId]);

  useEffect(() => {
    if (!open || !focusId) {
      setHighlight(null);
      return;
    }
    let cancelled = false;
    setQuery("");
    setCategory("");
    setPage(1);
    setAskOpen(false);
    setNotice(null);
    getMyFaqAnswer(focusId)
      .then((faq) => {
        if (cancelled) return;
        setHighlight({
          id: faq.id,
          subject: "",
          question: faq.question,
          answer: faq.answer,
          publishedAt: faq.answeredAt,
          category: null,
        });
        setOpenId(faq.id);
      })
      .catch((error) => {
        if (cancelled) return;
        setHighlight(null);
        setNotice({ kind: "error", text: getApiErrorMessage(error, "No pudimos abrir tu pregunta.") });
      });
    return () => {
      cancelled = true;
    };
  }, [open, focusId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRefreshing(listPhase === "ready");
    getPublicFaqs({ q: debouncedQuery, category: category || undefined, page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setFaqs(data.faqs);
        setCategories(data.categories ?? []);
        setPageCount(data.pageCount);
        if (data.page !== page) setPage(data.page);
        setListError("");
        setListPhase("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setListError(getApiErrorMessage(error, "No pudimos cargar las preguntas. Inténtalo de nuevo."));
        setListPhase("error");
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, category, page, reloadKey]);

  function toggleAsk() {
    setAskOpen((current) => {
      const next = !current;
      if (next) window.setTimeout(() => questionRef.current?.focus(), 180);
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || authLoading) return;
    const problem = validateQuestion(question);
    setQuestionError(problem);
    if (problem) {
      setNotice(null);
      return;
    }
    if (!user) {
      setNotice({ kind: "login", text: "Inicia sesión para enviarnos tu pregunta." });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      await submitFaq({ question: question.trim() });
      setQuestion("");
      setQuestionError("");
      sessionStorage.removeItem(DRAFT_KEY);
      setAskOpen(false);
      setNotice(null);
      setSent(true);
    } catch (error) {
      if (getApiErrorCode(error) === "UNAUTHORIZED") {
        setNotice({ kind: "login", text: "Inicia sesión para enviarnos tu pregunta." });
      } else {
        setNotice({
          kind: "error",
          text: getApiErrorMessage(error, "No pudimos enviar tu pregunta. Inténtalo de nuevo."),
        });
      }
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!open || !focusId || openId !== focusId) return;
    const node = dialogRef.current?.querySelector<HTMLElement>(`[data-faq-id="${focusId}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, focusId, openId, faqs, highlight]);

  if (!open) return null;

  const shownFaqs = highlight && !faqs.some((item) => item.id === highlight.id) ? [highlight, ...faqs] : faqs;

  const searching = debouncedQuery.length > 0;
  const filtering = category.length > 0;
  const emptyCopy = searching || filtering
    ? "No encontramos preguntas con esa búsqueda."
    : "Aún no hay preguntas publicadas. Si tienes una duda, cuéntanos.";

  return createPortal(
    <div
      className="faq-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="faq-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-modal-title"
      >
        <div className="faq-modal__col faq-modal__col--visual">
          <h1 id="faq-modal-title" className="faq-modal__sr">
            Preguntas frecuentes
          </h1>
          <figure className="faq-modal__hero">
            <img src={FAQ_HERO_IMAGE} alt="Preguntas frecuentes: mesa servida entre el campo, al atardecer" />
          </figure>
        </div>

        <div className="faq-modal__col faq-modal__col--list">
          <div className="faq-modal__sheet">
          <div className="faq-modal__toolbar">
          <form
            className="faq-modal__search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setDebouncedQuery(query.trim());
              setPage(1);
            }}
          >
            <Search size={16} strokeWidth={1.75} aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="¿Qué quieres saber?"
              aria-label="¿Qué quieres saber?"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type="button" className="faq-modal__clear" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}>
                <X size={15} strokeWidth={1.75} />
              </button>
            ) : null}
          </form>
          <button ref={closeRef} type="button" className="faq-modal__close" aria-label="Cerrar" data-faq-close onClick={onClose}>
            <X size={16} strokeWidth={1.75} />
          </button>
          </div>

          <div className="faq-modal__chips" role="toolbar" aria-label="Categorías">
            <button
              type="button"
              className={`faq-modal__chip${category === "" ? " is-selected" : ""}`}
              aria-pressed={category === ""}
              onClick={() => setCategory("")}
            >
              Todas
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`faq-modal__chip${category === item.slug ? " is-selected" : ""}`}
                aria-pressed={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="faq-modal__list-body">
          {listPhase === "loading" ? <p className="faq-modal__status">Cargando preguntas…</p> : null}
          {listPhase === "error" ? (
            <div>
              <p className="faq-modal__status">{listError}</p>
              <button type="button" className="faq-modal__submit faq-modal__retry" onClick={() => setReloadKey((value) => value + 1)}>
                Intentar de nuevo
              </button>
            </div>
          ) : null}
          {listPhase === "ready" && shownFaqs.length === 0 ? <p className="faq-modal__empty">{emptyCopy}</p> : null}
          {listPhase === "ready" && shownFaqs.length > 0 ? (
            <ul className={`faq-modal__items${refreshing ? " is-refreshing" : ""}`}>
              {shownFaqs.map((faq) => {
                const expanded = openId === faq.id;
                const mine = highlight?.id === faq.id;
                const answeredDate = mine && faq.publishedAt ? new Date(faq.publishedAt) : null;
                const answeredOn = answeredDate && !Number.isNaN(answeredDate.getTime())
                  ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(answeredDate)
                  : "";
                return (
                  <li key={faq.id} data-faq-id={faq.id} className={`faq-modal__item${expanded ? " is-open" : ""}`}>
                    <button
                      type="button"
                      className="faq-modal__trigger"
                      aria-expanded={expanded}
                      onClick={() => setOpenId(expanded ? null : faq.id)}
                    >
                      <span>
                        {mine ? <span className="faq-modal__mine">Tu pregunta</span> : null}
                        {faq.question}
                      </span>
                      <span className="faq-modal__sign" aria-hidden="true" />
                    </button>
                    <div className="faq-modal__panel">
                      <div className="faq-modal__panel-inner">
                        <p className="faq-modal__answer">{faq.answer}</p>
                        {answeredOn ? <p className="faq-modal__mine-date">Respondida el {answeredOn}</p> : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          </div>

          <div className={`faq-modal__ask${askOpen ? " is-open" : ""}`}>
            <div className="faq-modal__invite">
              <div className="faq-modal__invite-copy">
                <p className="faq-modal__invite-title">¿No está tu pregunta? Hazla aquí.</p>
                <p className="faq-modal__invite-lead">Cuéntanosla y la revisaremos con gusto.</p>
              </div>
              {askOpen ? (
                <button type="button" className="faq-modal__ask-close" aria-label="Cerrar formulario" onClick={toggleAsk}>
                  <X size={15} strokeWidth={1.75} />
                </button>
              ) : (
                <button
                  type="button"
                  className="faq-modal__invite-cta"
                  aria-expanded={false}
                  aria-controls="faq-ask-panel"
                  onClick={toggleAsk}
                >
                  Hacer una pregunta
                </button>
              )}
            </div>
            <div id="faq-ask-panel" className="faq-modal__ask-panel" inert={askOpen ? undefined : true}>
              <div className="faq-modal__ask-panel-inner">
                <form className="faq-modal__form" onSubmit={onSubmit} noValidate>
                  <label className="faq-modal__field">
                    <span className="faq-modal__sr">Tu pregunta</span>
                    <textarea
                      ref={questionRef}
                      value={question}
                      maxLength={FAQ_QUESTION_MAX}
                      placeholder="Escribe aquí tu pregunta..."
                      aria-invalid={Boolean(questionError)}
                      onChange={(event) => {
                        setQuestion(event.target.value);
                        if (questionError) setQuestionError("");
                      }}
                    />
                    {questionError ? <p className="faq-modal__error">{questionError}</p> : null}
                  </label>
                  {user ? <p className="faq-modal__note">La revisaremos antes de publicarla.</p> : null}
                  {notice ? (
                    <p className={`faq-modal__notice faq-modal__notice--${notice.kind}`} role="status">
                      {notice.text}{" "}
                      {notice.kind === "login" ? <Link to="/login">Iniciar sesión</Link> : null}
                    </p>
                  ) : null}
                  <button type="submit" className="faq-modal__submit" disabled={sending || authLoading}>
                    {sending ? "Enviando…" : "Enviar pregunta"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {listPhase === "ready" && pageCount > 1 ? (
            <nav className="faq-modal__pager" aria-label="Paginación de preguntas frecuentes">
              <button type="button" aria-label="Página anterior" disabled={refreshing || page <= 1} onClick={() => { setOpenId(null); setPage((current) => current - 1); }}>
                <ChevronLeft size={14} strokeWidth={1.75} />
              </button>
              <span className="faq-modal__pager-label">
                {page} de {pageCount}
              </span>
              <button
                type="button"
                aria-label="Página siguiente"
                disabled={refreshing || page >= pageCount}
                onClick={() => { setOpenId(null); setPage((current) => current + 1); }}
              >
                <ChevronRight size={14} strokeWidth={1.75} />
              </button>
            </nav>
          ) : null}
          </div>
        </div>
      </div>
      <SuccessConfirm
        open={sent}
        className="faq-sent"
        showIcon={false}
        title="¡Tu pregunta se envió correctamente!"
        text="Recibimos tu pregunta y nuestro equipo la revisará. Cuando tengamos una respuesta, recibirás una notificación en Entre Caminos para que puedas consultarla."
        actionLabel="Entendido"
        onClose={() => setSent(false)}
      />
    </div>,
    document.body,
  );
}
