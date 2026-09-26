import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarRange,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Folder,
  FolderPlus,
  Heart,
  MapPin,
  Mic,
  Minimize2,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { mediaUrl } from "../../utils/media";
import { formatPrice } from "../../utils/cn";
import { GuideMark } from "./GuideMark";
import { useGuide } from "./GuideContext";
import "../../styles/guide.css";

const CAPABILITIES = [
  { icon: CalendarRange, label: "Crear un plan", hint: "Ruta personalizada", prompt: "Créame un plan para este sábado" },
  { icon: Search, label: "Buscar experiencias", hint: "Según tus gustos", prompt: "Encuéntrame experiencias que encajen con mis gustos" },
  { icon: MapPin, label: "Explorar cerca", hint: "Cerca de ti", prompt: "Qué puedo hacer cerca de mí" },
  { icon: Heart, label: "Mis intereses", hint: "A tu medida", prompt: "Recomiéndame algo según mis intereses" },
] as const;

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
  return `${diff} días`;
}

export function GuideHost() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const guide = useGuide();
  const streamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const [planOpen, setPlanOpen] = useState(true);
  const [votes, setVotes] = useState<Record<string, "up" | "down">>({});
  const [folderName, setFolderName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const homePreview = pathname === "/" || pathname.startsWith("/explorar");
  const visible = (Boolean(user) || homePreview) && !hiddenPath(pathname);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    function onPointer(event: MouseEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [settingsOpen]);

  useEffect(() => {
    if (!guide.open) {
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 280);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
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
  }, [guide.open, guide.expanded, guide.minimizeGuide, guide.toggleExpand, guide.view, settingsOpen]);

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

  const composer = (
    <form
      className="guide-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void guide.send();
      }}
    >
      <div className="guide-composer__bar">
        <button
          type="button"
          className="guide-plus"
          aria-label="Más acciones"
          aria-expanded={guide.plusOpen}
          onClick={() => guide.setPlusOpen(!guide.plusOpen)}
        >
          <Plus size={16} strokeWidth={1.8} />
        </button>
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
        {guide.plusOpen ? (
          <div className="guide-plus-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                guide.setPlusOpen(false);
                void guide.send("Créame un plan para este sábado");
              }}
            >
              Crear plan
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                guide.setPlusOpen(false);
                void guide.send("Busca una experiencia para mí");
              }}
            >
              Buscar experiencia
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                guide.setPlusOpen(false);
                guide.closeGuide();
                navigate("/explorar#favoritos");
              }}
            >
              Mis favoritos
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                guide.setPlusOpen(false);
                void guide.send("Qué hay cerca de mí");
              }}
            >
              Explorar cerca
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                guide.setPlusOpen(false);
                if (!guide.expanded) {
                  guide.setView("history");
                }
              }}
            >
              Conversaciones
            </button>
          </div>
        ) : null}
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
        <GuideMark />
        {guide.unread ? <span className="guide-fab__dot" /> : null}
      </button>

      {guide.open ? (
        <section
            className={`guide-panel${guide.view === "home" ? " guide-panel--home" : ""}${guide.expanded ? " is-expanded" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Tu guía"
          >
            {guide.expanded ? (
              <aside className="guide-rail">
                <p className="guide-rail__app">Entre Caminos</p>
                <button type="button" className="guide-rail__new" onClick={guide.newConversation}>
                  Nueva conversación
                </button>
                <label className="guide-rail__search">
                  <Search size={13} strokeWidth={1.8} />
                  <input
                    value={guide.threadQuery}
                    onChange={(event) => guide.setThreadQuery(event.target.value)}
                    placeholder="Buscar conversaciones..."
                    aria-label="Buscar conversaciones"
                  />
                </label>
                <p className="guide-rail__label">Carpetas</p>
                <div className="guide-rail__list guide-rail__list--folders">
                  {guide.folders.map((folder) => {
                    const count = guide.threads.filter((item) => item.folderId === folder.id).length;
                    return (
                    <button
                      key={folder.id}
                      type="button"
                      className={guide.folderFilter === folder.id ? "is-on" : ""}
                      onClick={() => guide.setFolderFilter(guide.folderFilter === folder.id ? undefined : folder.id)}
                    >
                      <span className="guide-rail__folder">
                        <Folder size={14} strokeWidth={1.7} />
                        <span>
                          <strong>{folder.name}</strong>
                          <em>{count} {count === 1 ? "conversación" : "conversaciones"}</em>
                        </span>
                      </span>
                      <X
                        size={12}
                        aria-label="Eliminar carpeta"
                        onClick={(event) => {
                          event.stopPropagation();
                          guide.deleteFolder(folder.id);
                        }}
                      />
                    </button>
                    );
                  })}
                  <form
                    className="guide-rail__create"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (folderName.trim()) {
                        guide.createFolder(folderName.trim());
                        setFolderName("");
                      }
                    }}
                  >
                    <FolderPlus size={13} strokeWidth={1.8} />
                    <input
                      value={folderName}
                      onChange={(event) => setFolderName(event.target.value)}
                      placeholder="Nueva carpeta"
                      aria-label="Nombre de carpeta"
                    />
                  </form>
                </div>
                <p className="guide-rail__label">Conversaciones recientes</p>
                <div className="guide-rail__list guide-rail__list--threads">
                  {guide.threads
                    .filter((item) => !guide.folderFilter || item.folderId === guide.folderFilter)
                    .filter((item) => item.title.toLowerCase().includes(guide.threadQuery.toLowerCase()))
                    .map((item) => {
                      const last = item.messages[item.messages.length - 1];
                      return (
                      <button
                        key={item.id}
                        type="button"
                        className={item.id === guide.thread?.id ? "is-on" : ""}
                        onClick={() => guide.openThread(item.id)}
                      >
                        <span>
                          <strong>{item.title}</strong>
                          <em>{relativeDay(item.updatedAt)}</em>
                          {last?.content ? <b>{last.content}</b> : null}
                        </span>
                        <X
                          size={12}
                          aria-label="Eliminar conversación"
                          onClick={(event) => {
                            event.stopPropagation();
                            guide.deleteThread(item.id);
                          }}
                        />
                      </button>
                      );
                    })}
                </div>
                <div className="guide-rail__user" ref={settingsRef}>
                  <span className="guide-rail__avatar" aria-hidden="true">
                    {(user?.name?.trim().charAt(0) || "U").toUpperCase()}
                  </span>
                  <span>{user?.name || "Cuenta"}</span>
                  <button
                    type="button"
                    className="guide-rail__settings"
                    aria-label="Opciones del chat"
                    aria-expanded={settingsOpen}
                    onClick={() => setSettingsOpen((open) => !open)}
                  >
                    <Settings size={13} strokeWidth={1.8} />
                  </button>
                  {settingsOpen ? (
                    <div className="guide-settings" role="menu" aria-label="Opciones del chat">
                      <p className="guide-settings__title">Opciones del chat</p>
                      <button
                        type="button"
                        className="guide-settings__row"
                        onClick={() => {
                          setSettingsOpen(false);
                          guide.newConversation();
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
                          if (!guide.expanded) {
                            guide.setView("history");
                          }
                        }}
                      >
                        <span className="guide-settings__icon">
                          <Clock size={14} strokeWidth={1.8} />
                        </span>
                        <span>
                          <strong>Historial</strong>
                          <em>Conversaciones recientes.</em>
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
                </div>
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
                        <button key={item.label} type="button" className="guide-action" onClick={() => void guide.send(item.prompt)}>
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
                {guide.experienceId && guide.experienceTitle ? (
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
                  {guide.thread?.messages.length ? <p className="guide-day">Hoy</p> : null}
                  {guide.thread?.messages.map((message) => (
                    <article key={message.id} className={`guide-row${message.role === "user" ? " guide-row--user" : ""}`}>
                      {message.role === "assistant" ? (
                        <span className="guide-avatar" aria-hidden="true">
                          <GuideMark />
                        </span>
                      ) : null}
                      <div className="guide-row__body">
                        <div className="guide-bubble">{message.content}</div>
                        <div className="guide-meta">
                          <time>{formatTime(message.createdAt)}</time>
                          {message.role === "user" ? <Check size={11} strokeWidth={2.4} aria-hidden="true" /> : null}
                          {message.role === "assistant" ? (
                            <>
                              <button type="button" aria-label="Copiar" onClick={() => void navigator.clipboard.writeText(message.content)}>
                                <Copy size={12} />
                              </button>
                              <button type="button" aria-label="Regenerar" onClick={() => void guide.regenerate()}>
                                <RefreshCw size={12} />
                              </button>
                              <button
                                type="button"
                                aria-label="Me gusta"
                                className={votes[message.id] === "up" ? "is-on" : ""}
                                onClick={() => setVotes((current) => ({ ...current, [message.id]: "up" }))}
                              >
                                <ThumbsUp size={12} />
                              </button>
                              <button
                                type="button"
                                aria-label="No me gusta"
                                className={votes[message.id] === "down" ? "is-on" : ""}
                                onClick={() => setVotes((current) => ({ ...current, [message.id]: "down" }))}
                              >
                                <ThumbsDown size={12} />
                              </button>
                            </>
                          ) : null}
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
                                        guide.persistPlan({
                                          title: `Plan con ${experience.title}`,
                                          city: experience.location,
                                          duration: experience.duration || "1 día",
                                          people: "2 personas",
                                          experiences: [experience.title],
                                        })
                                      }
                                    >
                                      Agregar al plan
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
                        {message.suggestions?.length ? (
                          <div className="guide-smart">
                            {message.suggestions.map((item) => (
                              <button key={item} type="button" onClick={() => void guide.send(item)}>
                                {item}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {guide.sending ? (
                    <div className="guide-row">
                      <span className="guide-avatar" aria-hidden="true">
                        <GuideMark />
                      </span>
                      <p className="guide-typing" aria-live="polite">
                        <span />
                        Escribiendo
                      </p>
                    </div>
                  ) : null}
                  {guide.error ? <p className="guide-status">{guide.error}</p> : null}
                </div>
                {composer}
                <p className="guide-disclaimer">La IA puede cometer errores. Verifica la información importante.</p>
              </div>
            ) : null}

            {guide.view === "history" && !guide.expanded ? (
              <div className="guide-history">
                <p className="guide-status">Conversaciones recientes</p>
                {guide.threads.length ? (
                  guide.threads.map((item) => (
                    <button key={item.id} type="button" onClick={() => guide.openThread(item.id)}>
                      <span>
                        <strong>{item.title}</strong>
                        <em>{relativeDay(item.updatedAt)}</em>
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
