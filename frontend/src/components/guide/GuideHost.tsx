import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Calendar,
  CalendarRange,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Folder,
  Heart,
  Home,
  Leaf,
  Lightbulb,
  Map,
  MapPin,
  MessageCircle,
  Mic,
  Minimize2,
  Minus,
  MoreVertical,
  Mountain,
  Palette,
  Pencil,
  PanelLeft,
  Pin,
  Plane,
  Plus,
  Star,
  UtensilsCrossed,
  Users,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { mediaUrl } from "../../utils/media";
import { formatPrice } from "../../utils/cn";
import { useGuide } from "./GuideContext";
import { chronologicalMessages, type GuideThread, userChoiceChips } from "../../utils/guide-storage";
import "../../styles/guide.css";

const CAPABILITIES = [
  { icon: CalendarRange, label: "Crear un plan", hint: "Ruta personalizada", flow: "plan" as const },
  { icon: Search, label: "Buscar experiencias", hint: "Según tus gustos", flow: "search" as const },
  { icon: MapPin, label: "Explorar cerca", hint: "Cerca de ti", flow: "nearby" as const },
  { icon: Heart, label: "Mis intereses", hint: "A tu medida", flow: "interests" as const },
] as const;

const FOLDER_ICONS = [
  { id: "folder", Icon: Folder },
  { id: "heart", Icon: Heart },
  { id: "star", Icon: Star },
  { id: "plane", Icon: Plane },
  { id: "map", Icon: Map },
  { id: "mountain", Icon: Mountain },
  { id: "utensils", Icon: UtensilsCrossed },
  { id: "palette", Icon: Palette },
  { id: "home", Icon: Home },
  { id: "camera", Icon: Camera },
  { id: "compass", Icon: Compass },
  { id: "lightbulb", Icon: Lightbulb },
  { id: "leaf", Icon: Leaf },
  { id: "pin", Icon: MapPin },
  { id: "calendar", Icon: Calendar },
  { id: "users", Icon: Users },
] as const;

const EMOJI_TO_ICON: Record<string, string> = {
  "📁": "folder",
  "📂": "folder",
  "💚": "heart",
  "❤️": "heart",
  "⭐": "star",
  "✈️": "plane",
  "🗺️": "map",
  "🏔️": "mountain",
  "🍽️": "utensils",
  "🎨": "palette",
  "🏡": "home",
  "📸": "camera",
  "🧭": "compass",
  "💡": "lightbulb",
  "🌿": "leaf",
  "📍": "pin",
  "🗓️": "calendar",
  "👥": "users",
};

function folderIconId(name: string, icon?: string) {
  if (icon && FOLDER_ICONS.some((item) => item.id === icon)) {
    return icon;
  }
  if (icon && EMOJI_TO_ICON[icon]) {
    return EMOJI_TO_ICON[icon];
  }
  const label = name.toLowerCase();
  if (label.includes("favorit")) {
    return "heart";
  }
  if (label.includes("idea") || label.includes("viaje")) {
    return "plane";
  }
  if (label.includes("destino")) {
    return "map";
  }
  return "folder";
}

function FolderMark({ name, icon }: { name: string; icon?: string }) {
  const id = folderIconId(name, icon);
  const Icon = FOLDER_ICONS.find((item) => item.id === id)?.Icon ?? Folder;
  return <Icon size={15} strokeWidth={1.7} />;
}

function hiddenPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/")
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function relativeDay(value: string) {
  const then = new Date(value);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const diff = Math.round((start - day) / 86400000);
  if (diff <= 0) {
    return "Hoy";
  }
  if (diff === 1) {
    return "Ayer";
  }
  return then.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function threadStamp(value: string) {
  const then = new Date(value);
  const time = then.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
  return `${relativeDay(value)} · ${time}`;
}

function sortThreads(list: GuideThread[]) {
  return [...list].sort(
    (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

function placeMenu(anchor: DOMRect, height: number, width: number) {
  const gap = 4;
  const pad = 8;
  const above = anchor.top - pad;
  const openUp = above >= Math.min(height, 120);
  let top = openUp ? anchor.top - height - gap : anchor.bottom + gap;
  top = Math.min(Math.max(pad, top), Math.max(pad, window.innerHeight - height - pad));
  let left = anchor.left;
  if (left + width > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - width - pad);
  }
  left = Math.max(pad, left);
  return { top, left, openUp };
}

const VOTES_KEY = "ec_guide_message_votes";

function loadVotes(): Record<string, "up" | "down"> {
  try {
    const raw = window.localStorage.getItem(VOTES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, "up" | "down">) : {};
  } catch {
    return {};
  }
}

function saveVotes(votes: Record<string, "up" | "down">) {
  window.localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
}

export function GuideHost() {
  const { user } = useAuth();
  const pathname = useLocation().pathname;
  const guide = useGuide();
  const streamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadSearchRef = useRef<HTMLInputElement>(null);
  const [listening, setListening] = useState(false);
  const [planOpen, setPlanOpen] = useState(true);
  const [votes, setVotes] = useState<Record<string, "up" | "down">>(loadVotes);
  const [folderName, setFolderName] = useState("");
  const [folderIcon, setFolderIcon] = useState("folder");
  const [iconPicker, setIconPicker] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [threadMenu, setThreadMenu] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp?: boolean } | null>(null);
  const [moveMenu, setMoveMenu] = useState<string | null>(null);
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmFolderDelete, setConfirmFolderDelete] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renamingThread, setRenamingThread] = useState<string | null>(null);
  const [threadRenameDraft, setThreadRenameDraft] = useState("");
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const [draggingThread, setDraggingThread] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [railSection, setRailSection] = useState<"home" | "recents" | "favorites">("home");
  const activeFolderId =
    railSection === "home" && guide.folderFilter && guide.folderFilter !== "__fav__"
      ? guide.folderFilter
      : undefined;
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const threadMenuRef = useRef<HTMLDivElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const visible = Boolean(user) && !hiddenPath(pathname);

  useEffect(() => {
    if (!settingsOpen && !threadMenu && !folderMenu && !iconPicker && !guide.plusOpen && !moveMenu) {
      return;
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (settingsOpen && !settingsRef.current?.contains(target)) {
        setSettingsOpen(false);
      }
      if ((threadMenu || folderMenu) && !threadMenuRef.current?.contains(target)) {
        const onMore = (event.target as HTMLElement | null)?.closest?.(".guide-rail__more");
        if (onMore) {
          return;
        }
        closeThreadMenu();
      }
      if (iconPicker && !iconPickerRef.current?.contains(target)) {
        setIconPicker(null);
      }
      if (guide.plusOpen && !plusMenuRef.current?.contains(target)) {
        guide.setPlusOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [settingsOpen, threadMenu, folderMenu, iconPicker, guide.plusOpen, moveMenu]);

  useLayoutEffect(() => {
    if ((!threadMenu && !folderMenu) || !menuAnchor || !threadMenuRef.current) {
      return;
    }
    const box = threadMenuRef.current.getBoundingClientRect();
    const next = placeMenu(menuAnchor, box.height, Math.max(box.width, 214));
    setMenuPos((current) =>
      current && current.top === next.top && current.left === next.left ? current : next,
    );
  }, [threadMenu, folderMenu, menuAnchor, confirmDelete, confirmFolderDelete, moveMenu]);

  function closeThreadMenu() {
    setThreadMenu(null);
    setMoveMenu(null);
    setMenuPos(null);
    setMenuAnchor(null);
    setConfirmDelete(null);
    setFolderMenu(null);
    setConfirmFolderDelete(null);
  }

  async function copyMessage(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiedId(id);
  }

  useEffect(() => {
    if (!guide.expanded) {
      setRailOpen(true);
      setSearchOpen(false);
    }
  }, [guide.expanded]);

  useEffect(() => {
    if (!copiedId) {
      return;
    }
    const id = window.setTimeout(() => setCopiedId(null), 1800);
    return () => window.clearTimeout(id);
  }, [copiedId]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const id = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!guide.open) {
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 280);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (renamingThread) {
          setRenamingThread(null);
          return;
        }
        if (threadMenu) {
          closeThreadMenu();
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (guide.expanded) {
          guide.toggleExpand();
        } else {
          guide.minimizeGuide();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [guide.open, guide.expanded, guide.minimizeGuide, guide.toggleExpand, guide.view, settingsOpen, renamingThread, threadMenu]);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [guide.thread?.messages.length, guide.sending]);

  function listen() {
    const Speech =
      (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition ||
      (window as Window & { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition;
    if (!Speech) {
      inputRef.current?.focus();
      return;
    }
    const recognition = new Speech();
    recognition.lang = "es-CO";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const spoken = event.results[0]?.[0]?.transcript ?? "";
      if (spoken) {
        guide.setDraft(spoken);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
  }

  function sharePlan(plan: NonNullable<NonNullable<typeof guide.thread>["messages"][number]["plan"]>) {
    const text = [plan.title, [plan.date, plan.city, plan.people].filter(Boolean).join(" · "), plan.experiences.join(", ")]
      .filter(Boolean)
      .join("\n");
    if (navigator.share) {
      void navigator.share({ title: plan.title, text });
      return;
    }
    void navigator.clipboard.writeText(text);
  }

  if (!visible) {
    return null;
  }

  function threadRow(item: GuideThread) {
    return (
      <div
        key={item.id}
        className={`guide-rail__thread${item.id === guide.thread?.id ? " is-on" : ""}${draggingThread === item.id ? " is-dragging" : ""}${threadMenu === item.id ? " is-menu" : ""}`}
        draggable={renamingThread !== item.id}
        onClick={() => guide.openThread(item.id)}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id);
          event.dataTransfer.effectAllowed = "move";
          setDraggingThread(item.id);
          closeThreadMenu();
        }}
        onDragEnd={() => {
          setDraggingThread(null);
          setDropFolderId(null);
        }}
      >
        <div className="guide-rail__thread-open">
          <strong className="guide-rail__thread-title">{item.title}</strong>
          <em className="guide-rail__thread-date">{threadStamp(item.updatedAt)}</em>
        </div>
        <div
          className="guide-rail__thread-acts"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={`guide-rail__act${item.favorite ? " is-on" : ""}`}
            aria-label={item.favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            onClick={(event) => {
              event.stopPropagation();
              guide.toggleConversationFavorite(item.id);
            }}
          >
            <Star size={14} strokeWidth={1.8} fill={item.favorite ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className={`guide-rail__act guide-rail__act--pin${item.pinned ? " is-on" : ""}`}
            aria-label={item.pinned ? "Desfijar chat" : "Fijar chat"}
            onClick={(event) => {
              event.stopPropagation();
              guide.toggleConversationPinned(item.id);
            }}
          >
            <Pin size={14} strokeWidth={1.8} fill={item.pinned ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="guide-rail__more"
            aria-label="Más opciones"
            aria-expanded={threadMenu === item.id}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              if (threadMenu === item.id) {
                closeThreadMenu();
                return;
              }
              setConfirmDelete(null);
              setMoveMenu(null);
              setThreadMenu(item.id);
              setMenuAnchor(rect);
              setMenuPos(placeMenu(rect, 188, 214));
            }}
          >
            <MoreVertical size={14} strokeWidth={1.8} />
          </button>
        </div>
        {threadMenu === item.id && menuPos
          ? createPortal(
              <div
                ref={threadMenuRef}
                className={`guide-rail__menu${menuPos.openUp ? " is-up" : ""}`}
                role="menu"
                style={{ top: menuPos.top, left: menuPos.left, transformOrigin: menuPos.openUp ? "bottom left" : "top left" }}
              >
                {confirmDelete === item.id ? (
                  <>
                    <p className="guide-rail__menu-confirm">¿Eliminar esta conversación?</p>
                    <button type="button" role="menuitem" onClick={() => setConfirmDelete(null)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="guide-rail__menu-danger"
                      onClick={() => {
                        closeThreadMenu();
                        guide.deleteThread(item.id);
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                      Eliminar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeThreadMenu();
                        setRenamingThread(item.id);
                        setThreadRenameDraft(item.title);
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.8} />
                      <span>Renombrar</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        guide.toggleConversationFavorite(item.id);
                        closeThreadMenu();
                      }}
                    >
                      <Star size={14} strokeWidth={1.8} fill={item.favorite ? "currentColor" : "none"} />
                      <span>{item.favorite ? "Quitar de favoritos" : "Agregar a favoritos"}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="guide-rail__menu-danger"
                      onClick={() => setConfirmDelete(item.id)}
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                      <span>Eliminar</span>
                    </button>
                    <span className="guide-rail__menu-sep" />
                    <div
                      className="guide-rail__menu-move"
                      onMouseEnter={() => setMoveMenu(item.id)}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => setMoveMenu((current) => (current === item.id ? null : item.id))}
                      >
                        <Folder size={14} strokeWidth={1.8} />
                        <span>Mover a carpeta</span>
                        <ChevronRight size={14} strokeWidth={1.8} />
                      </button>
                      {moveMenu === item.id ? (
                        <div className="guide-rail__menu-flyout" role="menu">
                          <button
                            type="button"
                            onClick={() => {
                              closeThreadMenu();
                              setFoldersOpen(true);
                              setCreatingFolder(true);
                              setRailSection("home");
                            }}
                          >
                            <Folder size={14} strokeWidth={1.8} />
                            <span>Nueva carpeta</span>
                          </button>
                          {guide.folders.length ? (
                            guide.folders.map((folder) => (
                              <button
                                key={folder.id}
                                type="button"
                                onClick={() => {
                                  guide.assignThreadFolder(item.id, folder.id);
                                  closeThreadMenu();
                                  setToast(`Movido a ${folder.name}`);
                                }}
                              >
                                <FolderMark name={folder.name} icon={folder.icon} />
                                <span>{folder.name}</span>
                              </button>
                            ))
                          ) : (
                            <p className="guide-rail__menu-empty">Aún no hay carpetas</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                    {item.folderId ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          guide.assignThreadFolder(item.id, undefined);
                          closeThreadMenu();
                          setToast("Quitado de la carpeta");
                        }}
                      >
                        <Folder size={14} strokeWidth={1.8} />
                        <span>Quitar de la carpeta</span>
                      </button>
                    ) : null}
                  </>
                )}
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  const composer = (
    <form
      className="guide-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void guide.send();
      }}
    >
      <div className="guide-composer__bar">
        <div className="guide-plus-wrap" ref={plusMenuRef}>
        <button
          type="button"
          className="guide-plus"
          aria-label="Más acciones"
          aria-expanded={guide.plusOpen}
          onClick={() => guide.setPlusOpen(!guide.plusOpen)}
        >
          <Plus size={16} strokeWidth={1.8} />
        </button>
        {guide.plusOpen ? (
          <div className="guide-plus-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => guide.newConversation(activeFolderId)}>
              <SquarePen size={15} strokeWidth={1.8} />
              Nuevo chat
            </button>
            <button type="button" role="menuitem" onClick={() => guide.startFlow("plan")}>
              <CalendarRange size={15} strokeWidth={1.8} />
              Crear un plan
            </button>
            <button type="button" role="menuitem" onClick={() => guide.startFlow("search")}>
              <Search size={15} strokeWidth={1.8} />
              Buscar experiencias
            </button>
            <button type="button" role="menuitem" onClick={() => guide.startFlow("nearby")}>
              <MapPin size={15} strokeWidth={1.8} />
              Explorar cerca
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                guide.setPlusOpen(false);
                if (!guide.expanded) {
                  guide.toggleExpand();
                }
                setRailOpen(true);
                setRailSection("favorites");
                guide.setFolderFilter("__fav__");
                guide.setView("home");
              }}
            >
              <Star size={15} strokeWidth={1.8} />
              Mis favoritos
            </button>
          </div>
        ) : null}
        </div>
        <textarea
          ref={inputRef}
          rows={1}
          value={guide.draft}
          placeholder="Cuéntame qué quieres descubrir..."
          aria-label="Pregunta a Tu guía"
          className="guide-composer__field"
          wrap="soft"
          onChange={(event) => guide.setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void guide.send();
            }
          }}
        />
        <button
          type="button"
          className={`guide-mic${listening ? " is-on" : ""}`}
          aria-label="Dictar mensaje"
          onClick={listen}
        >
          <Mic size={15} strokeWidth={1.8} />
        </button>
        <button type="submit" className="guide-send" aria-label="Enviar" disabled={guide.sending || !guide.draft.trim()}>
          <Send size={14} strokeWidth={2.1} />
        </button>
      </div>
    </form>
  );

  return (
    <>
      <button
        type="button"
        className={`guide-fab${guide.open ? " is-open" : ""}${guide.unread ? " has-mail" : ""}`}
        aria-label="Abrir Tu guía"
        hidden={guide.open}
        onClick={() => guide.openGuide()}
      >
        <span className="guide-fab__icon">
          <span className="guide-fab__aura" aria-hidden="true" />
          <span className="guide-fab__spec" aria-hidden="true" />
          <span className="guide-fab__key" aria-hidden="true" />
          {guide.unread ? <span className="guide-fab__dot" /> : null}
        </span>
        <span className="guide-fab__label">Tu guía</span>
      </button>

      {guide.open ? (
        <section
            className={`guide-panel${guide.view === "home" ? " guide-panel--home" : ""}${guide.expanded ? " is-expanded" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Tu guía"
          >
            {guide.expanded ? (
              <aside className={`guide-rail${railOpen ? "" : " is-collapsed"}`}>
                <nav className="guide-dock" aria-label="Navegación de Tu guía">
                  <button
                    type="button"
                    className={`guide-dock__btn${railSection === "home" ? " is-on" : ""}`}
                    aria-label="Inicio"
                    onClick={() => {
                      setRailOpen(true);
                      setRailSection("home");
                      guide.setFolderFilter(undefined);
                      guide.setView("home");
                    }}
                  >
                    <Home size={18} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className={`guide-dock__btn${railSection === "recents" ? " is-on" : ""}`}
                    aria-label="Conversaciones"
                    onClick={() => {
                      setRailOpen(true);
                      setRailSection("recents");
                      if (guide.folderFilter === "__fav__") {
                        guide.setFolderFilter(undefined);
                      }
                    }}
                  >
                    <MessageCircle size={18} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className={`guide-dock__btn${railSection === "favorites" ? " is-on" : ""}`}
                    aria-label="Favoritos"
                    onClick={() => {
                      setRailOpen(true);
                      setRailSection("favorites");
                      guide.setFolderFilter("__fav__");
                    }}
                  >
                    <Star size={18} strokeWidth={1.8} />
                  </button>
                  <div className="guide-dock__spacer" />
                  <div className="guide-dock__foot" ref={settingsRef}>
                    <button
                      type="button"
                      className="guide-dock__btn"
                      aria-label="Opciones del chat"
                      aria-expanded={settingsOpen}
                      onClick={() => setSettingsOpen((open) => !open)}
                    >
                      <Settings size={18} strokeWidth={1.8} />
                    </button>
                    {settingsOpen ? (
                    <div className="guide-settings" role="menu" aria-label="Opciones del chat">
                      <p className="guide-settings__title">Opciones del chat</p>
                      <button
                        type="button"
                        className="guide-settings__row"
                        onClick={() => {
                          setSettingsOpen(false);
                          guide.newConversation(activeFolderId);
                        }}
                      >
                        <span className="guide-settings__icon">
                          <Plus size={14} strokeWidth={1.8} />
                        </span>
                        <span>
                          <strong>Nueva conversación</strong>
                          <em>Empieza un chat nuevo.</em>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="guide-settings__row"
                        onClick={() => {
                          setSettingsOpen(false);
                          setRailOpen(true);
                          setRailSection("recents");
                          guide.setFolderFilter(undefined);
                        }}
                      >
                        <span className="guide-settings__icon">
                          <MessageCircle size={14} strokeWidth={1.8} />
                        </span>
                        <span>
                          <strong>Conversaciones</strong>
                          <em>Historial de chats.</em>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="guide-settings__row"
                        onClick={() => {
                          setSettingsOpen(false);
                          setRailOpen(true);
                          setRailSection("favorites");
                          guide.setFolderFilter("__fav__");
                        }}
                      >
                        <span className="guide-settings__icon">
                          <Star size={14} strokeWidth={1.8} />
                        </span>
                        <span>
                          <strong>Favoritos</strong>
                          <em>Chats que marcaste.</em>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="guide-settings__row"
                        disabled={!guide.thread}
                        onClick={() => {
                          if (!guide.thread) {
                            return;
                          }
                          setSettingsOpen(false);
                          guide.deleteThread(guide.thread.id);
                        }}
                      >
                        <span className="guide-settings__icon">
                          <Trash2 size={14} strokeWidth={1.8} />
                        </span>
                        <span>
                          <strong>Limpiar conversación</strong>
                          <em>Elimina el chat actual.</em>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="guide-settings__row"
                        onClick={() => setSettingsOpen(false)}
                      >
                        <span className="guide-settings__icon">
                          <X size={14} strokeWidth={1.8} />
                        </span>
                        <span>
                          <strong>Cerrar menú</strong>
                        </span>
                      </button>
                    </div>
                    ) : null}
                    <span className="guide-dock__avatar" aria-hidden="true">
                      {(user?.name?.trim().charAt(0) || "U").toUpperCase()}
                    </span>
                  </div>
                </nav>
                {railOpen ? (
                <div className="guide-rail__panel">
                <div className="guide-rail__head">
                  <div className="guide-rail__brand">
                    <span className="guide-rail__logo" aria-hidden="true" />
                    <span>
                      <strong>Entre Caminos</strong>
                      <em>Tu guía IA</em>
                    </span>
                  </div>
                  <div className="guide-rail__tools">
                    <button
                      type="button"
                      className="guide-rail__find"
                      aria-label="Buscar conversaciones"
                      aria-expanded={searchOpen}
                      onClick={() => {
                        setSearchOpen((open) => {
                          const next = !open;
                          if (next) {
                            window.setTimeout(() => threadSearchRef.current?.focus(), 0);
                          }
                          return next;
                        });
                      }}
                    >
                      <Search size={16} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      className="guide-rail__collapse"
                      aria-label="Cerrar menú"
                      onClick={() => setRailOpen(false)}
                    >
                      <PanelLeft size={16} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className={`guide-rail__new${guide.view !== "chat" && !guide.thread?.messages.length ? " is-on" : ""}`}
                  onClick={() => guide.newConversation(activeFolderId)}
                >
                  <SquarePen size={15} strokeWidth={1.8} />
                  Nuevo chat
                </button>
                {searchOpen ? (
                  <label className="guide-rail__search">
                    <Search size={13} strokeWidth={1.8} />
                    <input
                      ref={threadSearchRef}
                      value={guide.threadQuery}
                      onChange={(event) => guide.setThreadQuery(event.target.value)}
                      placeholder="Buscar conversaciones..."
                      aria-label="Buscar conversaciones"
                    />
                  </label>
                ) : null}
                <div className="guide-rail__body">
                {railSection === "favorites" ? (
                  <>
                    <p className="guide-rail__label">Favoritos</p>
                    <div className="guide-rail__list guide-rail__list--threads">
                      {guide.threads
                        .filter((item) => item.favorite)
                        .filter((item) => item.title.toLowerCase().includes(guide.threadQuery.toLowerCase()))
                        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
                        .map(threadRow)}
                    </div>
                  </>
                ) : railSection === "recents" ? (
                  <>
                    <p className="guide-rail__label">Conversaciones</p>
                    <div className="guide-rail__list guide-rail__list--threads">
                      {sortThreads(guide.threads)
                        .filter((item) => item.title.toLowerCase().includes(guide.threadQuery.toLowerCase()))
                        .map(threadRow)}
                    </div>
                  </>
                ) : (
                  <>
                <div className="guide-rail__label-row">
                  <button
                    type="button"
                    className="guide-rail__label-toggle"
                    aria-expanded={foldersOpen}
                    onClick={() => setFoldersOpen((open) => !open)}
                  >
                    Carpetas
                    <ChevronDown size={14} strokeWidth={1.8} className={foldersOpen ? "is-open" : ""} />
                  </button>
                  <button
                    type="button"
                    className="guide-rail__label-add"
                    aria-label="Nueva carpeta"
                    onClick={() => {
                      setFoldersOpen(true);
                      setCreatingFolder(true);
                      setFolderIcon("folder");
                      setIconPicker("__new__");
                      setRailSection("home");
                    }}
                  >
                    <Plus size={14} strokeWidth={1.8} />
                  </button>
                </div>
                {foldersOpen ? (
                <div className="guide-rail__list guide-rail__list--folders" ref={iconPickerRef}>
                  {creatingFolder ? (
                    <div className="guide-rail__create-wrap">
                    <form
                      className="guide-rail__create"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (folderName.trim()) {
                          guide.createFolder(folderName.trim(), folderIcon);
                          setFolderName("");
                        }
                        setCreatingFolder(false);
                        setIconPicker(null);
                        setFolderIcon("folder");
                      }}
                    >
                      <button
                        type="button"
                        className="guide-rail__folder-icon"
                        aria-label="Elegir icono de carpeta"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setIconPicker((current) => (current === "__new__" ? null : "__new__"))}
                      >
                        <FolderMark name={folderName || "Nueva carpeta"} icon={folderIcon} />
                      </button>
                      <input
                        className="guide-rail__folder-rename"
                        value={folderName}
                        autoFocus
                        onChange={(event) => setFolderName(event.target.value)}
                        placeholder="Nombre de carpeta"
                        aria-label="Nombre de carpeta"
                        onBlur={() => {
                          if (iconPicker === "__new__") {
                            return;
                          }
                          if (folderName.trim()) {
                            guide.createFolder(folderName.trim(), folderIcon);
                            setFolderName("");
                          }
                          setCreatingFolder(false);
                          setFolderIcon("folder");
                        }}
                      />
                    </form>
                    {iconPicker === "__new__" ? (
                      <div className="guide-rail__emoji" role="listbox" aria-label="Elegir icono">
                        {FOLDER_ICONS.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={folderIcon === item.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setFolderIcon(item.id);
                            }}
                          >
                            <item.Icon size={15} strokeWidth={1.7} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    </div>
                  ) : null}
                  {guide.folders.map((folder) => {
                    const chats = sortThreads(guide.threads.filter((item) => item.folderId === folder.id));
                    const open = guide.folderFilter === folder.id;
                    const iconId = folderIconId(folder.name, folder.icon);
                    return (
                    <div key={folder.id} className="guide-rail__folder-block">
                    <div
                      className={`guide-rail__folder-row${open ? " is-on" : ""}${dropFolderId === folder.id ? " is-drop" : ""}${folderMenu === folder.id ? " is-menu" : ""}`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropFolderId(folder.id);
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                          setDropFolderId((current) => (current === folder.id ? null : current));
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const threadId = event.dataTransfer.getData("text/plain");
                        setDropFolderId(null);
                        setDraggingThread(null);
                        if (!threadId || guide.threads.find((row) => row.id === threadId)?.folderId === folder.id) {
                          return;
                        }
                        guide.assignThreadFolder(threadId, folder.id);
                        guide.setFolderFilter(folder.id);
                        setToast(`Movido a ${folder.name}`);
                      }}
                    >
                      <button
                        type="button"
                        className="guide-rail__folder-icon"
                        aria-label="Cambiar icono de carpeta"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIconPicker((current) => (current === folder.id ? null : folder.id));
                        }}
                      >
                        <FolderMark name={folder.name} icon={folder.icon} />
                      </button>
                      {iconPicker === folder.id ? (
                        <div className="guide-rail__emoji" role="listbox" aria-label="Elegir icono">
                          {FOLDER_ICONS.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              role="option"
                              aria-selected={iconId === item.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                guide.setFolderIcon(folder.id, item.id);
                                setIconPicker(null);
                              }}
                            >
                              <item.Icon size={15} strokeWidth={1.7} />
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className="guide-rail__folder-open"
                        onClick={() => {
                          setRailSection("home");
                          guide.setFolderFilter(guide.folderFilter === folder.id ? undefined : folder.id);
                        }}
                        onDoubleClick={() => {
                          setRenamingFolder(folder.id);
                          setRenameDraft(folder.name);
                        }}
                      >
                        {renamingFolder === folder.id ? (
                          <input
                            className="guide-rail__folder-rename"
                            value={renameDraft}
                            aria-label="Renombrar carpeta"
                            autoFocus
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setRenameDraft(event.target.value)}
                            onBlur={() => {
                              if (renameDraft.trim()) {
                                guide.renameFolder(folder.id, renameDraft.trim());
                              }
                              setRenamingFolder(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                (event.target as HTMLInputElement).blur();
                              }
                              if (event.key === "Escape") {
                                setRenamingFolder(null);
                              }
                            }}
                          />
                        ) : (
                          <strong>{folder.name}</strong>
                        )}
                      </button>
                      <div
                        className="guide-rail__folder-acts"
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="guide-rail__act guide-rail__act--new"
                          aria-label={`Nuevo chat en ${folder.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            guide.setFolderFilter(folder.id);
                            guide.newConversation(folder.id);
                          }}
                        >
                          <SquarePen size={14} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          className="guide-rail__more"
                          aria-label={`Opciones de ${folder.name}`}
                          aria-expanded={folderMenu === folder.id}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const rect = event.currentTarget.getBoundingClientRect();
                            if (folderMenu === folder.id) {
                              closeThreadMenu();
                              return;
                            }
                            setThreadMenu(null);
                            setMoveMenu(null);
                            setConfirmFolderDelete(null);
                            setFolderMenu(folder.id);
                            setMenuAnchor(rect);
                            setMenuPos(placeMenu(rect, 140, 214));
                          }}
                        >
                          <MoreVertical size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                      {folderMenu === folder.id && menuPos
                        ? createPortal(
                            <div
                              ref={threadMenuRef}
                              className={`guide-rail__menu${menuPos.openUp ? " is-up" : ""}`}
                              role="menu"
                              style={{
                                top: menuPos.top,
                                left: menuPos.left,
                                transformOrigin: menuPos.openUp ? "bottom left" : "top left",
                              }}
                            >
                              {confirmFolderDelete === folder.id ? (
                                <>
                                  <p className="guide-rail__menu-confirm">¿Eliminar esta carpeta?</p>
                                  <button type="button" role="menuitem" onClick={() => setConfirmFolderDelete(null)}>
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="guide-rail__menu-danger"
                                    onClick={() => {
                                      closeThreadMenu();
                                      guide.deleteFolder(folder.id);
                                    }}
                                  >
                                    <Trash2 size={14} strokeWidth={1.8} />
                                    <span>Eliminar</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      closeThreadMenu();
                                      setRenamingFolder(folder.id);
                                      setRenameDraft(folder.name);
                                    }}
                                  >
                                    <Pencil size={14} strokeWidth={1.8} />
                                    <span>Renombrar</span>
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="guide-rail__menu-danger"
                                    onClick={() => setConfirmFolderDelete(folder.id)}
                                  >
                                    <Trash2 size={14} strokeWidth={1.8} />
                                    <span>Eliminar</span>
                                  </button>
                                </>
                              )}
                            </div>,
                            document.body,
                          )
                        : null}
                    </div>
                    {open ? (
                      <div className="guide-rail__folder-chats">
                        {chats.length ? chats.map(threadRow) : (
                          <p className="guide-rail__empty">Sin conversaciones</p>
                        )}
                      </div>
                    ) : null}
                    </div>
                    );
                  })}
                </div>
                ) : null}
                <p className="guide-rail__label">Conversaciones recientes</p>
                <div className="guide-rail__list guide-rail__list--threads">
                  {sortThreads(guide.threads.filter((item) => !item.folderId))
                    .filter((item) => item.title.toLowerCase().includes(guide.threadQuery.toLowerCase()))
                    .map(threadRow)}
                </div>
                  </>
                )}
                </div>
                {toast ? <p className="guide-toast" role="status">{toast}</p> : null}
                </div>
                ) : null}
              </aside>
            ) : null}
            <div className="guide-shell">
            <header className="guide-panel__top">
              <div className="guide-panel__brand">
                <div className="guide-panel__id">
                  <strong>Tu guía IA</strong>
                </div>
              </div>
              <div className="guide-win">
                <button type="button" className="guide-icon-btn" aria-label="Minimizar" onClick={guide.minimizeGuide}>
                  <Minus size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="guide-icon-btn"
                  aria-label={guide.expanded ? "Reducir" : "Expandir"}
                  onClick={guide.toggleExpand}
                >
                  {guide.expanded ? <Minimize2 size={13} strokeWidth={2} /> : <ArrowUpRight size={14} strokeWidth={2} />}
                </button>
                <button type="button" className="guide-icon-btn guide-icon-btn--close" aria-label="Cerrar" onClick={guide.closeGuide}>
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            </header>

            {guide.view === "home" || (guide.expanded && guide.view === "history") ? (
              <div className="guide-home">
                <div className="guide-home__intro">
                  <h2>¿Qué quieres descubrir?</h2>
                  <p className="guide-home__copy">Encuentra experiencias y planes según tus gustos.</p>
                </div>
                <div className="guide-home__dock">
                  <div className="guide-actions">
                    {CAPABILITIES.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.label} type="button" className="guide-action" onClick={() => guide.startFlow(item.flow)}>
                          <span className="guide-action__icon">
                            <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                          </span>
                          <span>
                            <strong>{item.label}</strong>
                            <em>{item.hint}</em>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {composer}
                </div>
              </div>
            ) : null}

            {guide.view === "chat" ? (
              <div className="guide-chat">
                {guide.thread?.experienceId && guide.experienceTitle ? (
                  <div className="guide-focus">
                    {guide.experienceImage ? <img src={mediaUrl(guide.experienceImage, 80)} alt="" /> : <span className="guide-focus__mark" />}
                    <div>
                      <strong>{guide.experienceTitle}</strong>
                      <p>{guide.experienceLocation}</p>
                      <em>Consultando esta experiencia</em>
                    </div>
                  </div>
                ) : null}
                {(() => {
                  const progress = [...(guide.thread?.messages ?? [])].reverse().find((item) => item.planProgress)?.planProgress;
                  return progress ? (
                    <p className="guide-progress">
                      Paso {progress.step} de {progress.total}
                    </p>
                  ) : null;
                })()}
                <div className="guide-stream" ref={streamRef}>
                  {(() => {
                    const messages = chronologicalMessages(guide.thread?.messages);
                    const regenerating = guide.sending && messages.at(-1)?.role === "assistant";
                    const visible = regenerating ? messages.slice(0, -1) : messages;
                    const vote = (id: string, value: "up" | "down") => {
                      setVotes((current) => {
                        const next = { ...current, [id]: current[id] === value ? undefined : value };
                        const stored = Object.fromEntries(
                          Object.entries(next).filter((entry): entry is [string, "up" | "down"] => Boolean(entry[1])),
                        );
                        saveVotes(stored);
                        return stored;
                      });
                    };
                    return (
                      <>
                  {visible.length ? <p className="guide-day">Hoy</p> : null}
                  {visible.map((message, index) => {
                    const role = message.role === "assistant" ? "assistant" : "user";
                    const lastAssistant = !guide.sending && index === visible.length - 1;
                    const chips = role === "assistant" && lastAssistant ? userChoiceChips(message.content, message.suggestions) : [];
                    if (role === "user") {
                      return (
                        <article key={message.id || `user-${index}`} className="guide-row guide-row--user">
                          <div className="guide-row__body">
                            <div className="guide-bubble">{message.content}</div>
                            <div className="guide-meta">
                              <time>{formatTime(message.createdAt)}</time>
                              {guide.sending && !regenerating && index === visible.length - 1 ? <span>Enviando</span> : <Check size={11} strokeWidth={2.4} aria-hidden="true" />}
                            </div>
                          </div>
                        </article>
                      );
                    }
                    return (
                    <article key={message.id || `assistant-${index}`} className="guide-row">
                      <span className="guide-avatar guide-avatar--key" aria-hidden="true" />
                      <div className="guide-row__body">
                        <div className="guide-bubble">{message.content}</div>
                        <div className="guide-meta">
                          <time>{formatTime(message.createdAt)}</time>
                          <button
                            type="button"
                            className="guide-copy"
                            aria-label="Copiar"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void copyMessage(message.id, message.content);
                            }}
                          >
                            <Copy size={14} strokeWidth={1.8} />
                            {copiedId === message.id ? (
                              <span className="guide-copy__hint" role="status">
                                Se ha copiado
                              </span>
                            ) : null}
                          </button>
                          {lastAssistant ? (
                            <button
                              type="button"
                              aria-label="Regenerar"
                              disabled={guide.sending}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void guide.regenerate();
                              }}
                            >
                              <RefreshCw size={14} strokeWidth={1.8} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            aria-label="Me gusta"
                            className={votes[message.id] === "up" ? "is-on" : ""}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              vote(message.id, "up");
                              setToast(votes[message.id] === "up" ? "Quitaste Me gusta" : "Marcado: me gusta");
                            }}
                          >
                            <ThumbsUp size={14} strokeWidth={1.8} fill={votes[message.id] === "up" ? "currentColor" : "none"} />
                          </button>
                          <button
                            type="button"
                            aria-label="No me gusta"
                            className={votes[message.id] === "down" ? "is-on" : ""}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              vote(message.id, "down");
                              setToast(votes[message.id] === "down" ? "Quitaste No me gusta" : "Marcado: no me gusta");
                            }}
                          >
                            <ThumbsDown size={14} strokeWidth={1.8} fill={votes[message.id] === "down" ? "currentColor" : "none"} />
                          </button>
                        </div>
                        {message.experiences?.length ? (
                          <div className="guide-xp-row">
                            {message.experiences.map((experience) => (
                              <article key={experience.id} className="guide-xp">
                                <div className="guide-xp__photo">
                                  {experience.imageUrl ? <img src={mediaUrl(experience.imageUrl, 420)} alt="" /> : <span />}
                                  <button
                                    type="button"
                                    className={`guide-xp__fav${guide.favorites.includes(experience.id) ? " is-on" : ""}`}
                                    aria-label="Favorito"
                                    onClick={() => guide.toggleFavorite(experience.id)}
                                  >
                                    <Heart size={13} fill={guide.favorites.includes(experience.id) ? "currentColor" : "none"} />
                                  </button>
                                </div>
                                <div className="guide-xp__body">
                                  <strong>{experience.title}</strong>
                                  <p>
                                    <MapPin size={11} />
                                    {experience.location}
                                  </p>
                                  <p>
                                    <Clock size={11} />
                                    {experience.duration || "Duración variable"}
                                    <span>{formatPrice(experience.price)}</span>
                                  </p>
                                  {experience.category ? <em>{experience.category}</em> : null}
                                  <div className="guide-xp__actions">
                                    <Link className="guide-xp__btn" to={`/explorar/${experience.id}`} onClick={guide.minimizeGuide}>
                                      Ver experiencia
                                    </Link>
                                    <button
                                      type="button"
                                      className="guide-xp__ghost"
                                      onClick={() =>
                                        void guide.send(`Armame un plan alrededor de ${experience.title}`)
                                      }
                                    >
                                      Crear un plan con esto
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : null}
                        {message.plan ? (
                          <div className="guide-plan">
                            {message.plan.coverImageUrl ? (
                              <img className="guide-plan__cover" src={mediaUrl(message.plan.coverImageUrl, 720)} alt="" />
                            ) : null}
                            <div className="guide-plan__sheet">
                              <button type="button" className="guide-plan__head" onClick={() => setPlanOpen((open) => !open)}>
                                <span>
                                  <strong>{message.plan.title}</strong>
                                  <p>
                                    {[message.plan.date, message.plan.duration, message.plan.people].filter(Boolean).join(" · ")}
                                  </p>
                                </span>
                                <ChevronDown size={16} className={planOpen ? "is-open" : ""} />
                              </button>
                              {message.plan.tags?.length ? (
                                <div className="guide-plan__tags">
                                  {message.plan.tags.map((tag) => (
                                    <em key={tag}>{tag}</em>
                                  ))}
                                </div>
                              ) : null}
                              {planOpen ? (
                                <ol>
                                  {(message.plan.itinerary?.length
                                    ? message.plan.itinerary
                                    : message.plan.experiences.map((title, index) => ({
                                        time: ["9:00 a. m.", "11:00 a. m.", "2:00 p. m.", "4:00 p. m."][index] || "",
                                        title,
                                        subtitle: message.plan?.city ?? "",
                                        imageUrl: null,
                                      }))
                                  ).map((stop) => (
                                    <li key={`${stop.time}-${stop.title}`}>
                                      <span>{stop.time}</span>
                                      {stop.imageUrl ? <img src={mediaUrl(stop.imageUrl, 80)} alt="" /> : <i />}
                                      <div>
                                        <strong>{stop.title}</strong>
                                        <p>{stop.subtitle}</p>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                              ) : null}
                              <div className="guide-plan__actions">
                                <button type="button" className="is-solid" onClick={() => setPlanOpen(true)}>
                                  Ver plan completo
                                </button>
                                <button type="button" onClick={() => void guide.send("Modifica este plan")}>
                                  <Pencil size={13} />
                                  Modificar
                                </button>
                                <button type="button" onClick={() => guide.persistPlan(message.plan!)}>
                                  <Save size={13} />
                                  Guardar
                                </button>
                                <button type="button" onClick={() => sharePlan(message.plan!)}>
                                  <Share2 size={13} />
                                  Compartir
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {chips.length ? (
                          <div className="guide-smart">
                            {chips.map((item) => (
                              <button key={item} type="button" onClick={() => void guide.send(item)}>
                                {item}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                    );
                  })}
                  {guide.sending ? (
                    <div className="guide-row">
                      <span className="guide-avatar guide-avatar--key" aria-hidden="true" />
                      <p className="guide-typing" aria-live="polite">
                        <span />
                        IA pensando...
                      </p>
                    </div>
                  ) : null}
                  {guide.error ? <p className="guide-status">{guide.error}</p> : null}
                      </>
                    );
                  })()}
                </div>
                {composer}
                <p className="guide-disclaimer">La IA puede cometer errores. Verifica la información importante.</p>
                {toast ? <p className="guide-toast" role="status">{toast}</p> : null}
              </div>
            ) : null}

            {guide.view === "history" && !guide.expanded ? (
              <div className="guide-history">
                <p className="guide-status">Conversaciones recientes</p>
                {guide.threads.filter((item) => (guide.folderFilter === "__fav__" ? item.favorite : true)).length ? (
                  guide.threads
                    .filter((item) => (guide.folderFilter === "__fav__" ? item.favorite : true))
                    .map((item) => (
                    <button key={item.id} type="button" onClick={() => guide.openThread(item.id)}>
                      <span>
                        <strong>{item.title}</strong>
                        <em>{threadStamp(item.updatedAt)}</em>
                      </span>
                      <X
                        size={14}
                        aria-label="Eliminar"
                        onClick={(event) => {
                          event.stopPropagation();
                          guide.deleteThread(item.id);
                        }}
                      />
                    </button>
                  ))
                ) : (
                  <p className="guide-status">Aún no hay conversaciones.</p>
                )}
                <button type="button" className="guide-ghost" onClick={() => guide.setView("home")}>
                  Nueva conversación
                </button>
              </div>
            ) : null}
            </div>
          </section>
      ) : null}
      {renamingThread
        ? createPortal(
            <div
              className="guide-rail__rename-layer"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setRenamingThread(null);
                }
              }}
            >
              <form
                className="guide-rail__rename-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (threadRenameDraft.trim()) {
                    guide.renameThread(renamingThread, threadRenameDraft.trim());
                  }
                  setRenamingThread(null);
                }}
              >
                <p>Renombrar conversación</p>
                <input
                  value={threadRenameDraft}
                  aria-label="Nombre de la conversación"
                  autoFocus
                  maxLength={80}
                  onChange={(event) => setThreadRenameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setRenamingThread(null);
                    }
                  }}
                />
                <div>
                  <button type="button" onClick={() => setRenamingThread(null)}>
                    Cancelar
                  </button>
                  <button type="submit">Guardar</button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
