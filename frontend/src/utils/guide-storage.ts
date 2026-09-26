const PREFIX = "ec_guide_";

export type GuideStoredMessage = {
  id: string;
  conversationId?: string;
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

export type GuideExperienceSnapshot = {
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
};

export type GuideThread = {
  id: string;
  title: string;
  updatedAt: string;
  experienceId?: string;
  experienceName?: string;
  folderId?: string;
  favorite?: boolean;
  pinned?: boolean;
  messages: GuideStoredMessage[];
};

export type GuideFolder = {
  id: string;
  name: string;
  icon?: string;
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
  { id: "f_planes", name: "Mis planes", icon: "folder" },
  { id: "f_destinos", name: "Destinos", icon: "map" },
  { id: "f_favoritas", name: "Experiencias favoritas", icon: "heart" },
  { id: "f_ideas", name: "Ideas de viaje", icon: "plane" },
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

export function chronologicalMessages(messages: GuideStoredMessage[] | undefined | null): GuideStoredMessage[] {
  if (!messages?.length) {
    return [];
  }
  const serverKeys = new Set(
    messages
      .filter((item) => item.id && !item.id.startsWith("local_"))
      .map((item) => `${item.role}:${item.content.trim()}`),
  );
  const seenIds = new Set<string>();
  const result: GuideStoredMessage[] = [];
  for (const message of messages) {
    if (!message?.content && message?.role !== "assistant") {
      continue;
    }
    if (message.id && seenIds.has(message.id)) {
      continue;
    }
    const key = `${message.role}:${message.content.trim()}`;
    if (message.id?.startsWith("local_") && serverKeys.has(key)) {
      continue;
    }
    const prev = result[result.length - 1];
    if (prev && prev.role === message.role && prev.content.trim() === message.content.trim()) {
      if (prev.id.startsWith("local_") && message.id && !message.id.startsWith("local_")) {
        result[result.length - 1] = message;
        seenIds.add(message.id);
      }
      continue;
    }
    if (message.id) {
      seenIds.add(message.id);
    }
    result.push(message);
  }
  return result;
}

export function newThreadId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const PLACEHOLDER_TITLES = new Set([
  "nueva conversación",
  "nuevo chat",
  "hoy",
  "ayer",
  "creando un plan",
  "nuevo plan",
  "buscar experiencias",
  "explorar cerca",
  "según mis intereses",
]);

export function isPersistedConversationId(id?: string | null) {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
}

export function isBlankThread(thread?: Pick<GuideThread, "title" | "messages"> | null) {
  if (!thread) {
    return false;
  }
  const hasContent = thread.messages.some((item) => item.content.trim());
  return !hasContent && isPlaceholderTitle(thread.title);
}

export function isPlaceholderTitle(value?: string | null) {
  const clean = (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!clean || PLACEHOLDER_TITLES.has(clean)) {
    return true;
  }
  if (/^(hoy|ayer)$/.test(clean)) {
    return true;
  }
  if (/^\d{1,2}:\d{2}/.test(clean) && clean.length < 20) {
    return true;
  }
  if (/\b(a\.?\s*m\.?|p\.?\s*m\.?)\b/.test(clean) && clean.length < 22) {
    return true;
  }
  return false;
}

function clipTitle(value: string) {
  return value.length <= 42 ? value : `${value.slice(0, 42).trim()}…`;
}

export function titleFromText(value: string) {
  let clean = value.replace(/\s+/g, " ").trim();
  clean = clean.replace(/^[¿¡]+/, "").replace(/[?!.]+$/g, "").trim();
  const lower = clean.toLowerCase();
  const generic = new Set(["hola", "hoy", "ok", "okay", "sí", "si", "no", "gracias", "hey", "buenas", "hello", "hi"]);
  if (!clean) {
    return "Nueva conversación";
  }
  if (PLACEHOLDER_TITLES.has(lower) || /^(hoy|ayer)$/.test(lower)) {
    return "Nueva conversación";
  }
  if (/^\d{1,2}:\d{2}/.test(lower) && clean.length < 20) {
    return "Nueva conversación";
  }
  if (generic.has(lower)) {
    return clipTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
  }
  if (clean.length < 3) {
    return "Nueva conversación";
  }

  const hacer = clean.match(/^qu[eé]\s+(puedo\s+|podemos\s+)?hacer\s+(en|por)\s+(.+)$/i);
  if (hacer) {
    const place = hacer[3].trim();
    return clipTitle(`Experiencias en ${place.charAt(0).toUpperCase()}${place.slice(1)}`);
  }

  const experiencias = clean.match(/experiencias?\s+(.+?)\s+en\s+(.+)$/i);
  if (experiencias) {
    const kind = experiencias[1].trim();
    const place = experiencias[2].trim();
    return clipTitle(`Experiencias ${kind} ${place.charAt(0).toUpperCase()}${place.slice(1)}`);
  }

  let rest = clean
    .replace(/^(créame|creame|crea|quiero|necesito|busca|búscame|buscame)\s+/i, "")
    .replace(/^(un|una|el|la)\s+/i, "")
    .trim();

  const planEn = rest.match(/^plan(?:\s+de)?\s+(.+?)\s+en\s+(.+)$/i);
  if (planEn) {
    const kind = planEn[1].trim();
    const place = planEn[2].trim();
    return clipTitle(`Plan ${kind} ${place.charAt(0).toUpperCase()}${place.slice(1)}`);
  }

  const conocer = clean.match(/(?:conocer\s+)?(?:lugares|experiencias?)\s+([^]+?)\s+en\s+(.+)$/i);
  if (conocer) {
    const kind = conocer[1].trim();
    const place = conocer[2].trim();
    return clipTitle(`Experiencias ${kind} ${place.charAt(0).toUpperCase()}${place.slice(1)}`);
  }

  if (/^plan(\b)/i.test(rest)) {
    rest = rest.replace(/^plan\s*/i, "Plan ").replace(/^Plan\s+de\s+/i, "Plan de ");
    if (!/^Plan\b/.test(rest)) {
      rest = `Plan ${rest}`;
    }
  }

  if (rest) {
    rest = rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  const titled = rest || clean.charAt(0).toUpperCase() + clean.slice(1);
  return clipTitle(titled);
}

function normalizeChipText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase().replace(/[¿?¡!.,;:]+/g, "");
}

const CATEGORY_CHIPS = ["Cultura", "Naturaleza", "Aventura", "Gastronomía"];
const DAY_CHIPS = ["Hoy", "Mañana", "Este fin de semana"];
const WHO_CHIPS = ["Solo", "En pareja", "Con amigos", "En familia"];
const BUDGET_CHIPS = ["Económico", "Medio", "Sin límite"];
const TIME_CHIPS = ["Unas horas", "Medio día", "Un día"];

function isCategoryChip(value: string) {
  return /^(cultura|naturaleza|gastronomia|aventura|relax|otra)$/i.test(normalizeChipText(value));
}

export function userChoiceChips(reply: string, suggestions?: string[] | null) {
  const replyNorm = normalizeChipText(reply);
  const chips: string[] = [];
  const seen = new Set<string>();
  for (const raw of suggestions ?? []) {
    const item = raw.replace(/\s+/g, " ").trim();
    if (!item || item.length > 42 || /[?]/.test(item)) {
      continue;
    }
    const key = normalizeChipText(item);
    if (!key || seen.has(key) || key === replyNorm) {
      continue;
    }
    if (replyNorm.includes(key) && key.length >= 18) {
      continue;
    }
    seen.add(key);
    chips.push(item);
  }
  const asksType = /qu[eé] tipo de (experiencia|plan)|tipo de experiencia quieres|qu[eé] tipo de experiencia/i.test(reply);
  const asksDay = /qu[eé] d[ií]a|en qu[eé] d[ií]a|para qu[eé] d[ií]a|qu[eé] fecha|cu[aá]ndo (te gustar|quieres|prefieres)/i.test(reply);
  const asksWho = /con qui[eé]n|para qui[eé]n|a solas/i.test(reply);
  const asksBudget = /presupuesto|cu[aá]nto (quieres|puedes )?gastar/i.test(reply);
  const asksTime = /cu[aá]nto tiempo|tiempo disponible|cu[aá]ntas horas/i.test(reply);

  if (asksDay) {
    const days = chips.filter((item) => !isCategoryChip(item));
    return days.length ? days : DAY_CHIPS;
  }
  if (asksWho) {
    const people = chips.filter((item) => !isCategoryChip(item));
    return people.length ? people : WHO_CHIPS;
  }
  if (asksBudget) {
    const budget = chips.filter((item) => !isCategoryChip(item));
    return budget.length ? budget : BUDGET_CHIPS;
  }
  if (asksTime) {
    const times = chips.filter((item) => !isCategoryChip(item));
    return times.length ? times : TIME_CHIPS;
  }
  if (asksType) {
    return chips.length ? chips : CATEGORY_CHIPS;
  }
  return chips;
}

function activeKey(userId: string) {
  return `${PREFIX}active_${userId}`;
}

export function loadActiveConversationId(userId: string) {
  return readJson<string | null>(activeKey(userId), null);
}

export function saveActiveConversationId(userId: string, id?: string | null) {
  if (!id) {
    window.localStorage.removeItem(activeKey(userId));
    return;
  }
  writeJson(activeKey(userId), id);
}
