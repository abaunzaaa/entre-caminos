import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/api-error";
import {
  chronologicalMessages,
  loadActiveConversationId,
  loadFavoriteIds,
  loadSavedPlans,
  saveActiveConversationId,
  savePlan,
  isBlankThread,
  isPersistedConversationId,
  isPlaceholderTitle,
  titleFromText,
  toggleFavoriteId,
  type GuideFolder,
  type GuideStoredMessage,
  type GuideThread,
} from "../../utils/guide-storage";
import {
  conversationToThread,
  createGuideConversation,
  createGuideFolder,
  deleteGuideConversation,
  deleteGuideFolder,
  getGuideConversation,
  listGuideConversations,
  listGuideFolders,
  patchGuideConversation,
  patchGuideFolder,
  sendGuideMessage,
  type GuideConversation,
  type GuideFolderPayload,
  type GuideReply,
} from "../../services/guide.service";
import type { Experience } from "../../types";
import { GuideContext, type GuideContextValue, type GuideView } from "./GuideContext";

function folderFromApi(folder: GuideFolderPayload): GuideFolder {
  return {
    id: folder.id,
    name: folder.name,
    icon: folder.icon ?? "folder",
  };
}

function snapshotExperience(item: Experience) {
  return {
    id: item.id,
    name: item.title,
    category: item.category?.name,
    location: item.location,
    price: item.price,
    duration: item.duration ?? undefined,
    description: item.description,
    availableDays: item.availability,
    howToGetThere: item.howToGetThere ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
  };
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const experienceId = location.pathname.match(/^\/explorar\/([^/]+)$/)?.[1];
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<GuideView>("home");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<GuideThread | null>(null);
  const [threads, setThreads] = useState<GuideThread[]>([]);
  const [folders, setFolders] = useState<GuideFolder[]>([]);
  const [folderFilter, setFolderFilter] = useState<string>();
  const [threadQuery, setThreadQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedPlans, setSavedPlans] = useState<NonNullable<GuideStoredMessage["plan"]>[]>([]);
  const [experienceTitle, setExperienceTitle] = useState<string>();
  const [experienceImage, setExperienceImage] = useState<string>();
  const [experienceLocation, setExperienceLocation] = useState<string>();
  const [experienceContext, setExperienceContext] = useState<{
    id: string;
    name: string;
    category?: string;
    location: string;
    price?: string | number;
    duration?: string;
    description?: string;
    availableDays?: unknown;
    howToGetThere?: string;
    imageUrl?: string;
  }>();
  const [catalogFocus, setCatalogFocusState] = useState<Experience | null>(null);
  const sendingRef = useRef(false);
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setThreads([]);
      setThread(null);
      setFolders([]);
      setFavorites([]);
      setSavedPlans([]);
      return;
    }
    try {
      setFavorites(loadFavoriteIds(user.id));
      setSavedPlans(loadSavedPlans(user.id).filter(Boolean) as NonNullable<GuideStoredMessage["plan"]>[]);
    } catch {
      setFavorites([]);
      setSavedPlans([]);
    }
    let cancelled = false;
    const load = () =>
      Promise.all([
        listGuideConversations().catch(() => null),
        listGuideFolders().catch(() => null),
      ]).then(([rows, folderRows]) => {
        if (cancelled) {
          return;
        }
        if (folderRows) {
          setFolders(folderRows.map(folderFromApi));
        }
        if (rows) {
          const mapped = rows.map(conversationToThread);
          setThreads(mapped);
          const activeId = loadActiveConversationId(user.id);
          setThread((current) => {
            if (current) {
              return mapped.find((item) => item.id === current.id) ?? current;
            }
            return mapped.find((item) => item.id === activeId) ?? mapped[0] ?? null;
          });
        }
      });
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, open]);

  useEffect(() => {
    let cancelled = false;
    const lookupId = thread?.experienceId || experienceId;
    if (!lookupId) {
      if (!catalogFocus) {
        setExperienceTitle(undefined);
        setExperienceImage(undefined);
        setExperienceLocation(undefined);
        setExperienceContext(undefined);
      }
      return;
    }
    import("../../services/catalog.service").then(({ getPublicExperience }) =>
      getPublicExperience(lookupId)
        .then((item) => {
          if (!cancelled) {
            const snap = snapshotExperience(item);
            setExperienceTitle(snap.name);
            setExperienceImage(snap.imageUrl);
            setExperienceLocation(snap.location);
            setExperienceContext(snap);
          }
        })
        .catch(() => {
          if (!cancelled && !catalogFocus) {
            setExperienceTitle(undefined);
            setExperienceImage(undefined);
            setExperienceLocation(undefined);
            setExperienceContext(undefined);
          }
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [catalogFocus, experienceId, thread?.experienceId]);

  const persist = useCallback(
    (next: GuideThread) => {
      if (!user) {
        return;
      }
      const clean = { ...next, messages: chronologicalMessages(next.messages) };
      setThread(clean);
      if (clean.id.startsWith("local_thread_")) {
        return;
      }
      setThreads((current) => [
        clean,
        ...current.filter((item) => item.id !== clean.id && !item.id.startsWith("local_thread_")),
      ]);
      saveActiveConversationId(user.id, clean.id);
    },
    [user],
  );

  const applyConversation = useCallback(
    (conversation: GuideConversation) => {
      const next = conversationToThread(conversation);
      persist(next);
      const data = conversation.experienceData;
      if (conversation.contextType === "experience" && (conversation.experienceId || data?.id)) {
        setExperienceTitle(data?.name ?? conversation.experienceName ?? undefined);
        setExperienceImage(data?.imageUrl);
        setExperienceLocation(data?.location);
        setExperienceContext({
          id: data?.id ?? conversation.experienceId ?? "",
          name: data?.name ?? conversation.experienceName ?? "",
          category: data?.category,
          location: data?.location ?? "",
          price: data?.price,
          duration: data?.duration,
          description: data?.description,
          availableDays: data?.availableDays,
          howToGetThere: data?.howToGetThere,
          imageUrl: data?.imageUrl,
        });
      }
      return next;
    },
    [persist],
  );

  useEffect(() => {
    if (!open || !user || thread || experienceId || !threads.length) {
      return;
    }
    const activeId = loadActiveConversationId(user.id);
    const recent = threads.find((item) => item.id === activeId) ?? threads[0];
    if (!recent) {
      return;
    }
    let cancelled = false;
    getGuideConversation(recent.id)
      .then((conversation) => {
        if (cancelled) {
          return;
        }
        applyConversation(conversation);
        if (conversation.messages.length) {
          setView("chat");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [applyConversation, experienceId, open, thread, threads, user]);

  const closeGuide = useCallback(() => {
    setOpen(false);
    setExpanded(false);
    setPlusOpen(false);
  }, []);

  const minimizeGuide = useCallback(() => {
    setOpen(false);
    setExpanded(false);
    setPlusOpen(false);
    if (thread?.messages.length) {
      setUnread(true);
    }
  }, [thread]);

  const toggleExpand = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  const newConversation = useCallback((folderId?: string) => {
    setPlusOpen(false);
    setError("");
    setDraft("");
    if (!user) {
      return;
    }
    const targetFolder = folderId;
    const blanks = threads.filter(
      (item) =>
        isBlankThread(item) &&
        (item.folderId ?? undefined) === targetFolder &&
        (experienceId ? item.experienceId === experienceId : !item.experienceId),
    );
    const keep = blanks[0];
    if (keep) {
      setThread(keep);
      saveActiveConversationId(user.id, keep.id);
      if (targetFolder) {
        setFolderFilter(targetFolder);
      }
      setView("chat");
      return;
    }
    if (creatingRef.current) {
      return;
    }
    creatingRef.current = true;
    void (async () => {
      try {
        const snap = experienceId ? experienceContext : undefined;
        const created = await createGuideConversation(
          experienceId
            ? {
                contextType: "experience",
                experienceId,
                experienceName: experienceTitle ?? snap?.name,
                experienceData: snap,
              }
            : { contextType: "general" },
        );
        applyConversation(created);
        if (targetFolder) {
          setThreads((current) =>
            current.map((item) => (item.id === created.id ? { ...item, folderId: targetFolder } : item)),
          );
          setThread((current) => (current?.id === created.id ? { ...current, folderId: targetFolder } : current));
          void patchGuideConversation(created.id, { folderId: targetFolder }).catch(() => undefined);
          setFolderFilter(targetFolder);
        }
        setView("chat");
      } catch (err) {
        setError(getApiErrorMessage(err, "No pude crear la conversación."));
      } finally {
        creatingRef.current = false;
      }
    })();
  }, [applyConversation, experienceContext, experienceId, experienceTitle, threads, user]);

  const setCatalogFocus = useCallback((experience?: Experience | null) => {
    setCatalogFocusState(experience ?? null);
    if (experience) {
      const snap = snapshotExperience(experience);
      setExperienceTitle(snap.name);
      setExperienceImage(snap.imageUrl);
      setExperienceLocation(snap.location);
      setExperienceContext(snap);
    }
  }, []);

  const send = useCallback(
    async (text?: string, source?: GuideThread | null) => {
      const content = (text ?? draft).trim();
      if (!content || sendingRef.current || !user) {
        return;
      }
      sendingRef.current = true;
      setDraft("");
      setSending(true);
      setError("");
      setView("chat");
      let base = source ?? thread;
      try {
        if (!isPersistedConversationId(base?.id)) {
          const snap = experienceId ? experienceContext : undefined;
          const created = await createGuideConversation(
            experienceId
              ? {
                  contextType: "experience",
                  experienceId,
                  experienceName: experienceTitle ?? snap?.name,
                  experienceData: snap,
                }
              : { contextType: "general" },
          );
          base = conversationToThread(created);
          const targetFolder = folderFilter && folderFilter !== "__fav__" ? folderFilter : undefined;
          if (targetFolder) {
            base = { ...base, folderId: targetFolder };
            void patchGuideConversation(created.id, { folderId: targetFolder }).catch(() => undefined);
          }
        }
        if (!base) {
          throw new Error("missing conversation");
        }
      } catch (err) {
        sendingRef.current = false;
        setSending(false);
        setError(getApiErrorMessage(err, "No pude guardar la conversación."));
        return;
      }
      const now = new Date().toISOString();
      const userMessage: GuideStoredMessage = {
        id: `local_${Date.now()}`,
        conversationId: base.id,
        role: "user",
        content,
        createdAt: now,
      };
      const nextTitle = titleFromText(content);
      const keepTitle =
        (base.messages.some((item) => item.role === "user") && !isPlaceholderTitle(base.title)) ||
        nextTitle === "Nueva conversación";
      persist({
        ...base,
        title: keepTitle ? base.title : nextTitle,
        updatedAt: now,
        messages: chronologicalMessages([...base.messages, userMessage]),
      });
      try {
        const activeExperienceId = source?.experienceId ?? base.experienceId ?? experienceId;
        const focused =
          experienceContext?.id === activeExperienceId
            ? experienceContext
            : catalogFocus && catalogFocus.id === activeExperienceId
              ? snapshotExperience(catalogFocus)
              : activeExperienceId
                ? { id: activeExperienceId, name: experienceTitle }
                : undefined;
        const reply: GuideReply = await sendGuideMessage({
          message: content,
          conversationId: base.id,
          history: (base.messages ?? []).map((item) => ({ role: item.role, content: item.content })),
          experienceId: activeExperienceId,
          context: activeExperienceId
            ? {
                mode: "experience",
                experience: focused,
              }
            : { mode: "general" },
          location: user.profile
            ? {
                city: user.profile.city ?? user.city ?? undefined,
                latitude: user.profile.latitude ?? undefined,
                longitude: user.profile.longitude ?? undefined,
              }
            : user.city
              ? { city: user.city }
              : undefined,
        });
        applyConversation(reply.conversation);
      } catch (err) {
        setError(getApiErrorMessage(err, "No pude conectar con el guía. Intenta de nuevo."));
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [
      applyConversation,
      catalogFocus,
      draft,
      experienceContext,
      experienceId,
      experienceTitle,
      persist,
      folderFilter,
      thread,
      user,
    ],
  );

  const openGuide = useCallback(
    (opts?: { prompt?: string; view?: GuideView; experience?: Experience }) => {
      setOpen(true);
      setUnread(false);
      setError("");
      if (opts?.prompt) {
        setDraft(opts.prompt);
      }
      const onExploreHome = /^\/explorar\/?$/.test(location.pathname);
      const featured = opts?.experience ?? (onExploreHome ? catalogFocus : null);
      const focusId = featured?.id ?? experienceId;
      if (featured) {
        const snap = snapshotExperience(featured);
        setExperienceTitle(snap.name);
        setExperienceImage(snap.imageUrl);
        setExperienceLocation(snap.location);
        setExperienceContext(snap);
      }
      void (async () => {
        try {
          if (focusId) {
            const existing = threads.find((item) => item.experienceId === focusId);
            if (existing && thread?.id === existing.id) {
              setView("chat");
              return;
            }
            if (existing) {
              const conversation = await getGuideConversation(existing.id);
              applyConversation(conversation);
              setView("chat");
              return;
            }
            const created = await createGuideConversation({
              contextType: "experience",
              experienceId: focusId,
              experienceName: featured?.title ?? experienceTitle,
              experienceData: featured ? snapshotExperience(featured) : experienceContext,
            });
            applyConversation(created);
            setView("chat");
            return;
          }
          if (thread?.messages.length) {
            setView("chat");
            return;
          }
          const activeId = user ? loadActiveConversationId(user.id) : null;
          const recent = threads.find((item) => item.id === activeId) ?? threads[0];
          if (recent) {
            const conversation = await getGuideConversation(recent.id);
            applyConversation(conversation);
            setView(conversation.messages.length ? "chat" : "home");
            return;
          }
          setView(opts?.view ?? "home");
        } catch (err) {
          setError(getApiErrorMessage(err, "No pude abrir la conversación."));
          setView(opts?.view ?? "home");
        }
      })();
    },
    [
      applyConversation,
      catalogFocus,
      experienceContext,
      experienceId,
      experienceTitle,
      location.pathname,
      thread,
      threads,
      user,
    ],
  );

  const startThread = useCallback(
    (prompt?: string) => {
      setError("");
      void (async () => {
        try {
          const created = await createGuideConversation(
            experienceId
              ? {
                  contextType: "experience",
                  experienceId,
                  experienceName: experienceTitle,
                  experienceData: experienceContext,
                }
              : { contextType: "general" },
          );
          const next = applyConversation(created);
          setView("chat");
          if (prompt) {
            void send(prompt, next);
          }
        } catch (err) {
          setError(getApiErrorMessage(err, "No pude crear la conversación."));
        }
      })();
    },
    [applyConversation, experienceContext, experienceId, experienceTitle, send],
  );

  const startFlow = useCallback(
    (kind: "plan" | "search" | "nearby" | "interests") => {
      if (!user) {
        return;
      }
      setPlusOpen(false);
      setError("");
      setDraft("");
      void (async () => {
        try {
          const created = await createGuideConversation({
            contextType: experienceId ? "experience" : "general",
            experienceId,
            experienceName: experienceTitle,
            experienceData: experienceContext,
            starter: kind,
          });
          applyConversation(created);
          setView("chat");
        } catch (err) {
          setError(getApiErrorMessage(err, "No pude iniciar el flujo."));
        }
      })();
    },
    [applyConversation, experienceContext, experienceId, experienceTitle, user],
  );

  const toggleConversationFavorite = useCallback(
    (id: string) => {
      const current = threads.find((item) => item.id === id);
      if (!current) {
        return;
      }
      const nextFavorite = !current.favorite;
      setThreads((list) => list.map((item) => (item.id === id ? { ...item, favorite: nextFavorite } : item)));
      if (thread?.id === id) {
        setThread({ ...thread, favorite: nextFavorite });
      }
      void patchGuideConversation(id, { favorite: nextFavorite }).catch(() => undefined);
    },
    [thread, threads],
  );

  const toggleConversationPinned = useCallback(
    (id: string) => {
      const current = threads.find((item) => item.id === id);
      if (!current) {
        return;
      }
      const nextPinned = !current.pinned;
      setThreads((list) => list.map((item) => (item.id === id ? { ...item, pinned: nextPinned } : item)));
      if (thread?.id === id) {
        setThread({ ...thread, pinned: nextPinned });
      }
      void patchGuideConversation(id, { pinned: nextPinned }).catch(() => undefined);
    },
    [thread, threads],
  );

  const regenerate = useCallback(async () => {
    if (!thread?.id || sendingRef.current || !isPersistedConversationId(thread.id)) {
      setError("No pude regenerar esta respuesta.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      const reply = await sendGuideMessage({
        conversationId: thread.id,
        regenerate: true,
      });
      applyConversation(reply.conversation);
    } catch (err) {
      setError(getApiErrorMessage(err, "No pude regenerar la respuesta."));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [applyConversation, thread]);

  const value = useMemo<GuideContextValue>(
    () => ({
      open,
      expanded,
      view,
      sending,
      error,
      unread,
      plusOpen,
      thread,
      threads,
      folders,
      folderFilter,
      threadQuery,
      draft,
      experienceId,
      experienceTitle,
      experienceImage,
      experienceLocation,
      favorites,
      savedPlans,
      setDraft,
      setPlusOpen,
      setCatalogFocus,
      openGuide,
      closeGuide,
      minimizeGuide,
      toggleExpand,
      newConversation,
      startThread,
      startFlow,
      send,
      regenerate,
      openThread: (id) => {
        const local = threads.find((item) => item.id === id);
        if (local) {
          setThread(local);
          setView("chat");
          setOpen(true);
          if (user) {
            saveActiveConversationId(user.id, id);
          }
        }
        void (async () => {
          try {
            const conversation = await getGuideConversation(id);
            applyConversation(conversation);
            setView("chat");
            setOpen(true);
          } catch (err) {
            if (!local) {
              setError(getApiErrorMessage(err, "No pude abrir la conversación."));
            }
          }
        })();
      },
      deleteThread: (id) => {
        if (!user) {
          return;
        }
        void deleteGuideConversation(id)
          .then(() => {
            const next = threads.filter((item) => item.id !== id);
            setThreads(next);
            if (thread?.id === id) {
              setThread(null);
              setView("home");
              saveActiveConversationId(user.id, next[0]?.id);
            }
          })
          .catch((err) => {
            setError(getApiErrorMessage(err, "No pude eliminar la conversación."));
          });
      },
      setView,
      toggleFavorite: (id) => {
        if (!user) {
          return;
        }
        setFavorites(toggleFavoriteId(user.id, id));
      },
      toggleConversationFavorite,
      toggleConversationPinned,
      persistPlan: (plan) => {
        if (!user) {
          return;
        }
        setSavedPlans(savePlan(user.id, plan).filter(Boolean) as NonNullable<GuideStoredMessage["plan"]>[]);
      },
      setThreadQuery,
      setFolderFilter,
      createFolder: (name, icon) => {
        if (!user) {
          return;
        }
        void createGuideFolder({ name: name.trim() || "Nueva carpeta", icon: icon || "folder" })
          .then((folder) => {
            setFolders((current) => [...current, folderFromApi(folder)].slice(0, 16));
          })
          .catch((err) => {
            setError(getApiErrorMessage(err, "No pude crear la carpeta."));
          });
      },
      renameFolder: (id, name) => {
        if (!user) {
          return;
        }
        setFolders((current) => current.map((item) => (item.id === id ? { ...item, name } : item)));
        void patchGuideFolder(id, { name }).catch((err) => {
          setError(getApiErrorMessage(err, "No pude renombrar la carpeta."));
        });
      },
      setFolderIcon: (id, icon) => {
        if (!user) {
          return;
        }
        setFolders((current) => current.map((item) => (item.id === id ? { ...item, icon } : item)));
        void patchGuideFolder(id, { icon }).catch((err) => {
          setError(getApiErrorMessage(err, "No pude actualizar el icono."));
        });
      },
      deleteFolder: (id) => {
        if (!user) {
          return;
        }
        const previous = folders;
        setFolders(folders.filter((item) => item.id !== id));
        setThreads((current) =>
          current.map((item) => (item.folderId === id ? { ...item, folderId: undefined } : item)),
        );
        if (folderFilter === id) {
          setFolderFilter(undefined);
        }
        void deleteGuideFolder(id).catch((err) => {
          setFolders(previous);
          setError(getApiErrorMessage(err, "No pude eliminar la carpeta."));
        });
      },
      assignThreadFolder: (threadId, folderId) => {
        if (!user) {
          return;
        }
        setThreads((current) => current.map((item) => (item.id === threadId ? { ...item, folderId } : item)));
        if (thread?.id === threadId) {
          setThread((current) => (current ? { ...current, folderId } : current));
        }
        void patchGuideConversation(threadId, { folderId: folderId ?? null }).catch((err) => {
          setError(getApiErrorMessage(err, "No pude mover la conversación."));
        });
      },
      renameThread: (id, title) => {
        if (!user) {
          return;
        }
        const nextTitle = title.trim();
        if (!nextTitle) {
          return;
        }
        setThreads((current) => current.map((item) => (item.id === id ? { ...item, title: nextTitle } : item)));
        if (thread?.id === id) {
          setThread((current) => (current ? { ...current, title: nextTitle } : current));
        }
        void patchGuideConversation(id, { title: nextTitle }).catch((err) => {
          setError(getApiErrorMessage(err, "No pude renombrar la conversación."));
        });
      },
    }),
    [
      applyConversation,
      closeGuide,
      draft,
      error,
      expanded,
      experienceId,
      experienceImage,
      experienceLocation,
      experienceTitle,
      favorites,
      folderFilter,
      folders,
      minimizeGuide,
      newConversation,
      open,
      openGuide,
      plusOpen,
      regenerate,
      savedPlans,
      send,
      sending,
      setCatalogFocus,
      startFlow,
      startThread,
      thread,
      threadQuery,
      threads,
      toggleConversationFavorite,
      toggleConversationPinned,
      toggleExpand,
      unread,
      user,
      view,
    ],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}
