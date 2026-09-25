import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/api-error";
import {
  loadFavoriteIds,
  loadSavedPlans,
  loadThreads,
  newMessageId,
  newThreadId,
  savePlan,
  saveThreads,
  titleFromText,
  toggleFavoriteId,
  type GuideStoredMessage,
  type GuideThread,
} from "../../utils/guide-storage";
import { sendGuideMessage, type GuideReply } from "../../services/guide.service";

type GuideView = "home" | "chat" | "history";

type GuideContextValue = {
  open: boolean;
  view: GuideView;
  sending: boolean;
  error: string;
  unread: boolean;
  plusOpen: boolean;
  thread: GuideThread | null;
  threads: GuideThread[];
  draft: string;
  experienceId?: string;
  experienceTitle?: string;
  experienceImage?: string;
  experienceLocation?: string;
  favorites: string[];
  savedPlans: NonNullable<GuideStoredMessage["plan"]>[];
  setDraft: (value: string) => void;
  setPlusOpen: (value: boolean) => void;
  openGuide: (opts?: { prompt?: string; view?: GuideView }) => void;
  closeGuide: () => void;
  minimizeGuide: () => void;
  startThread: (prompt?: string) => void;
  send: (text?: string) => Promise<void>;
  regenerate: () => Promise<void>;
  openThread: (id: string) => void;
  deleteThread: (id: string) => void;
  setView: (view: GuideView) => void;
  toggleFavorite: (id: string) => void;
  persistPlan: (plan: NonNullable<GuideStoredMessage["plan"]>) => void;
};

const GuideContext = createContext<GuideContextValue | null>(null);

