import { useEffect, useState } from "react";
import { Check, Heart } from "lucide-react";
import { onFavoriteToast } from "../../services/favorites-sync";

type ToastState = {
  id: number;
  message: string;
} | null;

export function FavoriteToast() {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    return onFavoriteToast((message) => {
      setToast({ id: Date.now(), message });
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

  return (
    <div className="favorite-toast" role="status" aria-live="polite" key={toast.id}>
      <span className="favorite-toast__icon" aria-hidden="true">
        {removed ? <Check size={14} strokeWidth={2.2} /> : <Heart size={14} strokeWidth={2} fill="currentColor" />}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}
