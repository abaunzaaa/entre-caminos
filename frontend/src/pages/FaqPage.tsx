import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { FAQ_HERO_IMAGE } from "../assets/faq-assets";
import logo from "../assets/logo.png";
import { ExplorerUserFooter } from "../components/explorer/ExplorerUserFooter";
import { LandingFooter } from "../components/landing/LandingFooter";
import { Pager } from "../components/ui/Pager";
import { useAuth } from "../hooks/useAuth";
import {
  FAQ_QUESTION_MAX,
  FAQ_QUESTION_MIN,
  FAQ_SUBJECT_MAX,
  FAQ_SUBJECT_MIN,
  getPublicFaqs,
  submitFaq,
} from "../services/faq.service";
import type { PublicFaq } from "../types";
import { getApiErrorCode, getApiErrorMessage } from "../utils/api-error";
import { formatPersonName } from "../utils/person-name";
import "../styles/faq.css";
import "../styles/explorer.css";

const PAGE_SIZE = 6;

type FieldErrors = { subject?: string; question?: string };
type Notice = { kind: "success" | "error" | "login"; text: string };

function validateAsk(subject: string, question: string): FieldErrors {
  const errors: FieldErrors = {};
  const cleanSubject = subject.trim();
  const cleanQuestion = question.trim();
  if (!cleanSubject) {
    errors.subject = "Cuéntanos el asunto de tu pregunta.";
  } else if (cleanSubject.length < FAQ_SUBJECT_MIN) {
    errors.subject = "El asunto debe tener al menos 3 caracteres.";
  } else if (cleanSubject.length > FAQ_SUBJECT_MAX) {
    errors.subject = "El asunto es demasiado largo.";
  }
  if (!cleanQuestion) {
    errors.question = "Escribe tu pregunta.";
  } else if (cleanQuestion.length < FAQ_QUESTION_MIN) {
    errors.question = "La pregunta debe tener al menos 10 caracteres.";
  } else if (cleanQuestion.length > FAQ_QUESTION_MAX) {
    errors.question = "La pregunta es demasiado larga.";
  }
  return errors;
}

