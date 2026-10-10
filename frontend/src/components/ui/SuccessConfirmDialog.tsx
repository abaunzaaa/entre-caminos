import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePageScrollLock } from "../../hooks/usePageScrollLock";
import { X } from "lucide-react";
import "../../styles/contact-modal.css";

type SuccessConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  closeLabel?: string;
  initialFocus?: "action" | "close";
  className?: string;
};

export function SuccessConfirmDialog({
  open,
  onClose,
  icon,
  title,
  description,
  actionLabel = "Entendido",
  closeLabel = "Cerrar",
  initialFocus = "close",
  className,
}: SuccessConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = `${titleId}-copy`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);

  usePageScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTarget = initialFocus === "action" ? actionRef : closeRef;
    focusTarget.current?.focus();

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
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose, initialFocus]);

  if (!open) {
    return null;
  }

  const overlayClass = ["contact-success", className].filter(Boolean).join(" ");

  return createPortal(
    <div className={overlayClass} role="presentation" onClick={onClose}>
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
          ref={closeRef}
          type="button"
          className="contact-success__close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X strokeWidth={1.5} aria-hidden="true" />
        </button>
        <div className="contact-success__media" aria-hidden="true">
          {icon}
        </div>
        <h2 id={titleId} className="contact-success__title">
          {title}
        </h2>
        <p id={descriptionId} className="contact-success__text">
          {description}
        </p>
        <button
          ref={actionRef}
          type="button"
          className="contact-success__action admin-cta"
          onClick={onClose}
        >
          {actionLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
