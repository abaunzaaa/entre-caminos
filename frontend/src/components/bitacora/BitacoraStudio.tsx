import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  Copy,
  Image as ImageIcon,
  Italic,
  LayoutTemplate,
  Minus,
  MoreHorizontal,
  Palette,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
  Check,
  CircleAlert,
  LoaderCircle,
} from "lucide-react";
import { deleteBitacoraAsset, loadBitacora, peekBitacora, saveBitacora, uploadBitacoraPhoto } from "../../services/bitacora.service";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import { KeyConfirmDialog } from "../ui/KeyConfirmDialog";
import { SuccessConfirmDialog } from "../ui/SuccessConfirmDialog";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import { BitacoraBook } from "./BitacoraBook";
import { filterStickers, stickerById, STICKERS, type StickerCategory } from "./catalog";
import { ensureBitacoraFonts, FONT_CLASS } from "./fonts";
import { createHistory, historyCommit, historyRedo, historyReplace, historyUndo, type HistoryState } from "./history";
import { writeBitacoraDrop, type BitacoraDrop } from "./PageCanvas";
import { createPage, templateSketch } from "./templates";
import {
  clamp,
  FONTS,
  FONT_GROUPS,
  nextZ,
  normalizeLayers,
  PAPERS,
  TEMPLATES,
  TEXT_COLORS,
  uid,
  type BitacoraAsset,
  type BitElement,
  type FontGroup,
  type FrameId,
  type PageDoc,
  type PhotoElement,
  type TemplateId,
  type TextElement,
  type ToolId,
} from "./types";

const SKIP_KEY = "ec-bitacora-skip-open";
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

type SaveStatus = "idle" | "saving" | "saved" | "error";

type DockDensity = "wide" | "medium" | "compact";

function useMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setMobile(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

function useDockDensity(ref: RefObject<HTMLDivElement | null>) {
  const [density, setDensity] = useState<DockDensity>("wide");
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    let frame = 0;
    const apply = () => {
      const width = node.clientWidth;
      const next: DockDensity = width >= 960 ? "wide" : width >= 760 ? "medium" : "compact";
      setDensity((current) => (current === next ? current : next));
    };
    apply();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);
  return density;
}

function findSelected(pages: PageDoc[], id: string | null) {
  if (!id) {
    return null;
  }
  for (const page of pages) {
    const element = page.elements.find((item) => item.id === id);
    if (element) {
      return { page, element };
    }
  }
  return null;
}