export function FaqPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [faqs, setFaqs] = useState<PublicFaq[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [listPhase, setListPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setRefreshing(listPhase === "ready");
    getPublicFaqs({ q: debouncedQuery, page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setFaqs(data.faqs);
        setPageCount(data.pageCount);
        if (data.page !== page) setPage(data.page);
        setListError("");
        setListPhase("ready");
        setOpenId(null);
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
  }, [debouncedQuery, page, reloadKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || authLoading) return;
    const errors = validateAsk(subject, question);
    setFieldErrors(errors);
    if (errors.subject || errors.question) {
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
      await submitFaq({ subject: subject.trim(), question: question.trim() });
      setSubject("");
      setQuestion("");
      setFieldErrors({});
      setNotice({
        kind: "success",
        text: "Tu pregunta fue enviada correctamente. La revisaremos pronto.",
      });
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

  const searching = debouncedQuery.length > 0;

  return (
    <div className="faq-page">
      <header className="faq-top">
        <Link to="/" className="faq-top__brand">
          <img src={logo} alt="" />
          <span>Entre Caminos</span>
        </Link>
        <nav className="faq-top__nav" aria-label="Principal">
          <Link to="/">Inicio</Link>
          {authLoading ? null : user ? (
            <Link to={isAdmin ? "/admin" : "/explorar"}>{isAdmin ? "Panel" : formatPersonName(user.name) || user.name}</Link>
          ) : (
            <>
              <Link to="/login">Acceder</Link>
              <Link to="/register">Registrarte</Link>
            </>
          )}
        </nav>
      </header>

      <main className="faq-main">
        <div className="faq-layout">
          <div className="faq-col faq-col--visual">
            <figure className="faq-hero">
              <img src={FAQ_HERO_IMAGE} alt="Mesa servida entre el campo, al atardecer" />
            </figure>
            <section className="faq-ask" aria-labelledby="faq-ask-title">
              <h2 id="faq-ask-title" className="faq-ask__title">
                ¿Tienes una pregunta?
              </h2>
              <p className="faq-ask__lead">Cuéntanos, estaremos felices de ayudarte.</p>
              {user ? <p className="faq-ask__note">La revisaremos antes de publicarla.</p> : null}
              <form className="faq-ask__form" onSubmit={onSubmit} noValidate>
                <label className="faq-field">
                  <span>Asunto</span>
                  <input
                    value={subject}
                    maxLength={FAQ_SUBJECT_MAX}
                    aria-invalid={Boolean(fieldErrors.subject)}
                    onChange={(event) => {
                      setSubject(event.target.value);
                      if (fieldErrors.subject) setFieldErrors((current) => ({ ...current, subject: undefined }));
                    }}
                  />
                  {fieldErrors.subject ? <p className="faq-field__error">{fieldErrors.subject}</p> : null}
                </label>
                <label className="faq-field">
                  <span>Tu pregunta</span>
                  <textarea
                    value={question}
                    maxLength={FAQ_QUESTION_MAX}
                    aria-invalid={Boolean(fieldErrors.question)}
                    onChange={(event) => {
                      setQuestion(event.target.value);
                      if (fieldErrors.question) setFieldErrors((current) => ({ ...current, question: undefined }));
                    }}
                  />
                  {fieldErrors.question ? <p className="faq-field__error">{fieldErrors.question}</p> : null}
                </label>
                {notice ? (
                  <p className={`faq-notice faq-notice--${notice.kind}`} role="status">
                    {notice.text}{" "}
                    {notice.kind === "login" ? <Link to="/login">Iniciar sesión</Link> : null}
                  </p>
                ) : null}
                <button type="submit" className="admin-cta faq-ask__submit" disabled={sending || authLoading}>
                  {sending ? "Enviando…" : "Enviar pregunta"}
                </button>
              </form>
            </section>
          </div>

          <div className="faq-col faq-col--copy">
            <header className="faq-heading">
              <h1 className="faq-heading__title">Preguntas frecuentes</h1>
              <p className="faq-heading__lead">Resolvemos las dudas más comunes para acompañarte mejor en tu camino.</p>
            </header>
            <section className="faq-list" aria-labelledby="faq-list-title">
              <h2 id="faq-list-title" className="sr-only">
                Listado de preguntas
              </h2>
              <div className="faq-list__panel">
                <form
                  className="faq-search"
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setDebouncedQuery(query.trim());
                    setPage(1);
                  }}
                >
                  <input
                    type="search"
                    value={query}
                    placeholder="Buscar una pregunta"
                    aria-label="Buscar una pregunta"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button type="submit" aria-label="Buscar">
                    <Search size={18} strokeWidth={1.75} />
                  </button>
                </form>

                {listPhase === "loading" ? <p className="faq-list__status">Cargando preguntas…</p> : null}
                {listPhase === "error" ? (
                  <div>
                    <p className="faq-list__status">{listError}</p>
                    <button type="button" className="admin-cta faq-list__retry" onClick={() => setReloadKey((value) => value + 1)}>
                      Intentar de nuevo
                    </button>
                  </div>
                ) : null}
                {listPhase === "ready" && faqs.length === 0 ? (
                  <p className="faq-list__empty">
                    {searching
                      ? "No encontramos preguntas con esa búsqueda."
                      : "Aún no hay preguntas publicadas. Si tienes una duda, cuéntanos."}
                  </p>
                ) : null}
                {listPhase === "ready" && faqs.length > 0 ? (
                  <ul className={`faq-items${refreshing ? " is-refreshing" : ""}`}>
                    {faqs.map((faq) => {
                      const open = openId === faq.id;
                      return (
                        <li key={faq.id} className={`faq-item${open ? " is-open" : ""}`}>
                          <p className="faq-item__subject">{faq.subject}</p>
                          <button
                            type="button"
                            className="faq-item__trigger"
                            aria-expanded={open}
                            onClick={() => setOpenId(open ? null : faq.id)}
                          >
                            <span>{faq.question}</span>
                            <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
                          </button>
                          <div className="faq-item__panel">
                            <div className="faq-item__panel-inner">
                              <p className="faq-item__answer">{faq.answer}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {listPhase === "ready" && pageCount > 1 ? (
                  <Pager page={page} pageCount={pageCount} onPageChange={setPage} label="Paginación de preguntas frecuentes" disabled={refreshing} />
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </main>
      {authLoading ? null : user ? <ExplorerUserFooter /> : <LandingFooter />}
    </div>
  );
}
