import { createContext, useContext } from "react";
import type { Experience } from "../../types";
import type { GuideFolder, GuideStoredMessage, GuideThread } from "../../utils/guide-storage";

export type GuideView = "home" | "chat" | "history";

export type GuideContextValue = {
  open: boolean;
  expanded: boolean;
  view: GuideView;
  sending: boolean;
  error: string;
  unread: boolean;
  plusOpen: boolean;
  thread: GuideThread | null;
  threads: GuideThread[];
  folders: GuideFolder[];
  folderFilter?: string;
  threadQuery: string;
  draft: string;
  experienceId?: string;
  experienceTitle?: string;
  experienceImage?: string;
  experienceLocation?: string;
  favorites: string[];
  savedPlans: NonNullable<GuideStoredMessage["plan"]>[];
  setDraft: (value: string) => void;
  setPlusOpen: (value: boolean) => void;
  openGuide: (opts?: { prompt?: string; view?: GuideView; experience?: Experience; expanded?: boolean }) => void;
  setCatalogFocus: (experience?: Experience | null) => void;
  closeGuide: () => void;
  minimizeGuide: () => void;
  toggleExpand: () => void;
  newConversation: (folderId?: string) => void;
  startThread: (prompt?: string) => void;
  startFlow: (kind: "plan" | "search" | "nearby" | "interests") => void;
  send: (text?: string) => Promise<void>;
  regenerate: () => Promise<void>;
  openThread: (id: string) => void;
  deleteThread: (id: string) => void;
  setView: (view: GuideView) => void;
  toggleFavorite: (id: string) => void;
  toggleConversationFavorite: (id: string) => void;
  toggleConversationPinned: (id: string) => void;
  persistPlan: (plan: NonNullable<GuideStoredMessage["plan"]>) => void;
  setThreadQuery: (value: string) => void;
  setFolderFilter: (id?: string) => void;
  createFolder: (name: string, icon?: string) => void;
  renameFolder: (id: string, name: string) => void;
  setFolderIcon: (id: string, icon: string) => void;
  deleteFolder: (id: string) => void;
  assignThreadFolder: (threadId: string, folderId?: string) => void;
  renameThread: (id: string, title: string) => void;
};

export const GuideContext = createContext<GuideContextValue | null>(null);

export function useGuide() {
  const value = useContext(GuideContext);
  if (!value) {
    throw new Error("useGuide debe usarse dentro de GuideProvider");
  }
  return value;
}
