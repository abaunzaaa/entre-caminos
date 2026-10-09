import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronLeft,
  Copy,
  Image as ImageIcon,
  LayoutTemplate,
  Palette,
  Plus,
  Redo2,
  Save,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { deleteBitacoraAsset, loadBitacora, saveBitacora, uploadBitacoraPhoto } from "../../services/bitacora.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import { BitacoraBook } from "./BitacoraBook";
import { filterStickers, STICKERS, type StickerCategory } from "./catalog";
import { createHistory, historyCommit, historyRedo, historyReplace, historyUndo, type HistoryState } from "./history";
import { createPage } from "./templates";
import {
  clamp,
  FONTS,
  nextZ,
  normalizeLayers,
  PAPERS,
  TEMPLATES,
  TEXT_COLORS,
  uid,
  type BitacoraAsset,
  type BitElement,
  type FontId,
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
  const [history, setHistory] = useState<HistoryState<PageDoc[]>>(createHistory([]));
  const [assets, setAssets] = useState<BitacoraAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
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
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  const [confirm, setConfirm] = useState<{ kind: "page" | "asset"; id: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef(false);
  const presentRef = useRef<PageDoc[]>([]);
  const baseRef = useRef<PageDoc[] | null>(null);
  const activeRef = useRef<string | null>(null);
  const cursorRef = useRef(0);
  const dirtyRef = useRef(false);
  const loadedRef = useRef(false);
  const ticketRef = useRef(0);
  const pages = history.present;
  presentRef.current = pages;
  activeRef.current = activePageId;
  cursorRef.current = cursor;

  const selected = findSelected(pages, selectedId);

  useEffect(() => {
    let active = true;
    void loadBitacora()
      .then((bundle) => {
        if (!active) {
          return;
        }
        presentRef.current = bundle.pages;
        setHistory(createHistory(bundle.pages));
        setAssets(bundle.assets);
        setActivePageId(bundle.pages[0]?.id ?? null);
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
  }, []);

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

  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  async function flush() {
    if (!loadedRef.current) {
      return;
    }
    const stamp = ticketRef.current;
    setStatus("saving");
    try {
      await saveBitacora(presentRef.current);
      if (ticketRef.current === stamp) {
        dirtyRef.current = false;
        setDirty(false);
        setStatus("saved");
        setMessage("");
      }
    } catch (error) {
      setStatus("error");
      setMessage(getApiErrorMessage(error, "No pudimos guardar. Tus cambios siguen aquí."));
    }
  }
  flushRef.current = flush;

  useEffect(() => {
    if (!loaded || opened) {
      return;
    }
    const timer = window.setTimeout(() => setCoverLeaving(true), 700);
    return () => window.clearTimeout(timer);
  }, [loaded, opened]);

  useEffect(() => {
    if (!coverLeaving || opened) {
      return;
    }
    const timer = window.setTimeout(() => setOpened(true), 1100);
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
        void saveBitacora(presentRef.current).catch(() => undefined);
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
    if (activeRef.current && current.some((page) => page.id === activeRef.current)) {
      return activeRef.current;
    }
    return visible[0]?.id ?? current[0].id;
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
    const next = presentRef.current.filter((page) => page.id !== pageId);
    commit(next);
    if (activePageId === pageId) {
      setActivePageId(next[0]?.id ?? null);
    }
    setSelectedId(null);
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

  function changePaper(paper: PageDoc["background"]) {
    const pageId = targetPageId();
    if (!pageId) {
      return;
    }
    commit(presentRef.current.map((page) => (page.id === pageId ? { ...page, background: paper } : page)));
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
      title: { type: "text", w: 0.78, h: 0.14, rotation: 0, props: { text: "Un título", font: "playfair", size: 0.072, color: "#2c2824", weight: 600, italic: false, align: "center", lineHeight: 1.15 } },
      subtitle: { type: "text", w: 0.72, h: 0.1, rotation: 0, props: { text: "Un subtítulo", font: "cormorant", size: 0.046, color: "#6d5344", weight: 500, italic: true, align: "center", lineHeight: 1.2 } },
      body: { type: "text", w: 0.7, h: 0.18, rotation: 0, props: { text: "Escribe tu recuerdo.", font: "inter", size: 0.034, color: "#2c2824", weight: 400, italic: false, align: "left", lineHeight: 1.4 } },
      note: { type: "text", w: 0.62, h: 0.18, rotation: -2, props: { text: "Una nota al margen.", font: "caveat", size: 0.055, color: "#6d5344", weight: 500, italic: false, align: "left", lineHeight: 1.25 } },
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
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setMessage("La imagen no puede superar 5 MB.");
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
      setMessage(getApiErrorMessage(error, "No pudimos subir la fotografía."));
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
      await flush();
    }
    navigate("/mis-caminos");
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

  const stickerItems = filterStickers(
    STICKERS.filter((item) => item.group === (tool === "elements" ? "elementos" : "stickers")),
    query,
    category,
  );

  const statusLabel = uploading ? "Subiendo…" : status === "saving" ? "Guardando…" : status === "saved" && !dirty ? "Guardado" : status === "error" ? "Error al guardar" : dirty ? "Cambios sin guardar" : "Listo";

  return (
    <div className={`bita${opened ? " is-ready" : ""}${mobile ? " is-mobile" : ""}`}>
      <div className="bita-bg" aria-hidden="true" />
      <header className="bita-head">
        <button type="button" className="bita-back" onClick={() => void goBack()}>
          <ChevronLeft size={16} aria-hidden="true" />
          Mis caminos
        </button>
        <div>
          <h1>Mi bitácora</h1>
          <p>Un lugar para guardar las historias que has vivido.</p>
        </div>
      </header>

      {loadError ? (
        <p className="bita-banner" role="alert">{loadError}</p>
      ) : null}
      {!loaded && !loadError ? <p className="bita-banner">Abriendo tu bitácora…</p> : null}

      {loaded ? (
        <>
          <div className="bita-toolbar">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImageIcon size={16} aria-hidden="true" /> Añadir foto
            </button>
            <button type="button" onClick={() => { chooseTool("text"); addText("note"); }}>
              <Type size={16} aria-hidden="true" /> Añadir texto
            </button>
            <button type="button" onClick={() => chooseTool("stickers")}>
              <Sparkles size={16} aria-hidden="true" /> Añadir sticker
            </button>
            <button type="button" onClick={() => chooseTool("papers")}>
              <Palette size={16} aria-hidden="true" /> Cambiar fondo
            </button>
            <button type="button" onClick={() => chooseTool("pages")}>
              <LayoutTemplate size={16} aria-hidden="true" /> Plantillas
            </button>
            <span className="bita-toolbar__gap" />
            <button type="button" onClick={undo} disabled={history.past.length === 0} aria-label="Deshacer">
              <Undo2 size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={redo} disabled={history.future.length === 0} aria-label="Rehacer">
              <Redo2 size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setZoom((value) => clamp(Number((value - 0.08).toFixed(2)), 0.78, 1.24))} aria-label="Alejar">
              <ZoomOut size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setZoom((value) => clamp(Number((value + 0.08).toFixed(2)), 0.78, 1.24))} aria-label="Acercar">
              <ZoomIn size={16} aria-hidden="true" />
            </button>
            <span className="bita-zoom">{Math.round(zoom * 100)}%</span>
            <button type="button" className="bita-save" onClick={() => void flush()}>
              <Save size={15} aria-hidden="true" /> Guardar
            </button>
            <span className={`bita-status is-${status}`} role="status">{statusLabel}</span>
          </div>

          {selected ? (
            <div className="bita-props">
              <button type="button" onClick={duplicateSelected} aria-label="Duplicar"><Copy size={15} aria-hidden="true" /> Duplicar</button>
              <button type="button" onClick={() => layer("front")}><ArrowUp size={15} aria-hidden="true" /> Adelante</button>
              <button type="button" onClick={() => layer("back")}><ArrowDown size={15} aria-hidden="true" /> Atrás</button>
              <button type="button" onClick={removeSelected}><Trash2 size={15} aria-hidden="true" /> Quitar</button>
              {selected.element.type === "photo" ? (
                <PhotoProps
                  element={selected.element}
                  onPatch={(patch, record) => patchSelected((element) => (element.type === "photo" ? { ...element, props: { ...element.props, ...patch } } : element), record)}
                  onReplace={() => {
                    replaceRef.current = true;
                    fileRef.current?.click();
                  }}
                  onGestureStart={beginGesture}
                  onGestureEnd={endGesture}
                />
              ) : null}
              {selected.element.type === "text" ? (
                <TextPropsBar
                  element={selected.element}
                  onPatch={(patch, record) => patchSelected((element) => (element.type === "text" ? { ...element, props: { ...element.props, ...patch } } : element), record)}
                  onGestureStart={beginGesture}
                  onGestureEnd={endGesture}
                />
              ) : null}
            </div>
          ) : null}

          {message ? <p className="bita-banner" role="status">{message}</p> : null}

          <div className="bita-workspace">
            <nav className="bita-rail" aria-label="Herramientas">
              <RailButton id="photos" label="Fotos" active={tool === "photos"} onClick={chooseTool} icon={<ImageIcon size={18} />} />
              <RailButton id="stickers" label="Stickers" active={tool === "stickers"} onClick={chooseTool} icon={<Sparkles size={18} />} />
              <RailButton id="text" label="Texto" active={tool === "text"} onClick={chooseTool} icon={<Type size={18} />} />
              <RailButton id="papers" label="Fondos" active={tool === "papers"} onClick={chooseTool} icon={<Palette size={18} />} />
              <RailButton id="elements" label="Elementos" active={tool === "elements"} onClick={chooseTool} icon={<Shapes size={18} />} />
              <RailButton id="pages" label="Páginas" active={tool === "pages"} onClick={chooseTool} icon={<BookOpen size={18} />} />
            </nav>

            <div className="bita-stage">
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
                {tool === "stickers" || tool === "elements" ? (
                  <StickerLibrary
                    title={tool === "elements" ? "Elementos" : "Stickers"}
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
                      <button type="button" onClick={() => addText("title")}>Añadir título</button>
                      <button type="button" onClick={() => addText("subtitle")}>Añadir subtítulo</button>
                      <button type="button" onClick={() => addText("body")}>Añadir texto</button>
                      <button type="button" onClick={() => addText("note")}>Añadir nota manuscrita</button>
                    </div>
                  </div>
                ) : null}
                {tool === "papers" ? (
                  <div className="bita-library">
                    <h2>Fondos</h2>
                    <div className="bita-papers">
                      {PAPERS.map((paper) => (
                        <button key={paper.id} type="button" className={`bita-swatch is-${paper.id}`} onClick={() => changePaper(paper.id)}>
                          {paper.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                    onCreate={(template) => addPage(template)}
                  />
                ) : null}
              </aside>
            ) : null}
          </div>
        </>
      ) : null}

      <input
        ref={fileRef}
        className="bita-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => void onFiles(event.target.files)}
      />

      {confirm ? (
        <div className="bita-dialog" role="dialog" aria-modal="true" aria-labelledby="bita-confirm-title">
          <div className="bita-dialog__card">
            <h2 id="bita-confirm-title">{confirm.kind === "page" ? "¿Eliminar esta página?" : "¿Quitar esta fotografía?"}</h2>
            <p>{confirm.kind === "page" ? "La página y lo que contiene dejarán de estar en tu bitácora." : "También se quitará de las páginas donde la usaste."}</p>
            <div>
              <button type="button" onClick={() => setConfirm(null)}>Cancelar</button>
              <button
                type="button"
                className="is-danger"
                onClick={() => {
                  if (confirm.kind === "page") {
                    removePage(confirm.id);
                  } else {
                    void removeAsset(confirm.id);
                  }
                }}
              >
                Eliminar
              </button>
            </div>
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
      {assets.length === 0 ? <p className="bita-muted">Todavía no hay fotografías. Cuando subas una, quedará guardada aquí.</p> : null}
      <ul className="bita-photos">
        {assets.map((asset) => (
          <li key={asset.id}>
            <button type="button" onClick={() => onUse(asset)}>
              <img src={mediaUrl(asset.url, 240)} alt="" />
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
            <button type="button" onClick={() => onPick(item.id)} title={item.name}>
              <img src={item.src} alt={item.name} />
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
  onCreate: (template: TemplateId) => void;
}) {
  return (
    <div className="bita-library">
      <h2>Páginas</h2>
      <button type="button" className="bita-library__add" onClick={() => onCreate("blank")}>
        <Plus size={15} aria-hidden="true" /> Nueva página
      </button>
      <div className="bita-templates">
        {TEMPLATES.map((item) => (
          <button key={item.id} type="button" onClick={() => onCreate(item.id)}>{item.label}</button>
        ))}
      </div>
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

function PhotoProps({
  element,
  onPatch,
  onReplace,
  onGestureStart,
  onGestureEnd,
}: {
  element: PhotoElement;
  onPatch: (patch: Partial<PhotoElement["props"]>, record: boolean) => void;
  onReplace: () => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  const frames: Array<{ id: FrameId; label: string }> = [
    { id: "polaroid", label: "Polaroid" },
    { id: "wide", label: "Horizontal" },
    { id: "cream", label: "Crema" },
    { id: "none", label: "Sin marco" },
  ];
  return (
    <>
      {frames.map((frame) => (
        <button key={frame.id} type="button" className={element.props.frame === frame.id ? "is-on" : ""} onClick={() => onPatch({ frame: frame.id }, true)}>
          {frame.label}
        </button>
      ))}
      <button type="button" onClick={onReplace}>Cambiar foto</button>
      <label>
        Leyenda
        <input
          value={element.props.caption}
          maxLength={80}
          onFocus={onGestureStart}
          onBlur={onGestureEnd}
          onChange={(event) => onPatch({ caption: event.target.value }, false)}
        />
      </label>
      <label>
        Horizontal
        <input
          type="range"
          min={-40}
          max={40}
          step={1}
          value={element.props.cropX}
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          onChange={(event) => onPatch({ cropX: Number(event.target.value) }, false)}
        />
      </label>
      <label>
        Vertical
        <input
          type="range"
          min={-40}
          max={40}
          step={1}
          value={element.props.cropY}
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          onChange={(event) => onPatch({ cropY: Number(event.target.value) }, false)}
        />
      </label>
      <label>
        Encuadre
        <input
          type="range"
          min={1}
          max={2.4}
          step={0.05}
          value={element.props.cropScale}
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          onChange={(event) => onPatch({ cropScale: Number(event.target.value) }, false)}
        />
      </label>
    </>
  );
}

function TextPropsBar({
  element,
  onPatch,
  onGestureStart,
  onGestureEnd,
}: {
  element: TextElement;
  onPatch: (patch: Partial<TextElement["props"]>, record: boolean) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  return (
    <>
      <label>
        Tipografía
        <select value={element.props.font} onChange={(event) => onPatch({ font: event.target.value as FontId }, true)}>
          {FONTS.map((font) => (
            <option key={font.id} value={font.id}>{font.label}</option>
          ))}
        </select>
      </label>
      <label>
        Tamaño
        <input
          type="range"
          min={0.028}
          max={0.12}
          step={0.002}
          value={element.props.size}
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          onChange={(event) => onPatch({ size: Number(event.target.value) }, false)}
        />
      </label>
      <div className="bita-colors" aria-label="Color">
        {TEXT_COLORS.map((color) => (
          <button key={color} type="button" style={{ background: color }} aria-label={color} className={element.props.color === color ? "is-on" : ""} onClick={() => onPatch({ color }, true)} />
        ))}
      </div>
      <button type="button" className={element.props.weight >= 600 ? "is-on" : ""} onClick={() => onPatch({ weight: element.props.weight >= 600 ? 400 : 700 }, true)}>Negrita</button>
      <button type="button" className={element.props.italic ? "is-on" : ""} onClick={() => onPatch({ italic: !element.props.italic }, true)}>Cursiva</button>
      {(["left", "center", "right"] as const).map((align) => (
        <button key={align} type="button" className={element.props.align === align ? "is-on" : ""} onClick={() => onPatch({ align }, true)}>
          {align === "left" ? "Izq" : align === "center" ? "Centro" : "Der"}
        </button>
      ))}
      <label>
        Interlineado
        <input
          type="range"
          min={1}
          max={1.8}
          step={0.05}
          value={element.props.lineHeight}
          onPointerDown={onGestureStart}
          onPointerUp={onGestureEnd}
          onChange={(event) => onPatch({ lineHeight: Number(event.target.value) }, false)}
        />
      </label>
      <label>
        Texto
        <textarea
          value={element.props.text}
          rows={2}
          onFocus={onGestureStart}
          onBlur={onGestureEnd}
          onChange={(event) => onPatch({ text: event.target.value }, false)}
        />
      </label>
    </>
  );
}
