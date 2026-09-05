import { FormEvent, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import contactoImg from "../../assets/contacto.png";
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

type DiscoverForm = {
  email: string;
  reason: string;
};

type AllyForm = {
  company: string;
  email: string;
  type: string;
};

const emptyDiscover: DiscoverForm = { email: "", reason: "" };
const emptyAlly: AllyForm = { company: "", email: "", type: "" };

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
  const [intent, setIntent] = useState<ContactIntent>("discover");
  const [discover, setDiscover] = useState(emptyDiscover);
  const [ally, setAlly] = useState(emptyAlly);
  const [discoverErrors, setDiscoverErrors] = useState<Partial<DiscoverForm>>({});
  const [allyErrors, setAllyErrors] = useState<Partial<AllyForm>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector(".contact-modal__select.is-open")) return;
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
    setSubmitted(false);
  }, [open]);

  if (!open) return null;

  const submitDiscover = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<DiscoverForm> = {};
    if (!discover.email.trim()) errors.email = "Ingresa tu correo electrónico";
    else if (!emailPattern.test(discover.email.trim())) errors.email = "Ingresa un correo válido";
    if (!discover.reason) errors.reason = "Selecciona un motivo de contacto";
    setDiscoverErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitted(true);
  };

  const submitAlly = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<AllyForm> = {};
    if (!ally.company.trim()) errors.company = "Ingresa el nombre de la empresa o experiencia";
    if (!ally.email.trim()) errors.email = "Ingresa tu correo electrónico";
    else if (!emailPattern.test(ally.email.trim())) errors.email = "Ingresa un correo válido";
    if (!ally.type) errors.type = "Selecciona el tipo de experiencia";
    setAllyErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitted(true);
  };

  return (
    <div className="contact-modal" role="presentation" onClick={onClose}>
      <div
        className="contact-modal__dialog"
        role="dialog"
        aria-modal="true"
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
            HABLEMOS DE NUEVAS EXPERIENCIAS
          </h2>
          <p className="contact-modal__lead">
            Ya sea que quieras descubrir nuevos planes o hacer parte de Entre Caminos como aliado,
            estamos aquí para escucharte.
          </p>

          {submitted ? (
            <p className="contact-modal__thanks">
              Gracias por escribirnos. Pronto estaremos en contacto contigo.
            </p>
          ) : (
            <>
              <div className="contact-modal__options">
                <button
                  type="button"
                  className={`contact-modal__option${intent === "discover" ? " is-active" : ""}`}
                  onClick={() => setIntent("discover")}
                  aria-pressed={intent === "discover"}
                >
                  <span className="contact-modal__option-title">Quiero descubrir experiencias</span>
                  <span className="contact-modal__option-text">
                    Encuentra nuevos lugares y planes que se adapten a tus gustos.
                  </span>
                </button>
                <button
                  type="button"
                  className={`contact-modal__option${intent === "ally" ? " is-active" : ""}`}
                  onClick={() => setIntent("ally")}
                  aria-pressed={intent === "ally"}
                >
                  <span className="contact-modal__option-title">Quiero ser aliado</span>
                  <span className="contact-modal__option-text">
                    Comparte tu experiencia y haz parte de Entre Caminos.
                  </span>
                </button>
              </div>

              {intent === "discover" ? (
                <form className="contact-modal__fields" onSubmit={submitDiscover} noValidate>
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
                    <span>Motivo de contacto</span>
                    <ContactSelect
                      value={discover.reason}
                      options={discoverReasons}
                      onChange={(reason) => setDiscover({ ...discover, reason })}
                    />
                    {discoverErrors.reason ? <em>{discoverErrors.reason}</em> : null}
                  </label>
                  <button type="submit" className="contact-modal__submit">
                    Enviar solicitud
                  </button>
                </form>
              ) : (
                <form className="contact-modal__fields" onSubmit={submitAlly} noValidate>
                  <label className="contact-modal__field">
                    <span>Nombre de la empresa o experiencia</span>
                    <input
                      type="text"
                      name="company"
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
                  <label className="contact-modal__field">
                    <span>Tipo de experiencia</span>
                    <ContactSelect
                      value={ally.type}
                      options={allyTypes}
                      onChange={(type) => setAlly({ ...ally, type })}
                    />
                    {allyErrors.type ? <em>{allyErrors.type}</em> : null}
                  </label>
                  <button type="submit" className="contact-modal__submit">
                    Quiero ser aliado
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <aside className="contact-modal__visual" aria-hidden="true">
          <img src={contactoImg} alt="" />
        </aside>
      </div>
    </div>
  );
}
