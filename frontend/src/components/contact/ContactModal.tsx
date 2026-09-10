import { FormEvent, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import contactoImg from "../../assets/contacto.png";
import contactSuccessEmailIcon from "../../assets/contact-success-email-no-heart.png";
import { SuccessConfirmDialog } from "../ui/SuccessConfirmDialog";
import { sendContact } from "../../services/contact.service";
import { getApiErrorMessage } from "../../utils/api-error";
import "../../styles/contact-modal.css";

type ContactIntent = "discover" | "ally";

const discoverReasons = [
  "Quiero conocer más experiencias",
  "Necesito ayuda para elegir un plan",
  "Tengo una sugerencia",
  "Otro",
] as const;

const allyTypes = [
  "Turística",
  "Cultural",
  "Artística",
  "Recreativa",
  "Otra",
] as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX = 2000;
const NAME_MAX = 80;
const COMPANY_MAX = 120;

type DiscoverForm = {
  name: string;
  email: string;
  reason: string;
  message: string;
};

type AllyForm = {
  name: string;
  company: string;
  email: string;
  type: string;
  message: string;
};

const emptyDiscover: DiscoverForm = { name: "", email: "", reason: "", message: "" };
const emptyAlly: AllyForm = { name: "", company: "", email: "", type: "", message: "" };

function readFieldDetails(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return [];
  }
  const details = error.response?.data?.error?.details;
  if (!Array.isArray(details)) {
    return [];
  }
  return details.filter(
    (item): item is { field?: string; message?: string } => Boolean(item) && typeof item === "object",
  );
}

