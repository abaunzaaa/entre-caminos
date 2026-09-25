import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarRange,
  ChevronDown,
  Clock,
  Copy,
  Heart,
  MapPin,
  Mic,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../hooks/useAuth";
import { mediaUrl } from "../../utils/media";
import { formatPrice } from "../../utils/cn";
import { useGuide } from "./GuideProvider";
import "../../styles/guide.css";

const CAPABILITIES = [
  { icon: CalendarRange, label: "Crear un plan", prompt: "Créame un plan para este sábado" },
  { icon: Search, label: "Buscar experiencias", prompt: "Encuéntrame experiencias que encajen con mis gustos" },
  { icon: MapPin, label: "Explorar cerca", prompt: "Qué puedo hacer cerca de mí" },
  { icon: Heart, label: "Mis intereses", prompt: "Recomiéndame algo según mis intereses" },
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

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "";
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
  const greet = firstName(user?.name);
  const visible = Boolean(user) && !hiddenPath(pathname);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [guide.thread?.messages.length, guide.sending]);

  useEffect(() => {
    if (!guide.open) {
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 280);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        guide.minimizeGuide();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [guide.open, guide.minimizeGuide, guide.view]);

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

  if (!visible) {
    return null;
  }

  const composer = (
    <form
      className={`guide-composer${guide.view === "home" ? " guide-composer--hero" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        void guide.send();
      }}
    >
      <button
        type="button"
        className="guide-plus"
        aria-label="Más acciones"
        aria-expanded={guide.plusOpen}
        onClick={() => guide.setPlusOpen(!guide.plusOpen)}
      >
        <Plus size={18} strokeWidth={1.8} />
      </button>
      <textarea
        ref={inputRef}
        rows={guide.view === "home" ? 2 : 1}
        value={guide.draft}
        placeholder={
          guide.view === "home" ? "Pregúntame por experiencias, lugares o crea un plan..." : "Escribe tu mensaje..."
        }
        aria-label="Pregunta a Tu guía"
        onChange={(event) => guide.setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void guide.send();
          }
        }}
      />
      {guide.view === "chat" ? (
        <button
          type="button"
          className={`guide-mic${listening ? " is-on" : ""}`}
          aria-label="Dictar mensaje"
          onClick={listen}
        >
          <Mic size={16} strokeWidth={1.8} />
        </button>
      ) : null}
      <button type="submit" className="guide-send" aria-label="Enviar" disabled={guide.sending || !guide.draft.trim()}>
        <Send size={16} strokeWidth={1.8} />
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
              guide.setView("history");
            }}
          >
            Conversaciones
          </button>
        </div>
      ) : null}
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
        <img src={logo} alt="" />
        {guide.unread ? <span className="guide-fab__dot" /> : null}
      </button>

      {guide.open ? (
        <>
          <button type="button" className="guide-overlay" aria-label="Cerrar guía" onClick={guide.minimizeGuide} />
          <section className={`guide-panel${guide.view === "home" ? " guide-panel--home" : ""}`} role="dialog" aria-modal="true" aria-label="Tu guía">
            <header className="guide-panel__top">
              <div className="guide-panel__brand">
                <span className="guide-mark" aria-hidden="true">
                  <img src={logo} alt="" />
                </span>
                <div>
                  <strong>Tu guía</strong>
                  <span>
                    Asistente inteligente
                    <em>
                      <i />
                      Disponible
                    </em>
                  </span>
                </div>
              </div>
              <button type="button" className="guide-icon-btn" aria-label="Minimizar" onClick={guide.minimizeGuide}>
                <Minus size={16} />
              </button>
              <button type="button" className="guide-icon-btn" aria-label="Cerrar" onClick={guide.closeGuide}>
                <X size={16} />
              </button>
            </header>

            {guide.view === "home" ? (
              <div className="guide-home">
                <div className="guide-home__stage">
                  <p className="guide-hello">{greet ? `Hola ${greet} 👋` : "Hola 👋"}</p>
                  <h2>¿Qué quieres descubrir hoy?</h2>
                  {composer}
                </div>
                <div className="guide-pills">
                  {CAPABILITIES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.label} type="button" className="guide-pill" onClick={() => void guide.send(item.prompt)}>
                        <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                        {item.label}
                      </button>
                    );
                  })}
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
                  {guide.thread?.messages.map((message) => (
                    <article key={message.id} className={`guide-row${message.role === "user" ? " guide-row--user" : ""}`}>
                      {message.role === "assistant" ? (
                        <span className="guide-avatar" aria-hidden="true">
                          <img src={logo} alt="" />
                        </span>
                      ) : null}
                      <div className="guide-row__body">
                        <div className="guide-bubble">{message.content}</div>
                        <div className="guide-meta">
                          <time>{formatTime(message.createdAt)}</time>
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
                        <img src={logo} alt="" />
                      </span>
                      <p className="guide-typing" aria-live="polite">
                        <span />
                      </p>
                    </div>
                  ) : null}
                  {guide.error ? <p className="guide-status">{guide.error}</p> : null}
                </div>
                {composer}
                <p className="guide-disclaimer">La IA puede cometer errores. Verifica la información importante.</p>
              </div>
            ) : null}

            {guide.view === "history" ? (
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
          </section>
        </>
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
