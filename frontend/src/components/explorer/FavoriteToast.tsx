import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CircleAlert, Heart } from "lucide-react";
import { onFavoriteToast, onFavoriteToastDismiss } from "../../services/favorites-sync";

type ToastState = {
  id: number;
  message: string;
  tone: "ok" | "error";
} | null;

export function FavoriteToast() {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    return onFavoriteToast((message, tone) => {
      setToast({ id: Date.now(), message, tone: tone ?? "ok" });
    });
  }, []);

  useEffect(() => {
    return onFavoriteToastDismiss((message) => {
      setToast((current) => {
        if (!current) {
          return current;
        }
        if (message && current.message !== message) {
          return current;
        }
        return null;
      });
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) {
    return null;
  }

  const removed = toast.message.toLowerCase().includes("eliminado");

  return createPortal(
    <div className={`favorite-toast${toast.tone === "error" ? " is-error" : ""}`} role="status" aria-live="polite" key={toast.id}>
      <span className="favorite-toast__icon" aria-hidden="true">
        {toast.tone === "error" ? (
          <CircleAlert size={14} strokeWidth={2.2} />
        ) : removed ? (
          <Check size={14} strokeWidth={2.2} />
        ) : (
          <Heart size={14} strokeWidth={2} fill="currentColor" />
        )}
      </span>
      <span>{toast.message}</span>
    </div>,
    document.body,
  );
}