function ContactSelect({
  value,
  options,
  placeholder = "Selecciona una opción",
  onChange,
}: {
  value: string;
  options: readonly string[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();

  const placeMenu = () => {
    const trigger = rootRef.current?.querySelector("button");
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const dialog = trigger.closest(".contact-modal__dialog");
    const bounds = (dialog ?? document.documentElement).getBoundingClientRect();
    const gap = 8;
    const inset = 12;
    const preferred = 232;
    const minDown = 96;
    const spaceBelow = bounds.bottom - rect.bottom - inset;
    const spaceAbove = rect.top - bounds.top - inset;
    const shouldOpenUp = spaceBelow < minDown;
    const available = Math.max(96, shouldOpenUp ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(preferred, available);
    const width = Math.min(rect.width, Math.max(160, bounds.width - inset * 2));
    const left = Math.min(Math.max(rect.left, bounds.left + inset), bounds.right - width - inset);

    setOpenUp(shouldOpenUp);
    setMenuStyle({
      position: "fixed",
      left,
      width,
      maxHeight,
      zIndex: 90,
      ...(shouldOpenUp
        ? { bottom: window.innerHeight - rect.top + gap, top: "auto" }
        : { top: rect.bottom + gap, bottom: "auto" }),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(undefined);
      return;
    }
    placeMenu();
    window.addEventListener("resize", placeMenu);
    return () => window.removeEventListener("resize", placeMenu);
  }, [open]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  return (
    <div className={`contact-modal__select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="contact-modal__select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? undefined : "is-placeholder"}>{value || placeholder}</span>
        <svg viewBox="0 0 16 16" aria-hidden>
          <path d="M3.2 5.6 8 10.4l4.8-4.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      {open && menuStyle
        ? createPortal(
            <ul
              ref={menuRef}
              className={`contact-modal__select-menu${openUp ? " is-up" : ""}`}
              role="listbox"
              style={menuStyle}
              onWheel={(event) => event.stopPropagation()}
            >
              {options.map((option) => (
                <li key={option} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option}
                    className={`contact-modal__select-option${value === option ? " is-selected" : ""}`}
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

export function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(open);
  const inFlight = useRef(false);
  const [intent, setIntent] = useState<ContactIntent>("discover");
  const [discover, setDiscover] = useState(emptyDiscover);
  const [ally, setAlly] = useState(emptyAlly);
  const [discoverErrors, setDiscoverErrors] = useState<Partial<DiscoverForm>>({});
  const [allyErrors, setAllyErrors] = useState<Partial<AllyForm>>({});
  const [successOpen, setSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  openRef.current = open;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector(".contact-modal__select.is-open")) return;
      if (document.querySelector(".contact-success")) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    setIntent("discover");
    setDiscover(emptyDiscover);
    setAlly(emptyAlly);
    setDiscoverErrors({});
    setAllyErrors({});
    setSuccessOpen(false);
    setSubmitError("");
    if (!inFlight.current) {
      setLoading(false);
    }
  }, [open]);

  const successWasOpen = useRef(false);

  useEffect(() => {
    if (successWasOpen.current && !successOpen && open) {
      submitRef.current?.focus();
    }
    successWasOpen.current = successOpen;
  }, [successOpen, open]);

  if (!open) return null;

  const resetForm = () => {
    setIntent("discover");
    setDiscover(emptyDiscover);
    setAlly(emptyAlly);
    setDiscoverErrors({});
    setAllyErrors({});
    setSubmitError("");
  };

  const closeSuccess = () => {
    setSuccessOpen(false);
  };

  const chooseIntent = (next: ContactIntent) => {
    if (loading) return;
    setIntent(next);
    setSubmitError("");
  };

  const submitDiscover = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || loading || successOpen) return;

    const errors: Partial<DiscoverForm> = {};
    if (!discover.name.trim()) errors.name = "Ingresa tu nombre";
    if (!discover.email.trim()) errors.email = "Ingresa tu correo electrónico";
    else if (!emailPattern.test(discover.email.trim())) errors.email = "Ingresa un correo válido";
    if (!discover.reason) errors.reason = "Selecciona un motivo de contacto";
    if (!discover.message.trim()) errors.message = "Escribe tus dudas o comentarios";
    else if (discover.message.trim().length > MESSAGE_MAX) errors.message = "El comentario es demasiado largo";
    setDiscoverErrors(errors);
    setSubmitError("");
    if (Object.keys(errors).length) return;

    inFlight.current = true;
    setLoading(true);
    try {
      await sendContact({
        kind: "POSIBLE_USUARIO",
        name: discover.name.trim(),
        email: discover.email.trim(),
        reason: discover.reason,
        message: discover.message.trim(),
      });
      if (!openRef.current) return;
      resetForm();
      setSuccessOpen(true);
    } catch (error) {
      if (!openRef.current) return;
      const details = readFieldDetails(error);
      const nextErrors: Partial<DiscoverForm> = {};
      for (const detail of details) {
        if (detail.field === "name" && detail.message) nextErrors.name = detail.message;
        if (detail.field === "email" && detail.message) nextErrors.email = detail.message;
        if (detail.field === "reason" && detail.message) nextErrors.reason = detail.message;
        if (detail.field === "message" && detail.message) nextErrors.message = detail.message;
      }
      setDiscoverErrors(nextErrors);
      setSubmitError(getApiErrorMessage(error, "No pudimos enviar tu mensaje. Inténtalo de nuevo."));
    } finally {
      inFlight.current = false;
      if (openRef.current) {
        setLoading(false);
      }
    }
  };

  const submitAlly = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || loading || successOpen) return;

    const errors: Partial<AllyForm> = {};
    if (!ally.name.trim()) errors.name = "Ingresa tu nombre";
    if (!ally.company.trim()) errors.company = "Ingresa el nombre de la empresa o experiencia";
    if (!ally.email.trim()) errors.email = "Ingresa tu correo electrónico";
    else if (!emailPattern.test(ally.email.trim())) errors.email = "Ingresa un correo válido";
    if (!ally.type) errors.type = "Selecciona el tipo de experiencia";
    if (!ally.message.trim()) errors.message = "Escribe tu propuesta, duda o comentario";
    else if (ally.message.trim().length > MESSAGE_MAX) errors.message = "El comentario es demasiado largo";
    setAllyErrors(errors);
    setSubmitError("");
    if (Object.keys(errors).length) return;

    inFlight.current = true;
    setLoading(true);
    try {
      await sendContact({
        kind: "ALIADO",
        name: ally.name.trim(),
        email: ally.email.trim(),
        company: ally.company.trim(),
        allyType: ally.type,
        message: ally.message.trim(),
      });
      if (!openRef.current) return;
      resetForm();
      setSuccessOpen(true);
    } catch (error) {
      if (!openRef.current) return;
      const details = readFieldDetails(error);
      const nextErrors: Partial<AllyForm> = {};
      for (const detail of details) {
        if (detail.field === "name" && detail.message) nextErrors.name = detail.message;
        if (detail.field === "company" && detail.message) nextErrors.company = detail.message;
        if (detail.field === "email" && detail.message) nextErrors.email = detail.message;
        if ((detail.field === "allyType" || detail.field === "type") && detail.message) nextErrors.type = detail.message;
        if (detail.field === "message" && detail.message) nextErrors.message = detail.message;
      }
      setAllyErrors(nextErrors);
      setSubmitError(getApiErrorMessage(error, "No pudimos enviar tu mensaje. Inténtalo de nuevo."));
    } finally {
      inFlight.current = false;
      if (openRef.current) {
        setLoading(false);
      }
    }
  };

  return (
    <>
    <div className="contact-modal" role="presentation" aria-hidden={successOpen} inert={successOpen} onClick={onClose}>
      <div
        className="contact-modal__dialog"
        role="dialog"
        aria-modal={!successOpen}
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="contact-modal__close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>

        <div className="contact-modal__form-pane">
          <p className="contact-modal__kicker">¿Quieres conectar?</p>
          <h2 id={titleId} className="contact-modal__title">
            {intent === "ally" ? "HABLEMOS DE NUEVAS ALIANZAS" : "HABLEMOS DE NUEVAS EXPERIENCIAS"}
          </h2>

              <div className="contact-modal__options">
                <button
                  type="button"
                  className={`contact-modal__option${intent === "discover" ? " is-active" : ""}`}
                  onClick={() => chooseIntent("discover")}
                  aria-pressed={intent === "discover"}
                >
                  <span className="contact-modal__option-title">Quiero ser usuario</span>
                </button>
                <button
                  type="button"
                  className={`contact-modal__option${intent === "ally" ? " is-active" : ""}`}
                  onClick={() => chooseIntent("ally")}
                  aria-pressed={intent === "ally"}
                >
                  <span className="contact-modal__option-title">Quiero ser aliado</span>
                </button>
              </div>

              {intent === "discover" ? (
                <form className="contact-modal__fields" onSubmit={(event) => void submitDiscover(event)} noValidate aria-busy={loading}>
                  <div className="contact-modal__row">
                    <label className="contact-modal__field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        maxLength={NAME_MAX}
                        value={discover.name}
                        onChange={(event) => setDiscover({ ...discover, name: event.target.value })}
                      />
                      {discoverErrors.name ? <em>{discoverErrors.name}</em> : null}
                    </label>
                    <label className="contact-modal__field">
                      <span>Motivo de contacto</span>
                      <ContactSelect
                        value={discover.reason}
                        options={discoverReasons}
                        onChange={(reason) => setDiscover({ ...discover, reason })}
                      />
                      {discoverErrors.reason ? <em>{discoverErrors.reason}</em> : null}
                    </label>
                  </div>
                  <label className="contact-modal__field">
                    <span>Correo electrónico</span>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={discover.email}
                      onChange={(event) => setDiscover({ ...discover, email: event.target.value })}
                    />
                    {discoverErrors.email ? <em>{discoverErrors.email}</em> : null}
                  </label>
                  <label className="contact-modal__field">
                    <span>Dudas o comentarios</span>
                    <textarea
                      name="message"
                      rows={4}
                      maxLength={MESSAGE_MAX}
                      value={discover.message}
                      onChange={(event) => setDiscover({ ...discover, message: event.target.value })}
                    />
                    {discoverErrors.message ? <em>{discoverErrors.message}</em> : null}
                  </label>
                  {submitError ? <em role="alert">{submitError}</em> : null}
                  <button ref={submitRef} type="submit" className="contact-modal__submit admin-cta" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar"}
                  </button>
                </form>
              ) : (
                <form className="contact-modal__fields" onSubmit={(event) => void submitAlly(event)} noValidate aria-busy={loading}>
                  <div className="contact-modal__row">
                    <label className="contact-modal__field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        name="ally-name"
                        autoComplete="name"
                        maxLength={NAME_MAX}
                        value={ally.name}
                        onChange={(event) => setAlly({ ...ally, name: event.target.value })}
                      />
                      {allyErrors.name ? <em>{allyErrors.name}</em> : null}
                    </label>
                    <label className="contact-modal__field">
                      <span>Tipo de experiencia</span>
                      <ContactSelect
                        value={ally.type}
                        options={allyTypes}
                        onChange={(type) => setAlly({ ...ally, type })}
                      />
                      {allyErrors.type ? <em>{allyErrors.type}</em> : null}
                    </label>
                  </div>
                  <div className="contact-modal__row">
                    <label className="contact-modal__field">
                      <span>Nombre de la empresa o experiencia</span>
                      <input
                        type="text"
                        name="company"
                        maxLength={COMPANY_MAX}
                        value={ally.company}
                        onChange={(event) => setAlly({ ...ally, company: event.target.value })}
                      />
                      {allyErrors.company ? <em>{allyErrors.company}</em> : null}
                    </label>
                    <label className="contact-modal__field">
                      <span>Correo electrónico</span>
                      <input
                        type="email"
                        name="ally-email"
                        autoComplete="email"
                        value={ally.email}
                        onChange={(event) => setAlly({ ...ally, email: event.target.value })}
                      />
                      {allyErrors.email ? <em>{allyErrors.email}</em> : null}
                    </label>
                  </div>
                  <label className="contact-modal__field">
                    <span>Propuesta o comentario</span>
                    <textarea
                      name="ally-message"
                      rows={4}
                      maxLength={MESSAGE_MAX}
                      value={ally.message}
                      onChange={(event) => setAlly({ ...ally, message: event.target.value })}
                    />
                    {allyErrors.message ? <em>{allyErrors.message}</em> : null}
                  </label>
                  {submitError ? <em role="alert">{submitError}</em> : null}
                  <button ref={submitRef} type="submit" className="contact-modal__submit admin-cta" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar"}
                  </button>
                </form>
              )}
        </div>

        <aside className="contact-modal__visual" aria-hidden="true">
          <img src={contactoImg} alt="" />
        </aside>
      </div>
    </div>
    <SuccessConfirmDialog
      open={successOpen}
      onClose={closeSuccess}
      title="¡Mensaje enviado!"
      description="Hemos recibido tu mensaje correctamente. Pronto nos pondremos en contacto contigo."
      actionLabel="Entendido"
      closeLabel="Cerrar"
      initialFocus="close"
      icon={
        <img
          src={contactSuccessEmailIcon}
          alt=""
          className="contact-success__icon"
        />
      }
    />
    </>
  );
}
