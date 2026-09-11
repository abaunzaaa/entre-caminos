import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Compass, Trash2, X } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notifications.service";
import type { AdminNotification } from "../../types";

const META_LABELS = new Set(["administrador", "estado", "motivo"]);
const DISMISSED_KEY = "entre-caminos.admin-notify.dismissed";

function parseNotificationBody(body: string) {
  const rawLines = body.split("\n").map((line) => line.trim());
  const fields: Array<{ label: string; value: string }> = [];
  const prose: string[] = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    if (!line) continue;
    const match = line.match(/^([^:]{2,24}):\s*(.*)$/);
    if (match && META_LABELS.has(match[1].toLowerCase())) {
      let value = match[2].trim();
      if (!value) {
        while (i + 1 < rawLines.length && !rawLines[i + 1].trim()) i += 1;
        if (i + 1 < rawLines.length) {
          i += 1;
          value = rawLines[i].trim();
        }
      }
      fields.push({
        label: match[1],
        value: value.replace(/^["“]|["”]$/g, ""),
      });
      continue;
    }
    prose.push(line);
  }

  let lead = prose.join(" ").replace(/\s+/g, " ").trim();
  let highlight = "";
  const quoted = lead.match(/[«"“]([^"”»]+)[»"”]/);
  if (quoted) {
    highlight = quoted[1];
    lead = lead.replace(quoted[0], "").replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();
  } else {
    const split = lead.match(/^(.+?):\s*(.+)$/);
    if (split) {
      lead = split[1].trim();
      highlight = split[2].replace(/\.$/, "").trim();
    }
  }

  return { highlight, lead, fields };
}

function fieldValue(fields: Array<{ label: string; value: string }>, label: string) {
  return fields.find((field) => field.label.toLowerCase() === label)?.value ?? "";
}

function notificationPreview(body: string) {
  const parsed = parseNotificationBody(body);
  const admin = fieldValue(parsed.fields, "administrador");
  return {
    name: parsed.highlight,
    sender: admin ? `Enviada por ${admin}` : "",
  };
}

function readDismissed() {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function writeDismissed(ids: Set<string>) {
  window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "EXPERIENCE_APPROVED" || type === "CATEGORY_APPROVED") {
    return <Check size={14} strokeWidth={1.8} />;
  }
  if (type === "EXPERIENCE_REJECTED" || type === "CATEGORY_REJECTED") {
    return <X size={14} strokeWidth={1.8} />;
  }
  return <Compass size={14} strokeWidth={1.7} />;
}

function NotificationDetails({ type, body }: { type: string; body: string }) {
  if (type === "CATEGORY_PENDING" || type === "CATEGORY_REJECTED") {
    return <span className="admin-notify__body">{body}</span>;
  }
  const preview = notificationPreview(body);
  if (!preview.name && !preview.sender) {
    return <span className="admin-notify__body">{body}</span>;
  }

  return (
    <span className="admin-notify__details">
      {preview.name ? <span className="admin-notify__highlight">{preview.name}</span> : null}
      {preview.sender ? <span className="admin-notify__lead">{preview.sender}</span> : null}
    </span>
  );
}

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
      const dismissed = readDismissed();
      const visible = data.items.filter((item) => !dismissed.has(item.id));
      const hiddenUnread = data.items.filter((item) => dismissed.has(item.id) && !item.readAt).length;
      setItems(visible);
      setUnreadCount(Math.max(0, data.unreadCount - hiddenUnread));
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

  function dismissOne(item: AdminNotification) {
    const dismissed = readDismissed();
    dismissed.add(item.id);
    writeDismissed(dismissed);
    setItems((current) => current.filter((row) => row.id !== item.id));
    if (!item.readAt) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  }

  function dismissAll() {
    const dismissed = readDismissed();
    items.forEach((item) => dismissed.add(item.id));
    writeDismissed(dismissed);
    setItems([]);
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
          <div className="admin-notify__actions">
            {items.length > 0 ? (
              <button type="button" title="Marcar todas como leídas" onClick={() => void markAll()}>
                <Check size={13} strokeWidth={2} />
                Marcar todas como leídas
              </button>
            ) : null}
            {items.length > 0 ? (
              <button type="button" className="admin-notify__clear-all" title="Eliminar todas" onClick={dismissAll}>
                <Trash2 size={13} strokeWidth={1.8} />
                Eliminar todas
              </button>
            ) : null}
          </div>
        </div>
        {items.length === 0 ? (
          <p className="admin-notify__empty">No tienes notificaciones por ahora.</p>
        ) : (
          <ul className="admin-notify__list">
            {items.map((item) => (
              <li key={item.id}>
                <div className={`admin-notify__item${item.readAt ? "" : " is-unread"}`}>
                  <button
                    type="button"
                    className="admin-notify__open"
                    onClick={() => void openItem(item)}
                  >
                    <span className="admin-notify__icon" aria-hidden="true">
                      <NotificationIcon type={item.type} />
                    </span>
                    <span className="admin-notify__content">
                      <span className="admin-notify__heading">
                        <span className="admin-notify__title">{item.title}</span>
                        {item.readAt ? null : <span className="admin-notify__dot" />}
                      </span>
                      <NotificationDetails type={item.type} body={item.body} />
                      <span className="admin-notify__time">{formatWhen(item.createdAt)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="admin-notify__remove"
                    aria-label="Eliminar notificación"
                    onClick={() => dismissOne(item)}
                  >
                    <Trash2 size={14} strokeWidth={1.8} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
