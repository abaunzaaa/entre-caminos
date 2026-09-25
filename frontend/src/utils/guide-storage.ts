const PREFIX = "ec_guide_";

export type GuideStoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  experiences?: Array<{
    id: string;
    title: string;
    location: string;
    price: string | number;
    duration: string | null;
    category: string | null;
    imageUrl: string | null;
  }>;
  plan?: {
    title: string;
    city: string;
    date?: string;
    duration: string;
    people: string;
    tags?: string[];
    coverImageUrl?: string | null;
    experiences: string[];
    itinerary?: Array<{
      time: string;
      title: string;
      subtitle: string;
      imageUrl: string | null;
    }>;
  } | null;
  planProgress?: { step: number; total: number } | null;
  suggestions?: string[];
  status?: "ok" | "empty" | "need_info";
};

export type GuideThread = {
  id: string;
  title: string;
  updatedAt: string;
  experienceId?: string;
  folderId?: string;
  messages: GuideStoredMessage[];
};

export type GuideFolder = {
  id: string;
  name: string;
};

function key(userId: string) {
  return `${PREFIX}threads_${userId}`;
}

function favoritesKey(userId: string) {
  return `${PREFIX}favorites_${userId}`;
}

function foldersKey(userId: string) {
  return `${PREFIX}folders_${userId}`;
}

function plansKey(userId: string) {
  return `${PREFIX}plans_${userId}`;
}

const DEFAULT_FOLDERS: GuideFolder[] = [
  { id: "f_planes", name: "Mis planes" },
  { id: "f_destinos", name: "Destinos" },
  { id: "f_favoritas", name: "Experiencias favoritas" },
  { id: "f_ideas", name: "Ideas de viaje" },
];

export function loadFolders(userId: string): GuideFolder[] {
  const stored = readJson<GuideFolder[]>(foldersKey(userId), []);
  return stored.length ? stored : DEFAULT_FOLDERS;
}

export function saveFolders(userId: string, folders: GuideFolder[]) {
  writeJson(foldersKey(userId), folders.slice(0, 16));
}

export function newFolderId() {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function readJson<T>(storageKey: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storageKey: string, value: unknown) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function loadThreads(userId: string): GuideThread[] {
  return readJson(key(userId), []);
}

export function saveThreads(userId: string, threads: GuideThread[]) {
  writeJson(key(userId), threads.slice(0, 20));
}

export function loadFavoriteIds(userId: string): string[] {
  return readJson(favoritesKey(userId), []);
}

export function toggleFavoriteId(userId: string, experienceId: string) {
  const current = loadFavoriteIds(userId);
  const next = current.includes(experienceId)
    ? current.filter((id) => id !== experienceId)
    : [experienceId, ...current];
  writeJson(favoritesKey(userId), next);
  return next;
}

export function loadSavedPlans(userId: string) {
  return readJson<GuideStoredMessage["plan"][]>(plansKey(userId), []);
}

export function savePlan(userId: string, plan: NonNullable<GuideStoredMessage["plan"]>) {
  const next = [plan, ...loadSavedPlans(userId).filter((item) => item?.title !== plan.title)].slice(0, 12);
  writeJson(plansKey(userId), next);
  return next;
}

export function newMessageId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newThreadId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function titleFromText(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 42) {
    return clean || "Nueva conversación";
  }
  return `${clean.slice(0, 42).trim()}…`;
}
