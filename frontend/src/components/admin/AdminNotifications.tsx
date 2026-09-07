import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notifications.service";
import type { AdminNotification } from "../../types";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AdminNotifications() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    try {
      const data = await getNotifications();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      /* keep last known list */
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function openItem(item: AdminNotification) {
    if (!item.readAt) {
      try {
        const updated = await markNotificationRead(item.id);
        setItems((current) => current.map((row) => (row.id === updated.id ? updated : row)));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        /* still navigate */
      }
    }
    setOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  }

  async function markAll() {
    await markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  return (
    <div className="admin-notify" ref={rootRef}>
      <button
        type="button"
        className="admin-topbar__icon-btn"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) {
            void load();
          }
        }}
      >
        <Bell size={18} strokeWidth={1.7} />
        {unreadCount > 0 ? (
          <span className="admin-notify__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        ) : null}
      </button>
      <div
        className={`admin-notify__panel${open ? " is-open" : ""}`}
        role="dialog"
        aria-label="Notificaciones"
        aria-hidden={!open}
      >
        <div className="admin-notify__head">
          <p>Notificaciones</p>
          {unreadCount > 0 ? (
            <button type="button" onClick={() => void markAll()}>
              Marcar leídas
            </button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="admin-notify__empty">No tienes notificaciones por ahora.</p>
        ) : (
          <ul className="admin-notify__list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`admin-notify__item${item.readAt ? "" : " is-unread"}`}
                  onClick={() => void openItem(item)}
                >
                  <span className="admin-notify__title">{item.title}</span>
                  <span className="admin-notify__body">{item.body}</span>
                  <span className="admin-notify__time">{formatWhen(item.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
