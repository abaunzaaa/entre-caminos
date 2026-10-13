import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { usePageScrollLock } from "../../hooks/usePageScrollLock";
import { X } from "lucide-react";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import "../../styles/auth-recovery-modal.css";
import "../../styles/contact-modal.css";

type KeyConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  /** If false, only shows the cancel/close action (info dialog). */
  showConfirm?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirmación emergente con la llave de Entre Caminos. */
export function KeyConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  busy = false,
  showConfirm = true,
  onCancel,
  onConfirm,
}: KeyConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = `${titleId}-copy`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  usePageScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.stopImmediatePropagation();
        onCancel();
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
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onCancel, busy]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="contact-success contact-success--subtle"
      role="presentation"
      onClick={() => {
        if (!busy) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="contact-success__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="contact-success__close"
          aria-label="Cerrar"
          disabled={busy}
          onClick={onCancel}
        >
          <X strokeWidth={1.5} aria-hidden="true" />
        </button>
        <div className="contact-success__media" aria-hidden="true">
          <AuthKeyIcon className="auth-reset-success__mark" />
        </div>
        <h2 id={titleId} className="contact-success__title">
          {title}
        </h2>
        <p id={descriptionId} className="contact-success__text">
          {description}
        </p>
        <div className="contact-success__actions">
          <button
            ref={cancelRef}
            type="button"
            className={showConfirm ? "contact-success__cancel" : "contact-success__action admin-cta"}
            disabled={busy}
            onClick={onCancel}
          >
            {showConfirm ? cancelLabel : "Entendido"}
          </button>
          {showConfirm ? (
            <button
              type="button"
              className="contact-success__action admin-cta"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Eliminando…" : confirmLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
