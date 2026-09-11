import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import bannerCategoria from "../../assets/banner_categoria.png";
import bannerExperiencia from "../../assets/banner_experiencia.png";
import "../../styles/contact-modal.css";

const SUCCESS_BANNERS = {
  category: bannerCategoria,
  experience: bannerExperiencia,
} as const;

export function SuccessConfirm({
  open,
  title,
  text,
  variant,
  actionLabel = "Continuar",
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  variant: keyof typeof SUCCESS_BANNERS;
  actionLabel?: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const icon = SUCCESS_BANNERS[variant];

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!focusable.length) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="contact-success" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="contact-success__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-copy`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="contact-success__close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X strokeWidth={1.5} aria-hidden="true" />
        </button>
        <img
          src={icon}
          alt=""
          className={`contact-success__icon contact-success__icon--${variant}`}
          aria-hidden="true"
        />
        <h2 id={titleId} className="contact-success__title">
          {title}
        </h2>
        <p id={`${titleId}-copy`} className="contact-success__text">
          {text}
        </p>
        <button type="button" className="contact-success__action admin-cta" onClick={onClose}>
          {actionLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