function emptyThread(experienceId?: string, experienceTitle?: string): GuideThread {
  const welcome: GuideStoredMessage[] = experienceTitle
    ? [
        {
          id: newMessageId(),
          role: "assistant",
          content: `Estoy lista para ayudarte con esta experiencia.\n\n¿Qué quieres saber?`,
          createdAt: new Date().toISOString(),
          suggestions: ["¿Qué incluye?", "¿Cuánto dura?", "¿Qué debo llevar?", "Agregar al plan"],
        },
      ]
    : [];
  return {
    id: newThreadId(),
    title: experienceTitle ? experienceTitle : "Nueva conversación",
    updatedAt: new Date().toISOString(),
    experienceId,
    messages: welcome,
  };
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const experienceId = location.pathname.match(/^\/explorar\/([^/]+)$/)?.[1];
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<GuideView>("home");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<GuideThread | null>(null);
  const [threads, setThreads] = useState<GuideThread[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedPlans, setSavedPlans] = useState<NonNullable<GuideStoredMessage["plan"]>[]>([]);
  const [experienceTitle, setExperienceTitle] = useState<string>();
  const [experienceImage, setExperienceImage] = useState<string>();
  const [experienceLocation, setExperienceLocation] = useState<string>();

  useEffect(() => {
    if (!user) {
      setThreads([]);
      setFavorites([]);
      setSavedPlans([]);
      return;
    }
    setThreads(loadThreads(user.id));
    setFavorites(loadFavoriteIds(user.id));
    setSavedPlans(loadSavedPlans(user.id).filter(Boolean) as NonNullable<GuideStoredMessage["plan"]>[]);
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!experienceId) {
      setExperienceTitle(undefined);
      setExperienceImage(undefined);
      setExperienceLocation(undefined);
      return;
    }
    import("../../services/catalog.service").then(({ getPublicExperience }) =>
      getPublicExperience(experienceId)
        .then((item) => {
          if (!cancelled) {
            setExperienceTitle(item.title);
            setExperienceImage(item.imageUrl ?? undefined);
            setExperienceLocation(item.location);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setExperienceTitle(undefined);
            setExperienceImage(undefined);
            setExperienceLocation(undefined);
          }
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [experienceId]);

  const persist = useCallback(
    (next: GuideThread) => {
      if (!user) {
        return;
      }
      setThread(next);
      setThreads((current) => {
        const merged = [next, ...current.filter((item) => item.id !== next.id)];
        saveThreads(user.id, merged);
        return merged;
      });
    },
    [user],
  );

  const closeGuide = useCallback(() => {
    setOpen(false);
    setPlusOpen(false);
  }, []);

  const minimizeGuide = useCallback(() => {
    setOpen(false);
    setPlusOpen(false);
    if (thread?.messages.length) {
      setUnread(true);
    }
  }, [thread]);

  const openGuide = useCallback(
    (opts?: { prompt?: string; view?: GuideView }) => {
      setOpen(true);
      setUnread(false);
      setError("");
      if (opts?.prompt) {
        setDraft(opts.prompt);
      }
      if (experienceId) {
        if (!thread || thread.experienceId !== experienceId) {
          persist(emptyThread(experienceId, experienceTitle));
        }
        setView("chat");
      } else {
        setView(opts?.view ?? "home");
      }
    },
    [experienceId, experienceTitle, persist, thread],
  );

  const startThread = useCallback(
    (prompt?: string) => {
      const next = emptyThread(experienceId, experienceTitle);
      persist(next);
      setView("chat");
      setError("");
      if (prompt) {
        setDraft(prompt);
      }
    },
    [experienceId, experienceTitle, persist],
  );

  const send = useCallback(
    async (text?: string, source?: GuideThread | null) => {
      const content = (text ?? draft).trim();
      if (!content || sending || !user) {
        return;
      }
      const base = source ?? thread ?? emptyThread(experienceId, experienceTitle);
      const userMessage: GuideStoredMessage = {
        id: newMessageId(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      const pending = {
        ...base,
        title: base.messages.some((item) => item.role === "user") ? base.title : titleFromText(content),
        updatedAt: new Date().toISOString(),
        messages: [...base.messages, userMessage],
      };
      persist(pending);
      setDraft("");
      setSending(true);
      setError("");
      setView("chat");
      try {
        const reply: GuideReply = await sendGuideMessage({
          message: content,
          history: pending.messages.slice(0, -1).map((item) => ({ role: item.role, content: item.content })),
          experienceId,
        });
        const assistantMessage: GuideStoredMessage = {
          id: newMessageId(),
          role: "assistant",
          content: reply.reply,
          createdAt: new Date().toISOString(),
          experiences: reply.experiences,
          plan: reply.plan,
          planProgress: reply.planProgress,
          suggestions:
            reply.suggestions.length > 0
              ? reply.suggestions
              : reply.experiences.length && !reply.plan
                ? ["Hacer un plan con estas", "Ver más opciones", "Cambiar fecha"]
                : [],
          status: reply.status,
        };
        persist({
          ...pending,
          updatedAt: new Date().toISOString(),
          messages: [...pending.messages, assistantMessage],
        });
      } catch (err) {
        setError(getApiErrorMessage(err, "No pude encontrar información en este momento."));
      } finally {
        setSending(false);
      }
    },
    [draft, experienceId, experienceTitle, persist, sending, thread, user],
  );

  const regenerate = useCallback(async () => {
    if (!thread) {
      return;
    }
    const lastUserIndex = [...thread.messages].map((item) => item.role).lastIndexOf("user");
    if (lastUserIndex < 0) {
      return;
    }
    const content = thread.messages[lastUserIndex]?.content ?? "";
    const source = { ...thread, messages: thread.messages.slice(0, lastUserIndex) };
    persist(source);
    await send(content, source);
  }, [persist, send, thread]);

  const value = useMemo<GuideContextValue>(
    () => ({
      open,
      view,
      sending,
      error,
      unread,
      plusOpen,
      thread,
      threads,
      draft,
      experienceId,
      experienceTitle,
      experienceImage,
      experienceLocation,
      favorites,
      savedPlans,
      setDraft,
      setPlusOpen,
      openGuide,
      closeGuide,
      minimizeGuide,
      startThread,
      send,
      regenerate,
      openThread: (id) => {
        const found = threads.find((item) => item.id === id);
        if (found) {
          setThread(found);
          setView("chat");
          setOpen(true);
        }
      },
      deleteThread: (id) => {
        if (!user) {
          return;
        }
        const next = threads.filter((item) => item.id !== id);
        setThreads(next);
        saveThreads(user.id, next);
        if (thread?.id === id) {
          setThread(null);
          setView("home");
        }
      },
      setView,
      toggleFavorite: (id) => {
        if (!user) {
          return;
        }
        setFavorites(toggleFavoriteId(user.id, id));
      },
      persistPlan: (plan) => {
        if (!user) {
          return;
        }
        setSavedPlans(savePlan(user.id, plan).filter(Boolean) as NonNullable<GuideStoredMessage["plan"]>[]);
      },
    }),
    [
      closeGuide,
      draft,
      error,
      experienceId,
      experienceImage,
      experienceLocation,
      experienceTitle,
      favorites,
      minimizeGuide,
      open,
      openGuide,
      plusOpen,
      regenerate,
      savedPlans,
      send,
      sending,
      startThread,
      thread,
      threads,
      unread,
      user,
      view,
    ],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide() {
  const value = useContext(GuideContext);
  if (!value) {
    throw new Error("useGuide debe usarse dentro de GuideProvider");
  }
  return value;
}