export function BitacoraStudio() {
  const navigate = useNavigate();
  const mobile = useMobile();
  const dockRef = useRef<HTMLDivElement>(null);
  const dockDensity = useDockDensity(dockRef);
  const opening = peekBitacora();
  const [history, setHistory] = useState<HistoryState<PageDoc[]>>(createHistory(opening?.pages ?? []));
  const [assets, setAssets] = useState<BitacoraAsset[]>(() => opening?.assets ?? []);
  const [loaded, setLoaded] = useState(() => Boolean(opening));
  const [loadNonce, setLoadNonce] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirty, setDirty] = useState(false);
  const [saveTick, setSaveTick] = useState(0);
  const [tool, setTool] = useState<ToolId>("stickers");
  const [panelOpen, setPanelOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StickerCategory | "todas">("todas");
  const [cursor, setCursor] = useState(0);
  const [activePageId, setActivePageId] = useState<string | null>(opening?.pages[0]?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paperBoth, setPaperBoth] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "page" | "asset"; id: string } | { kind: "template"; id: TemplateId } | null>(null);
  const [notice, setNotice] = useState<
    { kind: "saved" } | { kind: "error"; title: string; description: string; retry: "save" | "upload" | "none" } | null
  >(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [opened, setOpened] = useState(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return true;
    }
    try {
      return sessionStorage.getItem(SKIP_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [coverLeaving, setCoverLeaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef(false);
  const confirmLock = useRef(false);
  const presentRef = useRef<PageDoc[]>([]);
  const baseRef = useRef<PageDoc[] | null>(null);
  const activeRef = useRef<string | null>(null);
  const cursorRef = useRef(0);
  const dirtyRef = useRef(false);
  const loadedRef = useRef(Boolean(opening));
  const saveChain = useRef(Promise.resolve());
  const ticketRef = useRef(0);
  const pages = history.present;
  presentRef.current = pages;
  activeRef.current = activePageId;
  cursorRef.current = cursor;

  const selected = findSelected(pages, selectedId);

  useEffect(() => {
    let active = true;
    if (loadNonce > 0) {
      setLoaded(false);
      loadedRef.current = false;
      setLoadError("");
    }
    void loadBitacora({ fresh: loadNonce > 0 })
      .then((bundle) => {
        if (!active) {
          return;
        }
        presentRef.current = bundle.pages;
        setHistory(createHistory(bundle.pages));
        setAssets(bundle.assets);
        setActivePageId((current) => current ?? bundle.pages[0]?.id ?? null);
        setLoaded(true);
        loadedRef.current = true;
      })
      .catch((error) => {
        if (active) {
          setLoadError(getApiErrorMessage(error, "No pudimos abrir tu bitácora."));
        }
      });
    return () => {
      active = false;
    };
  }, [loadNonce]);

  useEffect(() => {
    if (!mobile) {
      setCursor((current) => current - (current % 2));
    }
  }, [mobile]);

  useEffect(() => {
    if (cursor > Math.max(0, pages.length - 1)) {
      setCursor(Math.max(0, mobile ? pages.length - 1 : pages.length - (pages.length % 2 === 0 ? 2 : 1)));
    }
  }, [cursor, mobile, pages.length]);

  useEffect(() => {
    if (!pages.length) {
      return;
    }
    const index = Math.min(Math.max(cursor, 0), pages.length - 1);
    const visible = [pages[index]?.id, mobile ? undefined : pages[index + 1]?.id].filter((id): id is string => Boolean(id));
    if (activePageId && visible.includes(activePageId)) {
      return;
    }
    setActivePageId(visible[0] ?? null);
  }, [activePageId, cursor, mobile, pages]);

  useEffect(() => {
    ensureBitacoraFonts();
  }, []);

  useEffect(() => {
    setAdjusting(false);
  }, [selectedId]);

  const flushRef = useRef<() => Promise<"saved" | "error" | "pending" | "skipped">>(async () => "skipped");

  async function flush(announce = false) {
    const run = async () => {
      if (!loadedRef.current) {
        return "skipped" as const;
      }
      const stamp = ticketRef.current;
      const pagesNow = presentRef.current;
      setStatus("saving");
      try {
        await saveBitacora(pagesNow);
        if (ticketRef.current !== stamp) {
          return "pending" as const;
        }
        dirtyRef.current = false;
        setDirty(false);
        setStatus("saved");
        setMessage("");
        if (announce) {
          setNotice({ kind: "saved" });
        }
        return "saved" as const;
      } catch (error) {
        if (ticketRef.current !== stamp) {
          return "pending" as const;
        }
        const description = getApiErrorMessage(error, "Tus páginas siguen en el editor.");
        setStatus("error");
        setMessage(description);
        setNotice({
          kind: "error",
          title: "No se pudieron guardar los cambios",
          description,
          retry: "save",
        });
        return "error" as const;
      }
    };
    const next = saveChain.current.then(run, run);
    saveChain.current = next.then(() => undefined, () => undefined);
    return next;
  }
  flushRef.current = flush;

  useEffect(() => {
    if (!loaded || opened) {
      return;
    }
    const timer = window.setTimeout(() => setCoverLeaving(true), 240);
    return () => window.clearTimeout(timer);
  }, [loaded, opened]);

  useEffect(() => {
    if (!coverLeaving || opened) {
      return;
    }
    const timer = window.setTimeout(() => setOpened(true), 960);
    return () => window.clearTimeout(timer);
  }, [coverLeaving, opened]);

  useEffect(() => {
    if (!dirty || !loaded) {
      return;
    }
    const timer = window.setTimeout(() => {
      void flushRef.current();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [dirty, loaded, saveTick]);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (dirtyRef.current || status === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [status]);

  useEffect(() => {
    return () => {
      if (dirtyRef.current && loadedRef.current) {
        void flushRef.current();
      }
    };
  }, []);

  function markDirty() {
    ticketRef.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    setSaveTick((value) => value + 1);
    setStatus("idle");
  }

  function commit(next: PageDoc[]) {
    const before = presentRef.current;
    presentRef.current = next;
    setHistory((state) => historyCommit({ past: state.past, present: before, future: state.future }, next));
    markDirty();
  }

  function live(next: PageDoc[]) {
    presentRef.current = next;
    setHistory((state) => historyReplace(state, next));
  }

  function mapElement(pageId: string, element: BitElement, pagesNow: PageDoc[]) {
    return pagesNow.map((page) =>
      page.id === pageId ? { ...page, elements: page.elements.map((item) => (item.id === element.id ? element : item)) } : page,
    );
  }

  function beginGesture() {
    if (!baseRef.current) {
      baseRef.current = presentRef.current;
    }
    setDragging(true);
  }

  function endGesture() {
    const base = baseRef.current;
    baseRef.current = null;
    setDragging(false);
    if (!base) {
      return;
    }
    const next = presentRef.current;
    if (JSON.stringify(base) === JSON.stringify(next)) {
      return;
    }
    setHistory((state) => historyCommit({ past: state.past, present: base, future: state.future }, next));
    markDirty();
  }

  function undo() {
    if (history.past.length === 0) {
      return;
    }
    setHistory((state) => {
      const next = historyUndo(state);
      presentRef.current = next.present;
      return next;
    });
    setSelectedId(null);
    markDirty();
  }

  function redo() {
    if (history.future.length === 0) {
      return;
    }
    setHistory((state) => {
      const next = historyRedo(state);
      presentRef.current = next.present;
      return next;
    });
    setSelectedId(null);
    markDirty();
  }

  function targetPageId() {
    const current = presentRef.current;
    if (!current.length) {
      return null;
    }
    const index = Math.min(Math.max(cursorRef.current, 0), current.length - 1);
    const visible = [current[index], mobile ? undefined : current[index + 1]].filter((page): page is PageDoc => Boolean(page));
    if (activeRef.current && visible.some((page) => page.id === activeRef.current)) {
      return activeRef.current;
    }
    return visible[0]?.id ?? current[0].id;
  }

  function requestTemplate(template: TemplateId) {
    const pageId = targetPageId();
    const page = presentRef.current.find((item) => item.id === pageId);
    if (page && page.elements.length > 0) {
      setConfirm({ kind: "template", id: template });
      return;
    }
    applyTemplate(template);
  }

  function applyTemplate(template: TemplateId) {
    const fresh = createPage(template);
    const pageId = targetPageId();
    if (!pageId) {
      addPage(template);
      return;
    }
    commit(
      presentRef.current.map((page) =>
        page.id === pageId ? { ...page, background: fresh.background, elements: fresh.elements } : page,
      ),
    );
    setActivePageId(pageId);
    setSelectedId(null);
    setEditingId(null);
  }

  function addPage(template: TemplateId) {
    const page = createPage(template);
    const next = [...presentRef.current, page];
    const index = next.length - 1;
    activeRef.current = page.id;
    cursorRef.current = mobile ? index : index - (index % 2);
    commit(next);
    setCursor(cursorRef.current);
    setActivePageId(page.id);
    setSelectedId(null);
    setTool("photos");
  }

  function duplicatePage(pageId: string) {
    const source = presentRef.current.find((page) => page.id === pageId);
    if (!source) {
      return;
    }
    const copy: PageDoc = {
      ...source,
      id: uid(),
      elements: source.elements.map((element) => ({ ...element, id: uid() })),
    };
    const index = presentRef.current.findIndex((page) => page.id === pageId);
    const next = presentRef.current.slice();
    next.splice(index + 1, 0, copy);
    commit(next);
    setActivePageId(copy.id);
  }

  function removePage(pageId: string) {
    const current = presentRef.current;
    const index = current.findIndex((page) => page.id === pageId);
    if (index < 0) {
      return;
    }
    const next = current.filter((page) => page.id !== pageId);
    commit(next);
    let nextCursor = cursorRef.current;
    if (index < nextCursor) {
      nextCursor -= 1;
    }
    if (nextCursor >= next.length) {
      nextCursor = Math.max(0, next.length - 1);
    }
    if (!mobile) {
      nextCursor -= nextCursor % 2;
    }
    cursorRef.current = nextCursor;
    setCursor(nextCursor);
    if (activePageId === pageId) {
      setActivePageId(next[Math.min(nextCursor, Math.max(0, next.length - 1))]?.id ?? null);
    }
    setSelectedId(null);
    setEditingId(null);
    setConfirm(null);
  }

  function movePage(pageId: string, direction: -1 | 1) {
    const index = presentRef.current.findIndex((page) => page.id === pageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= presentRef.current.length) {
      return;
    }
    const next = presentRef.current.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    commit(next);
  }

  function carry(element: BitElement, pageId: string) {
    const current = presentRef.current;
    if (!current.some((page) => page.id === pageId)) {
      return;
    }
    const next = current.map((page) => {
      const rest = page.elements.filter((item) => item.id !== element.id);
      return page.id === pageId ? { ...page, elements: [...rest, element] } : { ...page, elements: rest };
    });
    live(next);
    if (activeRef.current !== pageId) {
      activeRef.current = pageId;
      setActivePageId(pageId);
    }
  }

  function changePaper(paper: PageDoc["background"]) {
    const current = presentRef.current;
    if (!current.length) {
      return;
    }
    if (paperBoth) {
      const index = Math.min(Math.max(cursorRef.current, 0), current.length - 1);
      const ids = [current[index]?.id, mobile ? undefined : current[index + 1]?.id].filter((id): id is string => Boolean(id));
      commit(current.map((page) => (ids.includes(page.id) ? { ...page, background: paper } : page)));
      return;
    }
    const pageId = targetPageId();
    if (!pageId) {
      return;
    }
    commit(current.map((page) => (page.id === pageId ? { ...page, background: paper } : page)));
  }

  function insert(element: BitElement) {
    let pageId = targetPageId();
    let nextPages = presentRef.current;
    if (!pageId) {
      const page = createPage("blank");
      pageId = page.id;
      nextPages = [...nextPages, page];
      activeRef.current = page.id;
      cursorRef.current = nextPages.length - 1;
      setActivePageId(page.id);
      setCursor(nextPages.length - 1);
    }
    commit(
      nextPages.map((page) => (page.id === pageId ? { ...page, elements: [...page.elements, element] } : page)),
    );
    setSelectedId(element.id);
  }

  function placeOnPage(pageId: string, payload: BitacoraDrop, at: { x: number; y: number }, elementId: string | null) {
    activeRef.current = pageId;
    setActivePageId(pageId);
    const current = presentRef.current;
    const page = current.find((item) => item.id === pageId);
    if (!page) {
      return;
    }
    if (payload.kind === "photo" && elementId) {
      const host = page.elements.find((element) => element.id === elementId);
      if (host?.type === "photo") {
        commit(
          current.map((item) =>
            item.id === pageId
              ? {
                  ...item,
                  elements: item.elements.map((element) =>
                    element.id === host.id && element.type === "photo"
                      ? { ...element, props: { ...element.props, assetId: payload.assetId, url: payload.url } }
                      : element,
                  ),
                }
              : item,
          ),
        );
        setSelectedId(host.id);
        return;
      }
    }
    const element: BitElement =
      payload.kind === "photo"
        ? {
            id: uid(),
            type: "photo",
            x: clamp(at.x - 0.23, 0, 0.52),
            y: clamp(at.y - 0.24, 0, 0.46),
            w: 0.46,
            h: 0.5,
            rotation: -2,
            z: nextZ(page.elements),
            props: { assetId: payload.assetId, url: payload.url, frame: "polaroid", caption: "", cropX: 0, cropY: 0, cropScale: 1 },
          }
        : {
            id: uid(),
            type: "sticker",
            x: clamp(at.x - 0.14, 0, 0.68),
            y: clamp(at.y - 0.1, 0, 0.74),
            w: 0.28,
            h: 0.22,
            rotation: -6,
            z: nextZ(page.elements),
            props: { stickerId: payload.stickerId },
          };
    commit(current.map((item) => (item.id === pageId ? { ...item, elements: [...item.elements, element] } : item)));
    setSelectedId(element.id);
  }

  function addSticker(stickerId: string) {
    const page = presentRef.current.find((item) => item.id === targetPageId());
    const count = page?.elements.length ?? 0;
    insert({
      id: uid(),
      type: "sticker",
      x: clamp(0.34 + (count % 3) * 0.04, 0.08, 0.62),
      y: clamp(0.28 + (count % 4) * 0.04, 0.08, 0.66),
      w: 0.28,
      h: 0.22,
      rotation: count % 2 === 0 ? -6 : 5,
      z: nextZ(page?.elements ?? []),
      props: { stickerId },
    });
  }

  function addText(kind: "title" | "subtitle" | "body" | "note") {
    const page = presentRef.current.find((item) => item.id === targetPageId());
    const presets: Record<typeof kind, Omit<TextElement, "id" | "x" | "y" | "z">> = {
      title: { type: "text", w: 0.84, h: 0.2, rotation: 0, props: { text: "Un título", font: "playfair", size: 0.12, color: "#1c332e", weight: 600, italic: false, align: "center", lineHeight: 1.05 } },
      subtitle: { type: "text", w: 0.74, h: 0.13, rotation: 0, props: { text: "Un subtítulo", font: "cormorant", size: 0.064, color: "#294942", weight: 500, italic: false, align: "center", lineHeight: 1.15 } },
      body: { type: "text", w: 0.72, h: 0.22, rotation: 0, props: { text: "Escribe tu recuerdo.", font: "nunito", size: 0.034, color: "#1c332e", weight: 400, italic: false, align: "left", lineHeight: 1.55 } },
      note: { type: "text", w: 0.58, h: 0.18, rotation: -3, props: { text: "Una nota al margen.", font: "caveat", size: 0.078, color: "#3d4f45", weight: 500, italic: false, align: "left", lineHeight: 1.2 } },
    };
    const preset = presets[kind];
    const element: TextElement = {
      ...preset,
      id: uid(),
      x: 0.12,
      y: 0.16,
      z: nextZ(page?.elements ?? []),
    };
    insert(element);
    setEditingId(element.id);
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) {
      return;
    }
    const replacing = replaceRef.current && selected?.element.type === "photo" ? selected : null;
    replaceRef.current = false;
    setUploading(true);
    setMessage("");
    try {
      for (const file of Array.from(list)) {
        if (!ACCEPT.includes(file.type)) {
          setMessage("Usa JPG, PNG o WebP.");
          setNotice({ kind: "error", title: "Ese archivo no es una fotografía", description: "Usa JPG, PNG o WebP.", retry: "upload" });
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setMessage("La imagen no puede superar 5 MB.");
          setNotice({ kind: "error", title: "La fotografía es demasiado grande", description: "La imagen no puede superar 5 MB.", retry: "upload" });
          continue;
        }
        const asset = await uploadBitacoraPhoto(file);
        setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
        if (replacing && replacing.element.type === "photo") {
          const filled: PhotoElement = {
            ...replacing.element,
            props: { ...replacing.element.props, assetId: asset.id, url: asset.url },
          };
          commit(mapElement(replacing.page.id, filled, presentRef.current));
          break;
        }
        const empty = selected?.element.type === "photo" && !selected.element.props.url ? selected : null;
        if (empty && empty.element.type === "photo") {
          commit(
            mapElement(
              empty.page.id,
              { ...empty.element, props: { ...empty.element.props, assetId: asset.id, url: asset.url } },
              presentRef.current,
            ),
          );
        } else {
          const page = presentRef.current.find((item) => item.id === targetPageId());
          const count = page?.elements.length ?? 0;
          insert({
            id: uid(),
            type: "photo",
            x: 0.14 + (count % 3) * 0.05,
            y: 0.12 + (count % 3) * 0.05,
            w: 0.46,
            h: 0.5,
            rotation: count % 2 === 0 ? -3 : 3,
            z: nextZ(page?.elements ?? []),
            props: { assetId: asset.id, url: asset.url, frame: "polaroid", caption: "", cropX: 0, cropY: 0, cropScale: 1 },
          });
        }
      }
    } catch (error) {
      setNotice({
        kind: "error",
        title: "No pudimos subir la fotografía",
        description: getApiErrorMessage(error, "Revisa el archivo e inténtalo de nuevo."),
        retry: "upload",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  function patchSelected(patch: (element: BitElement) => BitElement, record: boolean) {
    if (!selected) {
      return;
    }
    const nextElement = patch(selected.element);
    const next = mapElement(selected.page.id, nextElement, presentRef.current);
    if (record) {
      commit(next);
    } else {
      live(next);
    }
  }

  function removeSelected() {
    if (!selected) {
      return;
    }
    commit(
      presentRef.current.map((page) =>
        page.id === selected.page.id ? { ...page, elements: page.elements.filter((item) => item.id !== selected.element.id) } : page,
      ),
    );
    setSelectedId(null);
    setEditingId(null);
  }

  function duplicateSelected() {
    if (!selected) {
      return;
    }
    const copy: BitElement = {
      ...selected.element,
      id: uid(),
      x: clamp(selected.element.x + 0.04, 0, 0.8),
      y: clamp(selected.element.y + 0.04, 0, 0.8),
      z: nextZ(selected.page.elements),
    };
    commit(
      presentRef.current.map((page) => (page.id === selected.page.id ? { ...page, elements: [...page.elements, copy] } : page)),
    );
    setSelectedId(copy.id);
  }

  function layer(direction: "front" | "back") {
    if (!selected) {
      return;
    }
    commit(
      presentRef.current.map((page) =>
        page.id === selected.page.id ? { ...page, elements: normalizeLayers(page.elements, selected.element.id, direction) } : page,
      ),
    );
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (typing) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        removeSelected();
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        setEditingId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function goBack() {
    if (dirtyRef.current) {
      const result = await flush();
      if (result !== "saved") {
        return;
      }
    }
    navigate("/mis-caminos");
  }

  function saveNow() {
    void flush(true);
  }

  async function removeAsset(assetId: string) {
    const asset = assets.find((item) => item.id === assetId);
    try {
      await deleteBitacoraAsset(assetId);
      const next = presentRef.current.map((page) => ({
        ...page,
        elements: page.elements.filter((element) => !(element.type === "photo" && (element.props.assetId === assetId || element.props.url === asset?.url))),
      }));
      presentRef.current = next;
      setHistory(createHistory(next));
      setAssets((current) => current.filter((item) => item.id !== assetId));
      setSelectedId(null);
      dirtyRef.current = false;
      setDirty(false);
      setStatus("saved");
      setConfirm(null);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "No pudimos quitar la fotografía."));
    }
  }

  function chooseTool(next: ToolId) {
    setTool(next);
    setPanelOpen((open) => (tool === next ? !open : true));
  }

  const stickerPool = STICKERS.filter((item) => item.group === "stickers" || (category === "papeles" && item.group === "elementos"));
  const stickerItems = filterStickers(stickerPool, query, category === "papeles" ? "todas" : category);

  const statusLabel = uploading
    ? "Subiendo…"
    : status === "saving"
      ? "Guardando…"
      : status === "saved" && !dirty
        ? "Guardado"
        : status === "error"
          ? "No se pudieron guardar los cambios"
          : dirty
            ? "Cambios sin guardar"
            : "Listo";

  return (
    <div className={`bita is-ready${mobile ? " is-mobile" : ""}`}>
      {loaded ? (
      <>
      <header className="bita-head">
        <div className="bita-head__start">
          <button type="button" className="bita-back" onClick={() => void goBack()}>
            <ChevronLeft size={15} aria-hidden="true" />
            Mis caminos
          </button>
          <span className="bita-head__rule" aria-hidden="true" />
          <button type="button" className="bita-iconbtn" onClick={undo} disabled={history.past.length === 0} aria-label="Deshacer">
            <Undo2 size={15} aria-hidden="true" />
          </button>
          <button type="button" className="bita-iconbtn" onClick={redo} disabled={history.future.length === 0} aria-label="Rehacer">
            <Redo2 size={15} aria-hidden="true" />
          </button>
          <span className="bita-head__rule" aria-hidden="true" />
          <button type="button" className="bita-iconbtn" onClick={() => setZoom((value) => clamp(Number((value - 0.08).toFixed(2)), 0.78, 1.24))} aria-label="Alejar">
            <ZoomOut size={15} aria-hidden="true" />
          </button>
          <span className="bita-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" className="bita-iconbtn" onClick={() => setZoom((value) => clamp(Number((value + 0.08).toFixed(2)), 0.78, 1.24))} aria-label="Acercar">
            <ZoomIn size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="bita-head__title">
          <h1>Mi bitácora</h1>
          <p>Las historias que queremos conservar</p>
        </div>
        <div className="bita-head__actions">
          <button
            type="button"
            className={`bita-status is-${status}${dirty ? " is-dirty" : ""}`}
            onClick={() => {
              if (status === "error") {
                void flush(true);
              }
            }}
          >
            {status === "saving" || uploading ? <LoaderCircle size={13} className="is-spin" aria-hidden="true" /> : null}
            {status === "saved" && !dirty ? <Check size={13} aria-hidden="true" /> : null}
            {status === "error" ? <CircleAlert size={13} aria-hidden="true" /> : null}
            {statusLabel}
          </button>
          <button type="button" className="bita-save" onClick={saveNow}>
            <Save size={14} aria-hidden="true" /> Guardar
          </button>
          <button type="button" className="bita-close" aria-label="Cerrar bitácora" onClick={() => void goBack()}>
            <X size={16} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
      </header>

      {message ? <p className="bita-banner" role="status">{message}</p> : null}

          <div className="bita-workspace">
            <nav className="bita-rail" aria-label="Herramientas">
              <RailButton id="photos" label="Fotos" active={tool === "photos"} onClick={chooseTool} icon={<ImageIcon size={18} strokeWidth={1.6} />} />
              <RailButton id="stickers" label="Stickers" active={tool === "stickers"} onClick={chooseTool} icon={<Sparkles size={18} strokeWidth={1.6} />} />
              <RailButton id="text" label="Texto" active={tool === "text"} onClick={chooseTool} icon={<Type size={18} strokeWidth={1.6} />} />
              <RailButton id="papers" label="Fondos" active={tool === "papers"} onClick={chooseTool} icon={<Palette size={18} strokeWidth={1.6} />} />
              <RailButton id="templates" label="Plantillas" active={tool === "templates"} onClick={chooseTool} icon={<LayoutTemplate size={18} strokeWidth={1.6} />} />
              <RailButton id="pages" label="Páginas" active={tool === "pages"} onClick={chooseTool} icon={<BookOpen size={18} strokeWidth={1.6} />} />
            </nav>

            <div className="bita-stage">
              <div className="bita-dock-slot" ref={dockRef}>
                {selected && opened ? (
                  <div
                    className="bita-dock"
                    role="toolbar"
                    aria-label={selected.element.type === "text" ? "Texto" : selected.element.type === "photo" ? "Fotografía" : "Sticker"}
                    onMouseDown={keepFieldFocus}
                  >
                    {selected.element.type === "photo" ? (
                      <PhotoProps
                        element={selected.element}
                        density={dockDensity}
                        adjusting={adjusting}
                        onAdjust={() => setAdjusting((value) => !value)}
                        onPatch={(patch, record) => patchSelected((element) => (element.type === "photo" ? { ...element, props: { ...element.props, ...patch } } : element), record)}
                        onReplace={() => {
                          replaceRef.current = true;
                          fileRef.current?.click();
                        }}
                        onClear={() => patchSelected((element) => (element.type === "photo" ? { ...element, props: { ...element.props, assetId: null, url: "", cropX: 0, cropY: 0, cropScale: 1 } } : element), true)}
                        onGestureStart={beginGesture}
                        onGestureEnd={endGesture}
                        onDuplicate={duplicateSelected}
                        onFront={() => layer("front")}
                        onBack={() => layer("back")}
                        onRemove={removeSelected}
                      />
                    ) : null}
                    {selected.element.type === "text" ? (
                      <TextPropsBar
                        element={selected.element}
                        density={dockDensity}
                        onPatch={(patch, record) => patchSelected((element) => (element.type === "text" ? { ...element, props: { ...element.props, ...patch } } : element), record)}
                        onGestureStart={beginGesture}
                        onGestureEnd={endGesture}
                        onDuplicate={duplicateSelected}
                        onFront={() => layer("front")}
                        onBack={() => layer("back")}
                        onRemove={removeSelected}
                      />
                    ) : null}
                    {selected.element.type === "sticker" ? (
                      <>
                        <span className="bita-dock__hint">{stickerById(selected.element.props.stickerId)?.name ?? "Sticker"}</span>
                        <span className="bita-dock__sep" aria-hidden="true" />
                        <ObjectActions variant="icons" onDuplicate={duplicateSelected} onFront={() => layer("front")} onBack={() => layer("back")} onRemove={removeSelected} />
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {!opened ? (
                <button
                  type="button"
                  className={`bita-cover${coverLeaving ? " is-leaving" : ""}`}
                  onClick={() => setCoverLeaving(true)}
                  onTransitionEnd={() => {
                    if (coverLeaving) {
                      setOpened(true);
                    }
                  }}
                >
                  <span>Mi bitácora</span>
                  <small>Toca para abrir</small>
                </button>
              ) : null}
              <BitacoraBook
                pages={pages}
                cursor={cursor}
                mobile={mobile}
                zoom={zoom}
                selectedId={selectedId}
                editingId={editingId}
                locked={dragging || Boolean(editingId)}
                activePageId={activePageId}
                onCursor={setCursor}
                onSelect={(id) => {
                  setSelectedId(id);
                  if (id !== editingId) {
                    setEditingId(null);
                  }
                }}
                onActivate={setActivePageId}
                onBegin={beginGesture}
                onLive={(pageId, element) => live(mapElement(pageId, element, presentRef.current))}
                onEnd={endGesture}
                onEdit={setEditingId}
                onText={(pageId, element, text) => {
                  if (element.type !== "text") {
                    return;
                  }
                  live(mapElement(pageId, { ...element, props: { ...element.props, text } }, presentRef.current));
                }}
                onCreate={addPage}
                onPlace={placeOnPage}
                onCarry={carry}
                adjusting={adjusting}
              />
              {!opened ? (
                <button
                  type="button"
                  className="bita-skip"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(SKIP_KEY, "1");
                    } catch {
                      /* private mode */
                    }
                    setOpened(true);
                  }}
                >
                  Omitir
                </button>
              ) : null}
            </div>

            {panelOpen ? (
              <aside className="bita-panel" aria-label="Recursos">
                {tool === "photos" ? (
                  <PhotoLibrary
                    assets={assets}
                    uploading={uploading}
                    onUpload={() => fileRef.current?.click()}
                    onUse={(asset) => {
                      const page = presentRef.current.find((item) => item.id === targetPageId());
                      const count = page?.elements.length ?? 0;
                      insert({
                        id: uid(),
                        type: "photo",
                        x: 0.16 + (count % 2) * 0.06,
                        y: 0.14,
                        w: 0.46,
                        h: 0.5,
                        rotation: -2,
                        z: nextZ(page?.elements ?? []),
                        props: { assetId: asset.id, url: asset.url, frame: "polaroid", caption: "", cropX: 0, cropY: 0, cropScale: 1 },
                      });
                    }}
                    onDelete={(id) => setConfirm({ kind: "asset", id })}
                  />
                ) : null}
                {tool === "stickers" ? (
                  <StickerLibrary
                    title="Stickers"
                    query={query}
                    category={category}
                    items={stickerItems}
                    onQuery={setQuery}
                    onCategory={setCategory}
                    onPick={addSticker}
                  />
                ) : null}
                {tool === "text" ? (
                  <div className="bita-library">
                    <h2>Texto</h2>
                    <div className="bita-text-presets">
                      <button type="button" className="bita-text-card is-title" onClick={() => addText("title")}>
                        <strong>Aa</strong>
                        <span>Añadir título</span>
                      </button>
                      <button type="button" className="bita-text-card is-subtitle" onClick={() => addText("subtitle")}>
                        <strong>Aa</strong>
                        <span>Añadir subtítulo</span>
                      </button>
                      <button type="button" className="bita-text-card is-body" onClick={() => addText("body")}>
                        <strong>Aa</strong>
                        <span>Añadir texto</span>
                      </button>
                      <button type="button" className="bita-text-card is-note" onClick={() => addText("note")}>
                        <strong>Aa</strong>
                        <span>Añadir nota manuscrita</span>
                      </button>
                    </div>
                  </div>
                ) : null}
                {tool === "papers" ? (
                  <div className="bita-library">
                    <h2>Fondos</h2>
                    <p className="bita-muted">El fondo cambia solo la página activa. Las fotos y los textos se quedan.</p>
                    <button type="button" className={`bita-both${paperBoth ? " is-on" : ""}`} onClick={() => setPaperBoth((value) => !value)}>
                      {paperBoth ? "Se aplica a las dos páginas" : "Aplicar a las dos páginas"}
                    </button>
                    <div className="bita-papers">
                      {PAPERS.map((paper) => (
                        <button key={paper.id} type="button" className={`bita-swatch is-${paper.id}`} onClick={() => changePaper(paper.id)}>
                          <span />
                          {paper.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {tool === "templates" ? <TemplateGallery onApply={requestTemplate} /> : null}
                {tool === "pages" ? (
                  <PageList
                    pages={pages}
                    activeId={activePageId}
                    onFocus={(pageId, index) => {
                      setActivePageId(pageId);
                      setCursor(mobile ? index : index - (index % 2));
                    }}
                    onMove={movePage}
                    onDuplicate={duplicatePage}
                    onDelete={(pageId) => setConfirm({ kind: "page", id: pageId })}
                    onCreate={() => addPage("blank")}
                  />
                ) : null}
              </aside>
            ) : null}
          </div>

      <input
        ref={fileRef}
        className="bita-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => void onFiles(event.target.files)}
      />

      {confirm?.kind === "page" ? (
        <KeyConfirmDialog
          open
          title="¿Eliminar esta página?"
          description="Se eliminarán las fotos, textos y elementos de esta página. Esta acción no se puede deshacer después de guardar los cambios."
          confirmLabel="Eliminar página"
          cancelLabel="Cancelar"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirmLock.current) {
              return;
            }
            confirmLock.current = true;
            removePage(confirm.id);
            confirmLock.current = false;
          }}
        />
      ) : null}
      {confirm?.kind === "asset" ? (
        <KeyConfirmDialog
          open
          title="¿Quitar esta fotografía?"
          description="También se quitará de las páginas donde la usaste."
          confirmLabel="Quitar fotografía"
          cancelLabel="Cancelar"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirmLock.current) {
              return;
            }
            confirmLock.current = true;
            void removeAsset(confirm.id).finally(() => {
              confirmLock.current = false;
            });
          }}
        />
      ) : null}
      {confirm?.kind === "template" ? (
        <KeyConfirmDialog
          open
          title="¿Aplicar esta plantilla?"
          description="Se reemplazarán las fotos, textos y stickers de la página activa."
          confirmLabel="Aplicar plantilla"
          cancelLabel="Cancelar"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirmLock.current) {
              return;
            }
            confirmLock.current = true;
            applyTemplate(confirm.id);
            setConfirm(null);
            confirmLock.current = false;
          }}
        />
      ) : null}
      <SuccessConfirmDialog
        open={notice?.kind === "saved"}
        onClose={() => setNotice(null)}
        icon={<AuthKeyIcon className="auth-reset-success__mark" />}
        title="Bitácora guardada"
        description="Tus páginas quedaron guardadas."
        actionLabel="Seguir editando"
        initialFocus="action"
        className="contact-success--subtle"
      />
      {notice?.kind === "error" ? (
        <KeyConfirmDialog
          open
          title={notice.title}
          description={notice.description}
          confirmLabel="Reintentar"
          cancelLabel="Cerrar"
          showConfirm={notice.retry !== "none"}
          onCancel={() => setNotice(null)}
          onConfirm={() => {
            const retry = notice.retry;
            setNotice(null);
            if (retry === "save") {
              void flush(true);
            } else if (retry === "upload") {
              fileRef.current?.click();
            }
          }}
        />
      ) : null}
      </>
      ) : null}
      {!loaded || loadError ? (
        <div className="contact-success contact-success--subtle" role="presentation">
          <div className="contact-success__dialog" role="dialog" aria-modal="true" aria-labelledby="bita-gate-title" aria-describedby="bita-gate-copy">
            <div className="contact-success__media" aria-hidden="true">
              <AuthKeyIcon className="auth-reset-success__mark" />
            </div>
            {loadError ? (
              <>
                <h2 id="bita-gate-title" className="contact-success__title">No pudimos abrir tu bitácora</h2>
                <p id="bita-gate-copy" className="contact-success__text">{loadError}</p>
                <div className="contact-success__actions">
                  <button type="button" className="contact-success__cancel" onClick={() => navigate("/mis-caminos")}>Volver</button>
                  <button type="button" className="contact-success__action admin-cta" onClick={() => setLoadNonce((value) => value + 1)}>Reintentar</button>
                </div>
              </>
            ) : (
              <>
                <h2 id="bita-gate-title" className="contact-success__title">Abriendo tu bitácora…</h2>
                <p id="bita-gate-copy" className="contact-success__text">Estamos recuperando tus páginas.</p>
                <span className="contact-success__wait" aria-hidden="true" />
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RailButton({
  id,
  label,
  active,
  onClick,
  icon,
}: {
  id: ToolId;
  label: string;
  active: boolean;
  onClick: (id: ToolId) => void;
  icon: React.ReactNode;
}) {
  return (
    <button type="button" className={active ? "is-active" : ""} aria-label={label} aria-pressed={active} onClick={() => onClick(id)}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PhotoLibrary({
  assets,
  uploading,
  onUpload,
  onUse,
  onDelete,
}: {
  assets: BitacoraAsset[];
  uploading: boolean;
  onUpload: () => void;
  onUse: (asset: BitacoraAsset) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bita-library">
      <h2>Fotos</h2>
      <button type="button" className="bita-library__add" onClick={onUpload} disabled={uploading}>
        <Plus size={15} aria-hidden="true" /> {uploading ? "Subiendo…" : "Subir fotografías"}
      </button>
      {assets.length === 0 ? <p className="bita-muted">Todavía no hay fotografías. Cuando subas una, quedará guardada aquí.</p> : <p className="bita-muted">Arrástrala a la página o suéltala dentro de un marco.</p>}
      <ul className="bita-photos">
        {assets.map((asset) => (
          <li key={asset.id}>
            <button
              type="button"
              draggable
              onDragStart={(event) => writeBitacoraDrop(event, { kind: "photo", assetId: asset.id, url: asset.url })}
              onClick={() => onUse(asset)}
            >
              <img src={mediaUrl(asset.url, 240)} alt="" draggable={false} loading="lazy" decoding="async" />
            </button>
            <button type="button" aria-label="Eliminar fotografía" onClick={() => onDelete(asset.id)}>
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StickerLibrary({
  title,
  query,
  category,
  items,
  onQuery,
  onCategory,
  onPick,
}: {
  title: string;
  query: string;
  category: StickerCategory | "todas";
  items: Array<{ id: string; name: string; src: string }>;
  onQuery: (value: string) => void;
  onCategory: (value: StickerCategory | "todas") => void;
  onPick: (id: string) => void;
}) {
  const chips: Array<StickerCategory | "todas"> = ["todas", "viajes", "naturaleza", "recuerdos", "papeles", "ilustraciones"];
  return (
    <div className="bita-library">
      <h2>{title}</h2>
      <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar stickers..." aria-label="Buscar stickers" />
      <div className="bita-chips">
        {chips.map((chip) => (
          <button key={chip} type="button" className={category === chip ? "is-active" : ""} onClick={() => onCategory(chip)}>
            {chip === "todas" ? "Todas" : chip[0].toUpperCase() + chip.slice(1)}
          </button>
        ))}
      </div>
      {items.length === 0 ? <p className="bita-muted">No hay piezas con ese nombre.</p> : null}
      <ul className="bita-stickers">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              draggable
              title={item.name}
              onDragStart={(event) => writeBitacoraDrop(event, { kind: "sticker", stickerId: item.id })}
              onClick={() => onPick(item.id)}
            >
              <img src={item.src} alt={item.name} draggable={false} loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageList({
  pages,
  activeId,
  onFocus,
  onMove,
  onDuplicate,
  onDelete,
  onCreate,
}: {
  pages: PageDoc[];
  activeId: string | null;
  onFocus: (pageId: string, index: number) => void;
  onMove: (pageId: string, direction: -1 | 1) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="bita-library">
      <h2>Páginas</h2>
      <button type="button" className="bita-library__add" onClick={onCreate}>
        <Plus size={15} aria-hidden="true" /> Nueva página
      </button>
      <ul className="bita-pages">
        {pages.map((page, index) => (
          <li key={page.id} className={page.id === activeId ? "is-active" : ""}>
            <button type="button" onClick={() => onFocus(page.id, index)}>Página {index + 1}</button>
            <button type="button" aria-label="Subir página" onClick={() => onMove(page.id, -1)}><ArrowUp size={14} /></button>
            <button type="button" aria-label="Bajar página" onClick={() => onMove(page.id, 1)}><ArrowDown size={14} /></button>
            <button type="button" aria-label="Duplicar página" onClick={() => onDuplicate(page.id)}><Copy size={14} /></button>
            <button type="button" aria-label="Eliminar página" onClick={() => onDelete(page.id)}><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TemplateGallery({ onApply }: { onApply: (template: TemplateId) => void }) {
  return (
    <div className="bita-library">
      <h2>Plantillas</h2>
      <p className="bita-muted">Se aplican en la página activa. Cada marco puede llevar una foto distinta.</p>
      <div className="bita-template-grid">
        {TEMPLATES.map((item) => {
          const sketch = templateSketch(item.id);
          return (
            <button key={item.id} type="button" className="bita-template-card" onClick={() => onApply(item.id)}>
              <span className={`bita-thumb is-${sketch.paper}`} aria-hidden="true">
                {sketch.items.map((box, index) => (
                  <span
                    key={index}
                    className={`bita-thumb__item is-${box.type}${box.frame ? ` is-${box.frame}` : ""}`}
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.w * 100}%`,
                      height: `${box.h * 100}%`,
                      transform: `rotate(${box.rotation}deg)`,
                    }}
                  />
                ))}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SIZE_MIN = 0.028;
const SIZE_MAX = 0.16;
const SIZE_PRESETS = [0.03, 0.04, 0.05, 0.064, 0.08, 0.1, 0.12, 0.14, 0.16];
const SPACE_STEPS = [1, 1.05, 1.15, 1.2, 1.25, 1.35, 1.5, 1.55, 1.65, 1.8];

function sizeLabel(size: number) {
  const value = Math.round(size * 1000) / 10;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function trimNum(value: number) {
  return String(Math.round(value * 100) / 100);
}

function keepFieldFocus(event: { target: EventTarget | null; preventDefault: () => void }) {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea")) {
    return;
  }
  event.preventDefault();
}

function DockIcon({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`bita-dock__icon${pressed ? " is-on" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ObjectActions({
  variant,
  onDuplicate,
  onFront,
  onBack,
  onRemove,
}: {
  variant: "icons" | "menu";
  onDuplicate: () => void;
  onFront: () => void;
  onBack: () => void;
  onRemove: () => void;
}) {
  const items = [
    { label: "Duplicar", icon: <Copy size={15} aria-hidden="true" />, run: onDuplicate },
    { label: "Traer adelante", icon: <ArrowUp size={15} aria-hidden="true" />, run: onFront },
    { label: "Enviar atrás", icon: <ArrowDown size={15} aria-hidden="true" />, run: onBack },
    { label: "Quitar", icon: <Trash2 size={15} aria-hidden="true" />, run: onRemove },
  ];
  if (variant === "menu") {
    return (
      <div className="bita-popover__list">
        {items.map((item) => (
          <button key={item.label} type="button" onClick={item.run}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="bita-dock__group" role="group" aria-label="Organizar">
      {items.map((item) => (
        <DockIcon key={item.label} label={item.label} onClick={item.run}>
          {item.icon}
        </DockIcon>
      ))}
    </div>
  );
}

function DockPopover({
  open,
  onClose,
  label,
  anchorRef,
  width = 248,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  anchorRef: RefObject<HTMLElement | null>;
  width?: number;
  children: ReactNode;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [box, setBox] = useState<{ top: number; left: number; maxHeight: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const panelWidth = Math.min(width, window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - panelWidth - 8));
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(140, Math.min(360, (openUp ? spaceAbove : spaceBelow) - 8));
      const top = openUp ? Math.max(8, rect.top - 8 - maxHeight) : rect.bottom + 8;
      setBox({ top, left, maxHeight, width: panelWidth });
    };
    place();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      closeRef.current();
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, anchorRef, width]);

  if (!open || !box) {
    return null;
  }
  return createPortal(
    <>
      <button type="button" className="bita-popover__backdrop" aria-label={`Cerrar ${label}`} onClick={onClose} />
      <div
        className="bita-popover"
        role="dialog"
        aria-label={label}
        style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
        onMouseDown={keepFieldFocus}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

function AlignGroup({ align, onChange }: { align: TextElement["props"]["align"]; onChange: (align: TextElement["props"]["align"]) => void }) {
  const items = [
    { id: "left" as const, label: "Alinear a la izquierda", icon: <AlignLeft size={15} aria-hidden="true" /> },
    { id: "center" as const, label: "Alinear al centro", icon: <AlignCenter size={15} aria-hidden="true" /> },
    { id: "right" as const, label: "Alinear a la derecha", icon: <AlignRight size={15} aria-hidden="true" /> },
  ];
  return (
    <div className="bita-align" role="group" aria-label="Alineación">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={align === item.id ? "is-on" : ""}
          title={item.label}
          aria-label={item.label}
          aria-pressed={align === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}

function SpaceChoices({
  value,
  onPick,
  onSlide,
  onGestureStart,
  onGestureEnd,
}: {
  value: number;
  onPick: (value: number) => void;
  onSlide: (value: number) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  const options = SPACE_STEPS.some((item) => Math.abs(item - value) < 0.011)
    ? SPACE_STEPS
    : [...SPACE_STEPS, value].sort((left, right) => left - right);
  return (
    <>
      <div className="bita-popover__list" role="listbox" aria-label="Espaciado">
        {options.map((item) => (
          <button key={item} type="button" className={Math.abs(item - value) < 0.011 ? "is-on" : ""} aria-selected={Math.abs(item - value) < 0.011} onClick={() => onPick(item)}>
            {trimNum(item)}
          </button>
        ))}
      </div>
      <label className="bita-popover__slider">
        Ajuste fino
        <input
          type="range"
          min={1}
          max={1.8}
          step={0.05}
          value={value}
          aria-label="Interlineado"
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          onChange={(event) => onSlide(Number(event.target.value))}
        />
      </label>
    </>
  );
}

function PhotoProps({
  element,
  density,
  adjusting,
  onAdjust,
  onPatch,
  onReplace,
  onClear,
  onGestureStart,
  onGestureEnd,
  onDuplicate,
  onFront,
  onBack,
  onRemove,
}: {
  element: PhotoElement;
  density: DockDensity;
  adjusting: boolean;
  onAdjust: () => void;
  onPatch: (patch: Partial<PhotoElement["props"]>, record: boolean) => void;
  onReplace: () => void;
  onClear: () => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
  onDuplicate: () => void;
  onFront: () => void;
  onBack: () => void;
  onRemove: () => void;
}) {
  const frames: Array<{ id: FrameId; label: string }> = [
    { id: "polaroid", label: "Polaroid" },
    { id: "wide", label: "Horizontal" },
    { id: "cream", label: "Crema" },
    { id: "none", label: "Sin marco" },
  ];
  const [menu, setMenu] = useState<null | "frame" | "crop" | "more">(null);
  const frameRef = useRef<HTMLButtonElement>(null);
  const cropRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const current = frames.find((frame) => frame.id === element.props.frame) ?? frames[0];

  useEffect(() => {
    setMenu(null);
  }, [element.id, density]);

  return (
    <>
      <div className="bita-dock__group" role="group" aria-label="Marco">
        <button
          ref={frameRef}
          type="button"
          className={`bita-dock__menu${menu === "frame" ? " is-on" : ""}`}
          title="Marco"
          aria-expanded={menu === "frame"}
          onClick={() => setMenu((value) => (value === "frame" ? null : "frame"))}
        >
          {current.label}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        <DockIcon label="Cambiar foto" onClick={onReplace}>
          <ImageIcon size={15} aria-hidden="true" />
        </DockIcon>
        <button
          ref={cropRef}
          type="button"
          className={`bita-dock__menu${adjusting || menu === "crop" ? " is-on" : ""}`}
          title="Encuadre"
          aria-expanded={menu === "crop"}
          onClick={() => setMenu((value) => (value === "crop" ? null : "crop"))}
        >
          Encuadre
        </button>
      </div>
      {density !== "compact" ? (
        <>
          <span className="bita-dock__sep" aria-hidden="true" />
          <ObjectActions variant="icons" onDuplicate={onDuplicate} onFront={onFront} onBack={onBack} onRemove={onRemove} />
        </>
      ) : (
        <button
          ref={moreRef}
          type="button"
          className={`bita-dock__icon${menu === "more" ? " is-on" : ""}`}
          title="Más opciones"
          aria-label="Más opciones"
          aria-pressed={menu === "more"}
          onClick={() => setMenu((value) => (value === "more" ? null : "more"))}
        >
          <MoreHorizontal size={15} aria-hidden="true" />
        </button>
      )}
      <DockPopover open={menu === "frame"} onClose={() => setMenu(null)} label="Marco" anchorRef={frameRef} width={220}>
        <div className="bita-popover__list">
          {frames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              className={element.props.frame === frame.id ? "is-on" : ""}
              aria-pressed={element.props.frame === frame.id}
              onClick={() => onPatch({ frame: frame.id }, true)}
            >
              {frame.label}
            </button>
          ))}
        </div>
      </DockPopover>
      <DockPopover open={menu === "crop"} onClose={() => setMenu(null)} label="Encuadre" anchorRef={cropRef} width={260}>
        <button type="button" className={`bita-popover__choice${adjusting ? " is-on" : ""}`} onClick={onAdjust} disabled={!element.props.url}>
          Mover dentro del marco
        </button>
        <label className="bita-popover__slider">
          Horizontal
          <input type="range" min={-40} max={40} step={1} value={element.props.cropX} aria-label="Horizontal" onPointerDown={onGestureStart} onPointerUp={onGestureEnd} onChange={(event) => onPatch({ cropX: Number(event.target.value) }, false)} />
        </label>
        <label className="bita-popover__slider">
          Vertical
          <input type="range" min={-40} max={40} step={1} value={element.props.cropY} aria-label="Vertical" onPointerDown={onGestureStart} onPointerUp={onGestureEnd} onChange={(event) => onPatch({ cropY: Number(event.target.value) }, false)} />
        </label>
        <label className="bita-popover__slider">
          Encuadre
          <input type="range" min={1} max={2.4} step={0.05} value={element.props.cropScale} aria-label="Encuadre" onPointerDown={onGestureStart} onPointerUp={onGestureEnd} onChange={(event) => onPatch({ cropScale: Number(event.target.value) }, false)} />
        </label>
        {element.props.frame !== "none" ? (
          <label className="bita-popover__field">
            Leyenda
            <input
              value={element.props.caption}
              maxLength={80}
              aria-label="Leyenda"
              onFocus={onGestureStart}
              onBlur={onGestureEnd}
              onChange={(event) => onPatch({ caption: event.target.value }, false)}
            />
          </label>
        ) : null}
        <button type="button" className="bita-popover__choice" onClick={onClear} disabled={!element.props.url}>
          Quitar foto
        </button>
      </DockPopover>
      <DockPopover open={menu === "more"} onClose={() => setMenu(null)} label="Más opciones" anchorRef={moreRef} width={220}>
        <ObjectActions variant="menu" onDuplicate={onDuplicate} onFront={onFront} onBack={onBack} onRemove={onRemove} />
      </DockPopover>
    </>
  );
}

function TextPropsBar({
  element,
  density,
  onPatch,
  onGestureStart,
  onGestureEnd,
  onDuplicate,
  onFront,
  onBack,
  onRemove,
}: {
  element: TextElement;
  density: DockDensity;
  onPatch: (patch: Partial<TextElement["props"]>, record: boolean) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
  onDuplicate: () => void;
  onFront: () => void;
  onBack: () => void;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState<null | "font" | "size" | "color" | "space" | "more">(null);
  const sizeRef = useRef<HTMLButtonElement>(null);
  const colorRef = useRef<HTMLButtonElement>(null);
  const spaceRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const showAlign = density !== "compact";
  const showSpace = density === "wide";
  const showArrange = density !== "compact";

  useEffect(() => {
    setMenu(null);
  }, [element.id, density]);

  function nudge(direction: -1 | 1) {
    onPatch({ size: clamp(Math.round((element.props.size + direction * 0.01) * 1000) / 1000, SIZE_MIN, SIZE_MAX) }, true);
  }

  return (
    <>
      <div className="bita-dock__group" role="group" aria-label="Tipografía">
        <FontMenu element={element} open={menu === "font"} onToggle={() => setMenu((value) => (value === "font" ? null : "font"))} onClose={() => setMenu(null)} onPatch={onPatch} />
        <div className="bita-stepper" role="group" aria-label="Tamaño del texto">
          <button type="button" title="Reducir tamaño" aria-label="Reducir tamaño" disabled={element.props.size <= SIZE_MIN + 0.001} onClick={() => nudge(-1)}>
            <Minus size={14} aria-hidden="true" />
          </button>
          <button ref={sizeRef} type="button" className="bita-stepper__value" title="Tamaño del texto" aria-label={`Tamaño ${sizeLabel(element.props.size)}`} aria-expanded={menu === "size"} onClick={() => setMenu((value) => (value === "size" ? null : "size"))}>
            {sizeLabel(element.props.size)}
          </button>
          <button type="button" title="Aumentar tamaño" aria-label="Aumentar tamaño" disabled={element.props.size >= SIZE_MAX - 0.001} onClick={() => nudge(1)}>
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <span className="bita-dock__sep" aria-hidden="true" />
      <div className="bita-dock__group" role="group" aria-label="Apariencia">
        <button ref={colorRef} type="button" className={`bita-color-trigger${menu === "color" ? " is-on" : ""}`} title="Color del texto" aria-label="Color del texto" aria-expanded={menu === "color"} onClick={() => setMenu((value) => (value === "color" ? null : "color"))}>
          <span style={{ background: element.props.color }} />
        </button>
        <DockIcon label="Negrita" pressed={element.props.weight >= 600} onClick={() => onPatch({ weight: element.props.weight >= 600 ? 400 : 700 }, true)}>
          <Bold size={15} aria-hidden="true" />
        </DockIcon>
        <DockIcon label="Cursiva" pressed={element.props.italic} onClick={() => onPatch({ italic: !element.props.italic }, true)}>
          <Italic size={15} aria-hidden="true" />
        </DockIcon>
      </div>
      {showAlign ? (
        <>
          <span className="bita-dock__sep" aria-hidden="true" />
          <AlignGroup align={element.props.align} onChange={(align) => onPatch({ align }, true)} />
        </>
      ) : null}
      {showSpace ? (
        <>
          <span className="bita-dock__sep" aria-hidden="true" />
          <button ref={spaceRef} type="button" className={`bita-dock__menu${menu === "space" ? " is-on" : ""}`} title="Espaciado" aria-label={`Espaciado ${trimNum(element.props.lineHeight)}`} aria-expanded={menu === "space"} onClick={() => setMenu((value) => (value === "space" ? null : "space"))}>
            Espaciado
            <em>{trimNum(element.props.lineHeight)}</em>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </>
      ) : null}
      {showArrange ? (
        <>
          <span className="bita-dock__sep" aria-hidden="true" />
          <ObjectActions variant="icons" onDuplicate={onDuplicate} onFront={onFront} onBack={onBack} onRemove={onRemove} />
        </>
      ) : null}
      <button
        ref={moreRef}
        type="button"
        className={`bita-dock__icon${menu === "more" ? " is-on" : ""}`}
        title="Más opciones"
        aria-label="Más opciones"
        aria-pressed={menu === "more"}
        onClick={() => setMenu((value) => (value === "more" ? null : "more"))}
      >
        <MoreHorizontal size={15} aria-hidden="true" />
      </button>
      <DockPopover open={menu === "size"} onClose={() => setMenu(null)} label="Tamaño del texto" anchorRef={sizeRef} width={220}>
        <div className="bita-popover__list" role="listbox" aria-label="Tamaño del texto">
          {SIZE_PRESETS.map((size) => (
            <button key={size} type="button" className={Math.abs(size - element.props.size) < 0.004 ? "is-on" : ""} aria-selected={Math.abs(size - element.props.size) < 0.004} onClick={() => onPatch({ size }, true)}>
              {sizeLabel(size)}
            </button>
          ))}
        </div>
        <label className="bita-popover__slider">
          Ajuste fino
          <input
            type="range"
            min={SIZE_MIN}
            max={SIZE_MAX}
            step={0.002}
            value={element.props.size}
            aria-label="Tamaño del texto"
            onPointerDown={onGestureStart}
            onPointerUp={onGestureEnd}
            onChange={(event) => onPatch({ size: Number(event.target.value) }, false)}
          />
        </label>
      </DockPopover>
      <DockPopover open={menu === "color"} onClose={() => setMenu(null)} label="Color del texto" anchorRef={colorRef} width={196}>
        <div className="bita-color-grid">
          {TEXT_COLORS.map((color) => (
            <button key={color} type="button" style={{ background: color }} className={element.props.color === color ? "is-on" : ""} aria-label={`Color ${color}`} aria-pressed={element.props.color === color} onClick={() => onPatch({ color }, true)} />
          ))}
        </div>
      </DockPopover>
      <DockPopover open={menu === "space"} onClose={() => setMenu(null)} label="Espaciado" anchorRef={spaceRef} width={220}>
        <SpaceChoices
          value={element.props.lineHeight}
          onPick={(lineHeight) => onPatch({ lineHeight }, true)}
          onSlide={(lineHeight) => onPatch({ lineHeight }, false)}
          onGestureStart={onGestureStart}
          onGestureEnd={onGestureEnd}
        />
      </DockPopover>
      <DockPopover open={menu === "more"} onClose={() => setMenu(null)} label="Más opciones" anchorRef={moreRef} width={260}>
        <label className="bita-popover__field">
          Texto
          <textarea
            value={element.props.text}
            rows={3}
            aria-label="Texto"
            onFocus={onGestureStart}
            onBlur={onGestureEnd}
            onChange={(event) => onPatch({ text: event.target.value }, false)}
          />
        </label>
        {showSpace ? null : (
          <div className="bita-popover__block">
            <p>Espaciado</p>
            <SpaceChoices
              value={element.props.lineHeight}
              onPick={(lineHeight) => onPatch({ lineHeight }, true)}
              onSlide={(lineHeight) => onPatch({ lineHeight }, false)}
              onGestureStart={onGestureStart}
              onGestureEnd={onGestureEnd}
            />
          </div>
        )}
        {showAlign ? null : (
          <div className="bita-popover__block">
            <p>Alineación</p>
            <AlignGroup align={element.props.align} onChange={(align) => onPatch({ align }, true)} />
          </div>
        )}
        {showArrange ? null : <ObjectActions variant="menu" onDuplicate={onDuplicate} onFront={onFront} onBack={onBack} onRemove={onRemove} />}
      </DockPopover>
    </>
  );
}

function FontMenu({
  element,
  open,
  onToggle,
  onClose,
  onPatch,
}: {
  element: TextElement;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPatch: (patch: Partial<TextElement["props"]>, record: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<FontGroup | "todas">("todas");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = FONTS.find((font) => font.id === element.props.font) ?? FONTS[0];
  const visible = FONTS.filter((font) => {
    const matchesGroup = group === "todas" || font.group === group;
    const matchesQuery = font.label.toLowerCase().includes(query.trim().toLowerCase());
    return matchesGroup && matchesQuery;
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`bita-dock__menu bita-font-trigger${open ? " is-on" : ""}`}
        title={current.label}
        aria-label={`Fuente ${current.label}`}
        aria-expanded={open}
        onClick={onToggle}
      >
        <strong className={`bita-fontbox__name ${FONT_CLASS[current.id]}`}>{current.label}</strong>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <DockPopover open={open} onClose={onClose} label="Tipografías" anchorRef={triggerRef} width={300}>
        <div className="bita-fontbox">
          <input type="search" value={query} placeholder="Buscar fuente" aria-label="Buscar fuente" onChange={(event) => setQuery(event.target.value)} />
          <div className="bita-fontbox__groups">
            <button type="button" className={group === "todas" ? "is-on" : ""} onClick={() => setGroup("todas")}>Todas</button>
            {FONT_GROUPS.map((item) => (
              <button key={item.id} type="button" className={group === item.id ? "is-on" : ""} onClick={() => setGroup(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <ul className="bita-fontbox__list">
            {visible.map((font) => (
              <li key={font.id}>
                <button
                  type="button"
                  className={font.id === element.props.font ? "is-on" : ""}
                  onClick={() => {
                    onPatch({ font: font.id }, true);
                    onClose();
                  }}
                >
                  <strong className={`bita-fontbox__name ${FONT_CLASS[font.id]}`}>{font.label}</strong>
                  <span>{FONT_GROUPS.find((item) => item.id === font.group)?.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DockPopover>
    </>
  );
}
