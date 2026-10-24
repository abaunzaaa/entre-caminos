import { useEffect, useLayoutEffect, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowUpRight,
  Bold,
  BringToFront,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Italic,
  Minus,
  PaintBucket,
  Palette,
  Plus,
  RotateCcw,
  Search,
  SendToBack,
  Shapes,
  Sticker,
  Trash2,
  Type,
  Underline,
  X,
} from "lucide-react";
import { STICKER_GROUPS, StickerArt } from "./StickerArt";
import {
  bogotaClock,
  bogotaDay,
  bogotaTimeValue,
  bogotaToday,
  longDay,
  monthCells,
  monthName,
  toPlannedAt,
  weekDays,
  weekdayShort,
} from "../../utils/journey-dates";
import { showFavoriteToast } from "../../services/favorites-sync";
import { mediaUrl } from "../../utils/media";
import { getPublicCategories } from "../../services/catalog.service";
import {
  searchJourneyCatalog,
  type JourneyDecoration,
  type JourneyExperience,
  type JourneyPlan,
  type JourneyStickerKey,
  type JourneyTheme,
} from "../../services/journey.service";

const NOTE_TONES = [
  { id: "bosque", label: "Verde Entre Caminos" },
  { id: "verde", label: "Verde salvia" },
  { id: "neutro", label: "Gris oscuro" },
  { id: "beige", label: "Arena" },
  { id: "rosa", label: "Rosa" },
  { id: "azul", label: "Azul" },
  { id: "ocre", label: "Mostaza" },
];

const NOTE_STYLES = [
  { id: "texto", label: "Poppins", font: "Poppins, Nunito, sans-serif", base: 0.64 },
  { id: "nunito", label: "Nunito", font: "Nunito, Poppins, sans-serif", base: 0.68 },
  { id: "serif", label: "Playfair Display", font: '"Playfair Display", Georgia, serif', base: 0.74 },
  { id: "corm", label: "Cormorant Garamond", font: '"Cormorant Garamond", Georgia, serif', base: 0.82 },
  { id: "script", label: "Great Vibes", font: '"Great Vibes", cursive', base: 0.95 },
  { id: "allura", label: "Allura", font: "Allura, cursive", base: 1 },
];

const TEXT_PRESETS = [
  { id: "titulo", label: "Título", style: "serif", bold: true, scale: 1.45 },
  { id: "subtitulo", label: "Subtítulo", style: "texto", bold: true, scale: 1.15 },
  { id: "nota", label: "Nota breve", style: "texto", bold: false, scale: 1 },
  { id: "firma", label: "Manuscrita", style: "script", bold: false, scale: 1.2 },
];

const FILL_TONES = [
  { id: "salvia", label: "Salvia" },
  { id: "arena", label: "Arena" },
  { id: "rosa", label: "Rosa" },
  { id: "cielo", label: "Cielo" },
  { id: "mostaza", label: "Mostaza" },
  { id: "lavanda", label: "Lavanda" },
];

const TOOLS = [
  { id: "texto", label: "Texto", Icon: Type },
  { id: "stickers", label: "Stickers", Icon: Sticker },
  { id: "iconos", label: "Íconos", Icon: Shapes },
  { id: "casilla", label: "Casilla", Icon: PaintBucket },
] as const;

const CORNERS = ["nw", "ne", "sw", "se"] as const;

const ALIGNS = [
  { id: "left", label: "Alinear a la izquierda", Icon: AlignLeft },
  { id: "center", label: "Centrar", Icon: AlignCenter },
  { id: "right", label: "Alinear a la derecha", Icon: AlignRight },
] as const;

const LAYER_BASE = 5;
const EDGE = 2;

const DURATION_STEPS = [
  { id: "", label: "Cualquiera" },
  { id: "short", label: "Hasta 2 horas" },
  { id: "half", label: "De 2 a 5 horas" },
  { id: "long", label: "Más de 5 horas" },
];

const EXPERIENCE_DRAG = "application/x-entre-caminos-experience";

const PRICE_STEPS = [
  { id: "", label: "Cualquiera" },
  { id: "80000", label: "Hasta $80.000" },
  { id: "200000", label: "Hasta $200.000" },
  { id: "500000", label: "Hasta $500.000" },
];

const SCALE_MIN = 0.6;
const SCALE_MAX = 2.4;
const NOTE_SCALE_MAX = 1.8;

type Panel = "summary" | "edit" | "catalog";

type ToolId = (typeof TOOLS)[number]["id"];
type Align = (typeof ALIGNS)[number]["id"];
type NoteFormat = { tone: string; style: string; bold: boolean; italic: boolean; underline: boolean; align: Align };
type Dialog = { mode: "create"; day: string } | { mode: "edit"; plan: JourneyPlan };
type Peek = { day: string; index: number; rect: { left: number; top: number; width: number; bottom: number } };
type Box = { left: number; top: number; width: number; height: number };

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const DEFAULT_FORMAT: NoteFormat = { tone: "neutro", style: "texto", bold: false, italic: false, underline: false, align: "left" };

function placeWithin(area: Box, box: Box) {
  const span = (size: number, total: number) => Math.max(EDGE, 100 - EDGE - (size / total) * 100);
  const x = Math.min(span(box.width, area.width), Math.max(EDGE, ((box.left - area.left) / area.width) * 100));
  const y = Math.min(span(box.height, area.height), Math.max(EDGE, ((box.top - area.top) / area.height) * 100));
  return { x: Math.min(94, Math.round(x * 10) / 10), y: Math.min(94, Math.round(y * 10) / 10) };
}

function readLayer(flags: string) {
  const match = /z(\d)/.exec(flags);
  return match ? Number(match[1]) : LAYER_BASE;
}

function readNote(color: string | null): NoteFormat & { layer: number } {
  const value = color || "neutro";
  const [first = "", second = "", flags = ""] = value.split("-");
  const tone = first === "amarillo" ? "ocre" : NOTE_TONES.some((item) => item.id === first) ? first : "neutro";
  const style = NOTE_STYLES.some((item) => item.id === second) ? second : value === "script" ? "script" : "texto";
  const bold = second === "bold" || value === "tape" || flags.includes("b");
  const italic = flags.includes("i");
  const underline = flags.includes("u");
  const align: Align = flags.includes("c") ? "center" : flags.includes("r") ? "right" : "left";
  return { tone, style, bold, italic, underline, align, layer: readLayer(flags) };
}

function fontOf(style: string) {
  return NOTE_STYLES.find((item) => item.id === style) ?? NOTE_STYLES[0];
}

function layerOf(item: JourneyDecoration) {
  return item.kind === "note" ? readNote(item.color).layer : readLayer(item.color ?? "");
}

function noteColor(format: NoteFormat, layer = LAYER_BASE) {
  const flags = `${format.bold ? "b" : ""}${format.italic ? "i" : ""}${format.underline ? "u" : ""}${format.align === "left" ? "" : format.align[0]}${layer === LAYER_BASE ? "" : `z${layer}`}`;
  if (flags) {
    return `${format.tone}-${format.style}-${flags}`;
  }
  return format.style === "texto" ? format.tone : `${format.tone}-${format.style}`;
}

function dayTitle(iso: string) {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${iso}T12:00:00Z`))
    .replace(",", "");
}

function briefDay(iso: string) {
  const weekday = weekdayShort(iso).replace(".", "");
  const month = shortMonth(Number(iso.slice(0, 4)), Number(iso.slice(5, 7))).toLowerCase();
  return `${weekday.charAt(0).toLocaleUpperCase("es-CO")}${weekday.slice(1)}, ${Number(iso.slice(8))} ${month}`;
}

function shortMonth(year: number, month: number) {
  const label = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1, 12)))
    .replace(".", "")
    .slice(0, 3);
  return label.charAt(0).toLocaleUpperCase("es-CO") + label.slice(1);
}

function stickerScale(rotation: number) {
  return rotation >= 0.55 && rotation <= 2.5 ? rotation : 1;
}

function scaleMax(item: { kind: string }) {
  return item.kind === "note" ? NOTE_SCALE_MAX : SCALE_MAX;
}

function limitScale(value: number, max = SCALE_MAX) {
  return Math.min(max, Math.max(SCALE_MIN, Math.round(value * 100) / 100));
}

function nextScale(item: JourneyDecoration, delta: number) {
  return limitScale(Math.round((stickerScale(item.rotation) + delta) * 10) / 10, scaleMax(item));
}

function noteSize(item: { color: string | null; rotation: number }) {
  return fontOf(readNote(item.color).style).base * Math.min(NOTE_SCALE_MAX, stickerScale(item.rotation));
}

function noteLook(color: string | null) {
  const { tone, style, bold, italic, underline } = readNote(color);
  const script = style === "script" || style === "allura";
  const serif = style === "serif" || style === "corm";
  return `caminos-day__note is-${tone}${script ? " is-script" : ""}${serif ? " is-serif" : ""}${bold ? " is-bold" : ""}${italic ? " is-italic" : ""}${underline ? " is-underline" : ""}`;
}

function clampDay(year: number, month: number, iso: string) {
  const dayNum = Number(iso.slice(8));
  const last = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const day = String(Math.min(dayNum, last)).padStart(2, "0");
  return `${year}-${String(month).padStart(2, "0")}-${day}`;
}

function shiftDay(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function town(location: string) {
  const parts = (location || "").split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] ?? "";
}

function NotePin({
  item,
  picked,
  draft,
  focusTick,
  onDraft,
  onCommit,
  onPress,
}: {
  item: JourneyDecoration;
  picked: boolean;
  draft: string;
  focusTick: number;
  onDraft: (value: string) => void;
  onCommit: (value: string) => void;
  onPress: (event: ReactPointerEvent<HTMLDivElement>, item: JourneyDecoration) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const text = picked ? draft : (item.text || "");

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || document.activeElement === node) {
      return;
    }
    if ((node.textContent ?? "") !== text) {
      node.textContent = text;
    }
  }, [text]);

  useLayoutEffect(() => {
    if (!picked || focusTick === 0) {
      return;
    }
    const node = ref.current;
    if (!node) {
      return;
    }
    node.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    if ((node.textContent ?? "") !== "Texto") {
      range.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [focusTick, picked]);

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label="Cuadro de texto"
      contentEditable={picked}
      suppressContentEditableWarning
      spellCheck={false}
      className={`${noteLook(item.color)} caminos-day__note-pin${picked ? " is-picked" : ""}`}
      style={{ fontSize: `${noteSize(item)}rem`, fontFamily: fontOf(readNote(item.color).style).font, textAlign: readNote(item.color).align }}
      onPointerDown={(event) => onPress(event, item)}
      onInput={(event) => onDraft(event.currentTarget.textContent ?? "")}
      onBlur={(event) => onCommit(event.currentTarget.textContent ?? "")}
    />
  );
}

type Option = { id: string; label: string; font?: string };

function Dropdown({
  label,
  value,
  options,
  onChange,
  variant = "field",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  variant?: "field" | "chip";
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const current = options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const menuWidth = Math.max(rect.width, menuRef.current?.offsetWidth ?? rect.width);
      const below = window.innerHeight - rect.bottom - 18;
      setBox({
        left: Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.left)),
        top: rect.bottom + 6,
        width: rect.width,
        height: Math.max(140, Math.min(260, below)),
      });
    };
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key, true);
    };
  }, [open]);

  return (
    <div className={`caminos-select is-${variant}${open ? " is-open" : ""}${variant === "chip" && value ? " is-set" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="caminos-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? ""}`}
        onClick={() => setOpen((state) => !state)}
      >
        <span style={current?.font ? { fontFamily: current.font } : undefined}>{variant === "chip" && !value ? label : current?.label ?? label}</span>
        <ChevronDown size={variant === "chip" ? 12 : 14} strokeWidth={1.6} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          ref={menuRef}
          className="caminos-select__menu"
          role="listbox"
          aria-label={label}
          style={box ? { left: box.left, top: box.top, minWidth: box.width, maxHeight: box.height } : { left: 0, top: 0, visibility: "hidden" }}
        >
          {options.map((option) => (
            <li key={option.id || "all"} role="none">
              <button
                type="button"
                role="option"
                aria-selected={option.id === value}
                className={`is-${option.id || "all"}${option.id === value ? " is-selected" : ""}`}
                style={option.font ? { fontFamily: option.font } : undefined}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.id === value ? <Check size={14} strokeWidth={1.8} aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const TIME_HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const TIME_MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function centerTimeOption(list: HTMLUListElement | null) {
  const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
  if (!list || !selected) {
    return;
  }
  list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.offsetHeight / 2;
}

function TimePicker({
  value,
  onChange,
  variant = "inline",
}: {
  value: string;
  onChange: (value: string) => void;
  variant?: "inline" | "field";
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number; listHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLUListElement>(null);
  const minuteListRef = useRef<HTMLUListElement>(null);
  const [hour = "09", minute = "00"] = value.split(":");

  useEffect(() => {
    if (!open) {
      return;
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const menuWidth = 196;
      const preferRight = variant === "inline";
      const rawLeft = preferRight ? rect.right - menuWidth : rect.left;
      const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rawLeft));
      const below = window.innerHeight - rect.bottom - 16;
      const listHeight = Math.max(148, Math.min(220, below - 36));
      setBox({ left, top: rect.bottom + 6, listHeight });
    };
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key, true);
    };
  }, [open, variant]);

  useLayoutEffect(() => {
    if (!open || !box) {
      return;
    }
    centerTimeOption(hourListRef.current);
    centerTimeOption(minuteListRef.current);
  }, [open, box, hour, minute]);

  return (
    <div className={`caminos-time is-${variant}${open ? " is-open" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="caminos-time__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Hora ${hour}:${minute}`}
        onClick={() => setOpen((state) => !state)}
      >
        {variant === "inline" ? <Clock size={12} strokeWidth={1.5} aria-hidden="true" /> : null}
        <span>{`${hour}:${minute}`}</span>
        {variant === "field" ? <ChevronDown size={14} strokeWidth={1.6} aria-hidden="true" /> : null}
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="caminos-select__menu caminos-time__menu"
          role="dialog"
          aria-label="Elegir hora"
          style={box ? { left: box.left, top: box.top } : { left: 0, top: 0, visibility: "hidden" }}
        >
          <div className="caminos-time__col">
            <span>Hora</span>
            <ul ref={hourListRef} role="listbox" aria-label="Hora" style={box ? { maxHeight: box.listHeight } : undefined}>
              {TIME_HOURS.map((item) => (
                <li key={item} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={item === hour}
                    className={item === hour ? "is-selected" : ""}
                    onClick={() => onChange(`${item}:${minute}`)}
                  >
                    <span>{item}</span>
                    {item === hour ? <Check size={13} strokeWidth={1.8} aria-hidden="true" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="caminos-time__col">
            <span>Min</span>
            <ul ref={minuteListRef} role="listbox" aria-label="Minutos" style={box ? { maxHeight: box.listHeight } : undefined}>
              {TIME_MINUTES.map((item) => (
                <li key={item} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={item === minute}
                    className={item === minute ? "is-selected" : ""}
                    onClick={() => onChange(`${hour}:${item}`)}
                  >
                    <span>{item}</span>
                    {item === minute ? <Check size={13} strokeWidth={1.8} aria-hidden="true" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value.slice(0, 7));
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const today = bogotaToday();
  const year = Number(cursor.slice(0, 4));
  const month = Number(cursor.slice(5, 7));
  const cells = monthCells(year, month);
  const label = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));

  useEffect(() => {
    if (!open) {
      return;
    }
    setCursor(value.slice(0, 7));
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      const width = menuRef.current?.offsetWidth ?? 280;
      if (!rect) {
        return;
      }
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left));
      const top = Math.min(rect.bottom + 6, window.innerHeight - 340);
      setBox({ left, top: Math.max(12, top) });
    };
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key, true);
    };
  }, [open, value]);

  function shift(delta: number) {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
    setCursor(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className={`caminos-date${open ? " is-open" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="caminos-date__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Fecha ${label}`}
        onClick={() => setOpen((state) => !state)}
      >
        <span>{label}</span>
        <ChevronDown size={14} strokeWidth={1.6} aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="caminos-monthpick__menu caminos-date__menu"
          role="dialog"
          aria-label="Elegir fecha"
          style={box ? { left: box.left, top: box.top } : { left: 0, top: 0, visibility: "hidden" }}
        >
          <div className="caminos-monthpick__head">
            <button type="button" aria-label="Mes anterior" onClick={() => shift(-1)}>
              <ChevronLeft size={14} strokeWidth={1.6} aria-hidden="true" />
            </button>
            <span>{monthName(year, month)} {year}</span>
            <button type="button" aria-label="Mes siguiente" onClick={() => shift(1)}>
              <ChevronRight size={14} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
          <div className="caminos-date__week" aria-hidden="true">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="caminos-date__grid">
            {cells.map((day) => {
              const inMonth = day.slice(0, 7) === cursor;
              return (
                <button
                  key={day}
                  type="button"
                  className={`${day === value ? "is-on" : ""}${day === today ? " is-now" : ""}${inMonth ? "" : " is-out"}`}
                  aria-pressed={day === value}
                  aria-label={longDay(day)}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MonthPicker({
  year,
  month,
  onPick,
  prev,
  next
}: {
  year: number;
  month: number;
  onPick: (year: number, month: number) => void;
  prev?: ReactNode;
  next?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(year);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yearRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = bogotaToday().slice(0, 7);

  useEffect(() => {
    if (!open) {
      return;
    }
    setView(year);
    const place = () => {
      const rect = yearRef.current?.getBoundingClientRect();
      const width = menuRef.current?.offsetWidth ?? 240;
      if (rect) {
        setBox({ left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2)), top: rect.bottom + 8 });
      }
    };
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !yearRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key, true);
    };
  }, [open, year]);

  return (
    <div className={`caminos-monthpick${open ? " is-open" : ""}`}>
      <div className="caminos-monthpick__row">
        {prev}
        <button
          ref={triggerRef}
          type="button"
          className="caminos-monthpick__trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Cambiar mes, ${monthName(year, month)} de ${year}`}
          onClick={() => setOpen((state) => !state)}
        >
          <span className="caminos-monthpick__month">{monthName(year, month)}</span>
        </button>
        {next}
      </div>
      <button
        ref={yearRef}
        type="button"
        className="caminos-monthpick__year"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Cambiar año, ${year}`}
        onClick={() => setOpen((state) => !state)}
      >
        {year}
        <ChevronDown size={11} strokeWidth={1.7} aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="caminos-monthpick__menu"
          role="dialog"
          aria-label="Elegir mes"
          style={box ? { left: box.left, top: box.top } : { left: 0, top: 0, visibility: "hidden" }}
        >
          <div className="caminos-monthpick__head">
            <button type="button" aria-label="Año anterior" onClick={() => setView((value) => value - 1)}>
              <ChevronLeft size={14} strokeWidth={1.6} aria-hidden="true" />
            </button>
            <span>{view}</span>
            <button type="button" aria-label="Año siguiente" onClick={() => setView((value) => value + 1)}>
              <ChevronRight size={14} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
          <div className="caminos-monthpick__grid">
            {MONTHS.map((item) => {
              const on = view === year && item === month;
              const now = `${view}-${String(item).padStart(2, "0")}` === current;
              return (
                <button
                  key={item}
                  type="button"
                  className={`${on ? "is-on" : ""}${now ? " is-now" : ""}`}
                  aria-pressed={on}
                  aria-label={`${monthName(view, item)} de ${view}`}
                  onClick={() => {
                    onPick(view, item);
                    setOpen(false);
                  }}
                >
                  {shortMonth(view, item)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function priceLabel(item: JourneyExperience) {
  if (item.price == null) {
    return "";
  }
  if (item.price === 0) {
    return "Gratis";
  }
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: item.currency || "COP", maximumFractionDigits: 0 }).format(item.price);
}

export function JourneyCalendar({
  plans,
  decorations,
  theme,
  memoryPlanIds,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
  onDecorate,
  onMoveDecoration,
  onCommitDecoration,
  onShiftDecoration,
  onDeleteDecoration,
  onRecolorDecoration,
  onUpdateNote,
  onScaleDecoration,
  onRemember,
  onClose,
  onMonthChange,
  initialDay,
}: {
  plans: JourneyPlan[];
  decorations: JourneyDecoration[];
  theme: JourneyTheme;
  memoryPlanIds: Set<string>;
  onCreatePlan: (experienceId: string, plannedAt: string) => Promise<void>;
  onUpdatePlan: (planId: string, plannedAt: string) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onDecorate: (input: { kind: "sticker" | "note" | "fill"; stickerKey?: JourneyStickerKey; text?: string; day?: string; color?: string; x?: number; y?: number; rotation?: number }) => Promise<JourneyDecoration | null | void>;
  onMoveDecoration: (id: string, x: number, y: number) => void;
  onCommitDecoration: (id: string, x: number, y: number) => Promise<void>;
  onShiftDecoration: (id: string, day: string, x: number, y: number) => Promise<void>;
  onDeleteDecoration: (id: string) => Promise<void>;
  onRecolorDecoration: (id: string, color: string) => Promise<void>;
  onUpdateNote: (id: string, text: string, color: string) => void;
  onScaleDecoration: (id: string, scale: number) => void;
  onRemember: (plan: JourneyPlan) => void;
  onClose?: () => void;
  onMonthChange?: (month: number) => void;
  initialDay?: string;
}) {
  const today = bogotaToday();
  const startDay = initialDay ?? today;
  const [year, setYear] = useState(() => Number(startDay.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(startDay.slice(5, 7)));
  const [selected, setSelected] = useState(startDay);
  const [mode, setMode] = useState<"month" | "week">(() =>
    window.matchMedia("(max-width: 720px)").matches ? "week" : "month",
  );
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [experienceId, setExperienceId] = useState("");
  const [time, setTime] = useState("09:00");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<JourneyExperience[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [format, setFormat] = useState<NoteFormat>(DEFAULT_FORMAT);
  const [tool, setTool] = useState<ToolId>("texto");
  const [picked, setPicked] = useState<string | null>(null);
  const [noteEdit, setNoteEdit] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const [panel, setPanel] = useState<Panel>("edit");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [category, setCategory] = useState("");
  const [place, setPlace] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [searching, setSearching] = useState(false);
  const [duration, setDuration] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [peek, setPeek] = useState<Peek | null>(null);
  const [peekConfirm, setPeekConfirm] = useState(false);
  const [peekPos, setPeekPos] = useState<{ left: number; top: number } | null>(null);
  const peekRef = useRef<HTMLDivElement>(null);

  const cells = mode === "month" ? monthCells(year, month) : weekDays(selected);
  const dayPlans = plans.filter((plan) => bogotaDay(plan.plannedAt) === selected);
  const dayFill = decorations.find((item) => item.kind === "fill" && item.day === selected);
  const pickedSticker = decorations.find((item) => item.id === picked && item.kind === "sticker");
  const pickedNote = decorations.find((item) => item.id === noteEdit && item.kind === "note");
  const editing = panel === "edit";
  const peekPlans = peek ? plans.filter((plan) => bogotaDay(plan.plannedAt) === peek.day) : [];
  const peekPlan = peek ? peekPlans[Math.min(peek.index, peekPlans.length - 1)] : undefined;

  useEffect(() => {
    onMonthChange?.(month);
  }, [month, onMonthChange]);

  useEffect(() => {
    if (panel !== "catalog") {
      return;
    }
    let cancel = false;
    void getPublicCategories()
      .then((rows) => {
        if (!cancel) {
          setCategories(rows.map((item) => ({ id: item.id, name: item.name })));
        }
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [panel]);

  useEffect(() => {
    if (panel !== "catalog") {
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchJourneyCatalog(query, controller.signal, { category, location: place, maxPrice, duration })
        .then((rows) => {
          setHits(rows);
          setSearching(false);
          setLocations((current) => {
            const next = new Set(current);
            rows.forEach((row) => {
              const name = town(row.location);
              if (name) {
                next.add(name);
              }
            });
            return next.size === current.length ? current : [...next].sort((a, b) => a.localeCompare(b, "es"));
          });
        })
        .catch((error: { code?: string; name?: string }) => {
          if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
            return;
          }
          setHits([]);
          setSearching(false);
        });
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [panel, query, category, place, maxPrice, duration]);

  useEffect(() => {
    if (noteEdit) {
      return;
    }
    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const host = anchor instanceof Element ? anchor : anchor?.parentElement;
    if (host?.closest(".caminos-day__note-pin")) {
      selection?.removeAllRanges();
      (host.closest(".caminos-day__note-pin") as HTMLElement).blur();
    }
  }, [noteEdit]);

  useEffect(() => {
    if (!editing || (!picked && !noteEdit)) {
      return;
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        (document.activeElement as HTMLElement | null)?.blur?.();
        setPicked(null);
        setNoteEdit(null);
        return;
      }
      const typing = (event.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable='true']");
      if (typing || !picked || (event.key !== "Delete" && event.key !== "Backspace")) {
        return;
      }
      const item = decorations.find((entry) => entry.id === picked);
      if (item) {
        event.preventDefault();
        removeDecoration(item);
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [editing, picked, noteEdit, decorations]);

  useEffect(() => {
    if (peek && !peekPlan) {
      setPeek(null);
    }
  }, [peek, peekPlan]);

  useEffect(() => {
    if (!peek) {
      return;
    }
    const away = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (peekRef.current?.contains(target) || target?.closest?.(".caminos-day__plan")) {
        return;
      }
      setPeek(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setPeek(null);
      }
    };
    const close = () => setPeek(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", close);
    };
  }, [peek]);

  useLayoutEffect(() => {
    const node = peekRef.current;
    if (!peek || !node) {
      setPeekPos(null);
      return;
    }
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const { rect } = peek;
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + rect.width / 2 - width / 2));
    const below = rect.bottom + 8;
    const top = below + height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - height - 8);
    setPeekPos({ left, top });
  }, [peek, peekPlan?.id, peekConfirm]);

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
    const nextYear = next.getUTCFullYear();
    const nextMonth = next.getUTCMonth() + 1;
    setYear(nextYear);
    setMonth(nextMonth);
    const nextDay = clampDay(nextYear, nextMonth, selected);
    setSelected(nextDay);
    setDialog((current) => (current?.mode === "create" ? { mode: "create", day: nextDay } : null));
  }

  function shiftWeek(delta: number) {
    const next = shiftDay(selected, delta);
    setSelected(next);
    setYear(Number(next.slice(0, 4)));
    setMonth(Number(next.slice(5, 7)));
    setDialog((current) => (current?.mode === "create" ? { mode: "create", day: next } : null));
  }

  function pickMonth(nextYear: number, nextMonth: number) {
    const nextDay = clampDay(nextYear, nextMonth, selected);
    setYear(nextYear);
    setMonth(nextMonth);
    setSelected(nextDay);
    setDialog((current) => (current?.mode === "create" ? { mode: "create", day: nextDay } : null));
  }

  function chooseDay(day: string) {
    setSelected(day);
    setYear(Number(day.slice(0, 4)));
    setMonth(Number(day.slice(5, 7)));
    setPicked(null);
    setNoteEdit(null);
    if (panel === "summary") {
      setPanel("edit");
    }
    setDialog((current) => (current?.mode === "create" ? { mode: "create", day } : null));
  }

  function openPeek(day: string, anchor: HTMLElement, index = 0) {
    const rect = anchor.getBoundingClientRect();
    setPeekConfirm(false);
    setPeek({ day, index, rect: { left: rect.left, top: rect.top, width: rect.width, bottom: rect.bottom } });
  }

  function openPersonalize() {
    setPanel("edit");
    setDialog(null);
  }

  function closeStudio() {
    commitNoteDraft();
    setPicked(null);
    setNoteEdit(null);
    setPanel("summary");
  }

  function openCatalog() {
    if (panel === "catalog") {
      openPersonalize();
      return;
    }
    setPanel("catalog");
    setPicked(null);
    setNoteEdit(null);
    setDialog({ mode: "create", day: selected });
    setExperienceId("");
    setQuery("");
    setHits([]);
    setTime("09:00");
    setFormError("");
  }

  function openEdit(plan: JourneyPlan) {
    const day = bogotaDay(plan.plannedAt);
    setSelected(day);
    setYear(Number(day.slice(0, 4)));
    setMonth(Number(day.slice(5, 7)));
    setPanel("summary");
    setDialog({ mode: "edit", plan });
    setTime(bogotaTimeValue(plan.plannedAt));
    setFormError("");
  }

  function selectNote(item: JourneyDecoration) {
    setPicked(null);
    setNoteEdit(item.id);
    setNoteDraft(item.text ?? "");
    setTool("texto");
    const { tone, style, bold, italic, underline, align } = readNote(item.color);
    setFormat({ tone, style, bold, italic, underline, align });
  }

  function commitNoteDraft(text = noteDraft) {
    if (!noteEdit) {
      return;
    }
    const value = text.trim();
    if (!value) {
      return;
    }
    setNoteDraft(value);
    const current = decorations.find((item) => item.id === noteEdit);
    onUpdateNote(noteEdit, value, noteColor(format, current ? layerOf(current) : LAYER_BASE));
    fitDecoration(noteEdit);
  }

  function placeDecoration(id: string, aim: (area: DOMRect, box: DOMRect) => Box) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const node = document.querySelector<HTMLElement>(`[data-deco="${id}"]`);
        const cell = node?.closest<HTMLElement>(".caminos-day");
        if (!node || !cell) {
          return;
        }
        const area = cell.getBoundingClientRect();
        const next = placeWithin(area, aim(area, node.getBoundingClientRect()));
        if (Math.abs(next.x - parseFloat(node.style.left)) < 0.5 && Math.abs(next.y - parseFloat(node.style.top)) < 0.5) {
          return;
        }
        onMoveDecoration(id, next.x, next.y);
        void onCommitDecoration(id, next.x, next.y);
      });
    });
  }

  function fitDecoration(id: string) {
    placeDecoration(id, (_area, box) => box);
  }

  function centerDecoration(id: string) {
    placeDecoration(id, (area, box) => ({
      left: area.left + (area.width - box.width) / 2,
      top: area.top + area.height * 0.56 - box.height / 2,
      width: box.width,
      height: box.height,
    }));
  }

  function applyFormat(patch: Partial<NoteFormat>) {
    const next = { ...format, ...patch };
    setFormat(next);
    const current = decorations.find((item) => item.id === noteEdit);
    if (!noteEdit || !current) {
      return;
    }
    const value = (noteDraft || current.text || "").trim();
    if (value) {
      onUpdateNote(noteEdit, value, noteColor(next, layerOf(current)));
      fitDecoration(noteEdit);
    }
  }

  function alignText(align: Align) {
    applyFormat({ align });
    if (!noteEdit) {
      return;
    }
    placeDecoration(noteEdit, (area, box) => ({
      left: align === "left" ? area.left + area.width * 0.06 : align === "right" ? area.right - area.width * 0.06 - box.width : area.left + (area.width - box.width) / 2,
      top: box.top,
      width: box.width,
      height: box.height,
    }));
  }

  async function addTextBox(preset?: (typeof TEXT_PRESETS)[number]) {
    const look: NoteFormat = preset ? { ...DEFAULT_FORMAT, tone: format.tone, style: preset.style, bold: preset.bold } : { ...DEFAULT_FORMAT, tone: format.tone };
    const created = await onDecorate({
      kind: "note",
      text: preset?.label ?? "Texto",
      day: selected,
      color: noteColor(look),
      x: 40,
      y: 46,
      rotation: preset?.scale ?? 1,
    });
    if (!created || created.kind !== "note") {
      return;
    }
    selectNote(created);
    setFocusTick((current) => current + 1);
    centerDecoration(created.id);
  }

  async function addSticker(key: string) {
    const created = await onDecorate({ kind: "sticker", stickerKey: key as JourneyStickerKey, day: selected, x: 44, y: 44 });
    if (!created) {
      return;
    }
    setNoteEdit(null);
    setPicked(created.id);
    centerDecoration(created.id);
  }

  async function duplicateDecoration(item: JourneyDecoration) {
    if (!item.day) {
      return;
    }
    const text = item.kind === "note" ? (noteEdit === item.id ? noteDraft.trim() : "") || item.text || "Texto" : undefined;
    const created = await onDecorate({
      kind: item.kind === "note" ? "note" : "sticker",
      stickerKey: (item.stickerKey as JourneyStickerKey | null) ?? undefined,
      text,
      day: item.day,
      color: item.color ?? undefined,
      x: Math.min(90, item.x + 8),
      y: Math.min(90, item.y + 8),
      rotation: item.rotation,
    });
    if (!created) {
      return;
    }
    if (created.kind === "note") {
      selectNote(created);
    } else {
      setNoteEdit(null);
      setPicked(created.id);
    }
    fitDecoration(created.id);
  }

  function restack(item: JourneyDecoration, direction: 1 | -1) {
    const others = decorations
      .filter((entry) => entry.id !== item.id && entry.day === item.day && entry.kind !== "fill")
      .map(layerOf);
    if (others.length === 0) {
      return;
    }
    const target = Math.min(9, Math.max(0, direction > 0 ? Math.max(...others) + 1 : Math.min(...others) - 1));
    if (target === layerOf(item)) {
      return;
    }
    const color = item.kind === "note" ? noteColor(noteEdit === item.id ? format : readNote(item.color), target) : `z${target}`;
    void onRecolorDecoration(item.id, color);
  }

  async function paintDay(tone: string | null) {
    if (!tone) {
      if (dayFill) {
        await onDeleteDecoration(dayFill.id);
      }
      return;
    }
    if (dayFill) {
      if (dayFill.color !== tone) {
        await onRecolorDecoration(dayFill.id, tone);
      }
      return;
    }
    await onDecorate({ kind: "fill", day: selected, color: tone });
  }

  function removeDecoration(item: JourneyDecoration) {
    if (noteEdit === item.id) {
      setNoteEdit(null);
    }
    if (picked === item.id) {
      setPicked(null);
    }
    void onDeleteDecoration(item.id);
  }

  function dragDecoration(event: ReactPointerEvent<HTMLElement>, item: JourneyDecoration, onTap?: () => void) {
    const node = event.currentTarget.closest<HTMLElement>("[data-deco]");
    const home = node?.closest<HTMLElement>(".caminos-day");
    const grid = home?.parentElement;
    if (!node || !home || !grid) {
      return;
    }
    event.stopPropagation();
    const pointer = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const cellsInGrid = Array.from(grid.querySelectorAll<HTMLElement>(".caminos-day[data-day]"));
    let moved = false;
    let target: HTMLElement = home;
    const cellAt = (x: number, y: number) =>
      cellsInGrid.find((cell) => {
        const rect = cell.getBoundingClientRect();
        return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
      });
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      target.classList.remove("is-deco-target");
      home.classList.remove("is-deco-home");
      node.classList.remove("is-dragging");
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) {
        return;
      }
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved) {
        if (Math.hypot(dx, dy) < 4) {
          return;
        }
        moved = true;
        window.getSelection()?.removeAllRanges();
        node.classList.add("is-dragging");
        home.classList.add("is-deco-home");
      }
      node.style.transform = `translate(${dx}px, ${dy}px)`;
      const next = cellAt(ev.clientX, ev.clientY) ?? target;
      if (next !== target) {
        target.classList.remove("is-deco-target");
        target = next;
        if (target !== home) {
          target.classList.add("is-deco-target");
        }
      }
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) {
        return;
      }
      finish();
      node.style.transform = "";
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) {
        return;
      }
      finish();
      if (!moved) {
        node.style.transform = "";
        onTap?.();
        return;
      }
      const box = node.getBoundingClientRect();
      node.style.transform = "";
      const day = target.dataset.day ?? item.day ?? selected;
      const next = placeWithin(target.getBoundingClientRect(), box);
      if (day === item.day) {
        onMoveDecoration(item.id, next.x, next.y);
        void onCommitDecoration(item.id, next.x, next.y);
        return;
      }
      if (item.kind === "note" && noteEdit === item.id) {
        commitNoteDraft();
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      setSelected(day);
      void onShiftDecoration(item.id, day, next.x, next.y);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }

  function pressNote(event: ReactPointerEvent<HTMLDivElement>, item: JourneyDecoration) {
    if (!editing) {
      return;
    }
    const already = noteEdit === item.id;
    if (!already) {
      selectNote(item);
    }
    dragDecoration(event, item, () => {
      if (!already) {
        setFocusTick((current) => current + 1);
      }
    });
  }

  function resizeDecoration(event: ReactPointerEvent<HTMLSpanElement>, item: JourneyDecoration) {
    event.preventDefault();
    event.stopPropagation();
    const frame = event.currentTarget.parentElement;
    if (!frame) {
      return;
    }
    const box = frame.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const start = Math.max(6, Math.hypot(event.clientX - cx, event.clientY - cy));
    const base = stickerScale(item.rotation);
    const pointer = event.pointerId;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) {
        return;
      }
      onScaleDecoration(item.id, limitScale(base * (Math.hypot(ev.clientX - cx, ev.clientY - cy) / start), scaleMax(item)));
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) {
        return;
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      fitDecoration(item.id);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  async function savePlan() {
    if (!dialog) {
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const day = dialog.mode === "create" ? dialog.day : selected;
      const clock = time || "09:00";
      if (dialog.mode === "create") {
        if (!experienceId) {
          setFormError("Elige una experiencia del catálogo.");
          return;
        }
        await onCreatePlan(experienceId, toPlannedAt(day, clock));
      } else {
        await onUpdatePlan(dialog.plan.id, toPlannedAt(selected, clock));
      }
      setDialog(null);
      setPanel("edit");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos guardar el plan.");
    } finally {
      setBusy(false);
    }
  }

  async function addExperience(experienceId: string, day = selected) {
    if (addingId) {
      return;
    }
    setAddingId(experienceId);
    setFormError("");
    try {
      await onCreatePlan(experienceId, toPlannedAt(day, time || "09:00"));
      setAddedId(experienceId);
      window.setTimeout(() => setAddedId((current) => (current === experienceId ? null : current)), 1800);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No pudimos agregar la experiencia.");
    } finally {
      setAddingId(null);
    }
  }

  function dropExperience(event: ReactDragEvent<HTMLDivElement>, day: string) {
    const experienceId = event.dataTransfer.getData(EXPERIENCE_DRAG);
    setDropDay(null);
    if (!experienceId) {
      return;
    }
    event.preventDefault();
    chooseDay(day);
    void addExperience(experienceId, day);
  }

  function saveChanges() {
    commitNoteDraft();
    setSaved(true);
    showFavoriteToast("Cambios guardados");
    window.setTimeout(() => setSaved(false), 1600);
  }

  function pressSticker(event: ReactPointerEvent<HTMLButtonElement>, item: JourneyDecoration) {
    if (!editing) {
      return;
    }
    setNoteEdit(null);
    setPicked(item.id);
    dragDecoration(event, item);
  }

  function frame(item: JourneyDecoration, active: boolean, children: ReactNode) {
    const side = item.y < 40 ? " is-below" : "";
    const hold = (event: ReactPointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    return (
      <div key={item.id} className={`caminos-deco${active ? " is-active" : ""}`} data-deco={item.id} style={{ left: `${item.x}%`, top: `${item.y}%` }}>
        {children}
        {active ? (
          <>
            <button type="button" className={`caminos-deco__trash${side}`} aria-label="Eliminar elemento" title="Eliminar" onPointerDown={hold} onClick={() => removeDecoration(item)}>
              <Trash2 size={10} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {CORNERS.map((corner) => (
              <span key={corner} className={`caminos-deco__handle is-${corner}`} aria-hidden="true" onPointerDown={(event) => resizeDecoration(event, item)} />
            ))}
          </>
        ) : null}
      </div>
    );
  }

  const palette = (
    <div className="caminos-agenda__tones" role="group" aria-label="Color del texto">
      {NOTE_TONES.map((tone) => (
        <button key={tone.id} type="button" className={`caminos-agenda__dot is-${tone.id}${format.tone === tone.id ? " is-on" : ""}`} aria-pressed={format.tone === tone.id} aria-label={tone.label} title={tone.label} onClick={() => applyFormat({ tone: tone.id })} />
      ))}
    </div>
  );
  function stepper(label: string, item: JourneyDecoration, display: string) {
    const scale = stickerScale(item.rotation);
    return (
      <div className="caminos-stepper" role="group" aria-label={label}>
        <button type="button" aria-label={`Reducir ${label.toLowerCase()}`} disabled={scale <= SCALE_MIN} onClick={() => { onScaleDecoration(item.id, nextScale(item, -0.1)); fitDecoration(item.id); }}>
          <Minus size={12} strokeWidth={1.6} />
        </button>
        <output>{display}</output>
        <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={scale >= scaleMax(item)} onClick={() => { onScaleDecoration(item.id, nextScale(item, 0.1)); fitDecoration(item.id); }}>
          <Plus size={12} strokeWidth={1.6} />
        </button>
      </div>
    );
  }
  const arrange = (item: JourneyDecoration) => (
    <div className="caminos-format" role="group" aria-label="Organizar">
      <button type="button" aria-label="Duplicar" title="Duplicar" onClick={() => void duplicateDecoration(item)}>
        <Copy size={13} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <button type="button" aria-label="Traer al frente" title="Traer al frente" onClick={() => restack(item, 1)}>
        <BringToFront size={13} strokeWidth={1.6} aria-hidden="true" />
      </button>
      <button type="button" aria-label="Enviar atrás" title="Enviar atrás" onClick={() => restack(item, -1)}>
        <SendToBack size={13} strokeWidth={1.6} aria-hidden="true" />
      </button>
    </div>
  );
  const stickerTiles = (keys: readonly string[]) => (
    <div className="caminos-tiles">
      {keys.map((key) => (
        <button key={key} type="button" aria-label={`Agregar ${key}`} onClick={() => void addSticker(key)}>
          <StickerArt stickerKey={key as JourneyStickerKey} />
        </button>
      ))}
    </div>
  );
  const filterChip = (label: string, value: string, onChange: (value: string) => void, options: Option[]) => (
    <Dropdown variant="chip" label={label} value={value} options={options} onChange={onChange} />
  );

  const visibleDow = mode === "month" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] : cells.map((day) => weekdayShort(day));

  return (
    <section className={`caminos-agenda is-split${editing ? " is-editing" : ""}`} aria-labelledby="caminos-calendar-title">
      <div className="caminos-agenda__main">
      <header className="caminos-agenda__bar caminos-agenda__mast">
        <h2 id="caminos-calendar-title" className="caminos-sr">Mi calendario</h2>
        <div className="caminos-agenda__modes">
          <div role="group" aria-label="Vista del calendario">
            <button type="button" className={mode === "month" ? "is-on" : ""} onClick={() => setMode("month")}>Mensual</button>
            <button type="button" className={mode === "week" ? "is-on" : ""} onClick={() => setMode("week")}>Semanal</button>
          </div>
        </div>
        <div className="caminos-agenda__monthline">
          <MonthPicker
            year={year}
            month={month}
            onPick={pickMonth}
            prev={
              <button type="button" className="caminos-monthpick__step" aria-label={mode === "month" ? "Mes anterior" : "Semana anterior"} onClick={() => (mode === "month" ? shiftMonth(-1) : shiftWeek(-7))}>
                <ChevronLeft size={17} strokeWidth={1.6} aria-hidden="true" />
              </button>
            }
            next={
              <button type="button" className="caminos-monthpick__step" aria-label={mode === "month" ? "Mes siguiente" : "Semana siguiente"} onClick={() => (mode === "month" ? shiftMonth(1) : shiftWeek(7))}>
                <ChevronRight size={17} strokeWidth={1.6} aria-hidden="true" />
              </button>
            }
          />
        </div>
        {onClose ? <button type="button" className="caminos-agenda__close" onClick={onClose} aria-label="Cerrar calendario">×</button> : null}
      </header>

        <div className={`caminos-grid caminos-board--${theme}${mode === "week" ? " is-week" : ""}`}>
          {visibleDow.map((label) => (
            <span key={label} className="caminos-dow">{label}</span>
          ))}
          {cells.map((day) => {
            const items = plans.filter((plan) => bogotaDay(plan.plannedAt) === day);
            const layered = decorations
              .filter((item) => (item.kind === "note" || item.kind === "sticker") && item.day === day)
              .map((item, index) => ({ item, index }))
              .sort((a, b) => layerOf(a.item) - layerOf(b.item) || a.index - b.index)
              .map((entry) => entry.item);
            const fill = decorations.find((item) => item.kind === "fill" && item.day === day);
            const outside = mode === "month" && Number(day.slice(5, 7)) !== month;
            const dropping = dropDay === day || (panel === "catalog" && day === selected && items.length === 0);
            const active = editing && day === selected && Boolean(noteEdit || picked);
            return (
              <div
                key={day}
                data-day={day}
                data-fill={fill?.color ?? undefined}
                className={`caminos-day${day === selected ? " is-selected" : ""}${day === today ? " is-today" : ""}${outside ? " is-out" : ""}${dropDay === day ? " is-drop" : ""}${fill ? " has-fill" : ""}${active ? " has-active" : ""}`}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(EXPERIENCE_DRAG)) {
                    return;
                  }
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  if (dropDay !== day) {
                    setDropDay(day);
                  }
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDropDay((current) => (current === day ? null : current));
                  }
                }}
                onDrop={(event) => dropExperience(event, day)}
              >
                <button
                  type="button"
                  className="caminos-day__hit"
                  aria-pressed={day === selected}
                  aria-current={day === today ? "date" : undefined}
                  aria-label={`${longDay(day)}${day === today ? ", hoy" : ""}`}
                  onClick={() => chooseDay(day)}
                />
                <span className="caminos-day__num">{Number(day.slice(8))}</span>
                {items[0] ? (
                  <button
                    type="button"
                    className="caminos-day__plan"
                    aria-label={`Ver ${items[0].experience.title}`}
                    onClick={(event) => {
                      chooseDay(day);
                      openPeek(day, event.currentTarget);
                    }}
                  >
                    <span>
                      <strong>{items[0].experience.title}</strong>
                      <em>{bogotaClock(items[0].plannedAt)}{items.length > 1 ? ` · +${items.length - 1}` : ""}</em>
                    </span>
                    <img src={mediaUrl(items[0].experience.imageUrl, 200)} alt="" loading="lazy" />
                  </button>
                ) : null}
                {dropping ? (
                  <span className="caminos-day__drop" aria-hidden="true">
                    <Plus size={16} strokeWidth={1.4} />
                  </span>
                ) : null}
                {layered.map((item) =>
                  item.kind === "note"
                    ? frame(
                        item,
                        editing && noteEdit === item.id,
                        <NotePin
                          item={item}
                          picked={editing && noteEdit === item.id}
                          draft={noteDraft}
                          focusTick={noteEdit === item.id ? focusTick : 0}
                          onDraft={setNoteDraft}
                          onCommit={commitNoteDraft}
                          onPress={pressNote}
                        />,
                      )
                    : frame(
                        item,
                        editing && picked === item.id,
                        <button
                          type="button"
                          className={`caminos-day__sticker${editing && picked === item.id ? " is-picked" : ""}`}
                          style={{ width: `${(mode === "week" ? 2.1 : 1.5) * stickerScale(item.rotation)}rem` }}
                          aria-label="Mover sticker"
                          onPointerDown={(event) => pressSticker(event, item)}
                        >
                          <StickerArt stickerKey={item.stickerKey ?? "leaf"} />
                        </button>,
                      ),
                )}
            </div>
          );
        })}
        </div>
        <div className="caminos-agenda__actions">
          <button type="button" className={`tourist-hero__cta${panel === "edit" ? "" : " is-ghost"}`} aria-pressed={panel === "edit"} onClick={openPersonalize}>
            <Palette size={14} strokeWidth={1.5} aria-hidden="true" />Personalizar
          </button>
          <button type="button" className={`tourist-hero__cta${panel === "catalog" ? "" : " is-ghost"}`} aria-pressed={panel === "catalog"} onClick={openCatalog}>
            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />Agregar experiencia
          </button>
        </div>
      </div>

        <aside className={`caminos-panel caminos-agenda__side is-${panel}`} aria-label="Día seleccionado">
          {panel === "catalog" ? (
            <header className="caminos-studio__head">
              <h3>Agregar experiencia</h3>
              <p className="caminos-studio__date">
                <CalendarDays size={13} strokeWidth={1.5} aria-hidden="true" />
                <span>{longDay(selected)}</span>
                <label>
                  <span className="caminos-sr">Hora</span>
                  <TimePicker value={time} onChange={setTime} />
                </label>
              </p>
            </header>
          ) : panel === "edit" ? (
            <header className="caminos-studio__head is-compact">
              <button type="button" className="caminos-studio__back" aria-label="Salir de personalizar" title="Vista previa" onClick={closeStudio}>
                <ChevronLeft size={14} strokeWidth={1.7} aria-hidden="true" />
              </button>
              <div>
                <span className="caminos-studio__kicker">Personalizar</span>
                <h3 className="caminos-studio__day">{briefDay(selected)}</h3>
              </div>
            </header>
          ) : (
            <header className="caminos-studio__head is-compact">
              <div>
                <span className="caminos-studio__kicker">{selected === today ? "Hoy" : "Tu día"}</span>
                <h3 className="caminos-studio__day">{dayTitle(selected)}</h3>
              </div>
            </header>
          )}

          {panel === "summary" && !dialog ? (
            <div className="caminos-dayctx">
              {dayPlans.length ? (
                <ul className="caminos-dayctx__plans">
                  {dayPlans.map((plan, index) => (
                    <li key={plan.id}>
                      <button type="button" className="caminos-dayctx__plan" onClick={(event) => openPeek(selected, event.currentTarget, index)}>
                        <img src={mediaUrl(plan.experience.imageUrl, 160)} alt="" loading="lazy" />
                        <span>
                          <strong>{plan.experience.title}</strong>
                          <em>{bogotaClock(plan.plannedAt)}{town(plan.experience.location) ? ` · ${town(plan.experience.location)}` : ""}</em>
                        </span>
                        <ChevronRight size={14} strokeWidth={1.6} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="caminos-dayctx__empty">
                  <span className="caminos-dayctx__icon" aria-hidden="true">
                    <CalendarPlus size={15} strokeWidth={1.5} />
                  </span>
                  <span>Sin planes este día</span>
                  <button type="button" onClick={openCatalog}>Agregar</button>
                </div>
              )}
            </div>
          ) : null}

          {panel === "edit" ? (
            <div className="caminos-agenda__studio">
              <div className="caminos-agenda__tools" role="tablist" aria-label="Herramientas">
                {TOOLS.map(({ id, label, Icon }) => (
                  <button key={id} type="button" role="tab" aria-selected={tool === id} className={tool === id ? "is-on" : ""} onClick={() => setTool(id)}>
                    <Icon size={16} strokeWidth={1.4} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="caminos-studio__body">
              {tool === "texto" ? (
                <div className="caminos-studio__block caminos-studio__fields">
                  <button type="button" className="caminos-studio__add" onClick={() => void addTextBox()}>
                    <Plus size={13} strokeWidth={1.7} aria-hidden="true" />Agregar texto
                  </button>
                  {pickedNote ? (
                    <>
                      <div className="caminos-studio__field">
                        <span className="caminos-studio__label">Tipografía</span>
                        <Dropdown label="Tipografía" value={format.style} options={NOTE_STYLES} onChange={(id) => applyFormat({ style: id })} />
                      </div>
                      <div className="caminos-studio__pair">
                        <div className="caminos-studio__field">
                          <span className="caminos-studio__label">Tamaño</span>
                          {stepper("Tamaño", pickedNote, String(Math.round(noteSize(pickedNote) * 16)))}
                        </div>
                        <div className="caminos-studio__field">
                          <span className="caminos-studio__label">Estilo</span>
                          <div className="caminos-format" role="group" aria-label="Estilo del texto">
                            <button type="button" className={format.bold ? "is-on" : ""} aria-pressed={format.bold} aria-label="Negrita" title="Negrita" onClick={() => applyFormat({ bold: !format.bold })}>
                              <Bold size={13} strokeWidth={2.1} aria-hidden="true" />
                            </button>
                            <button type="button" className={format.italic ? "is-on" : ""} aria-pressed={format.italic} aria-label="Cursiva" title="Cursiva" onClick={() => applyFormat({ italic: !format.italic })}>
                              <Italic size={13} strokeWidth={1.8} aria-hidden="true" />
                            </button>
                            <button type="button" className={format.underline ? "is-on" : ""} aria-pressed={format.underline} aria-label="Subrayado" title="Subrayado" onClick={() => applyFormat({ underline: !format.underline })}>
                              <Underline size={13} strokeWidth={1.8} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="caminos-studio__pair">
                        <div className="caminos-studio__field">
                          <span className="caminos-studio__label">Alineación</span>
                          <div className="caminos-format" role="group" aria-label="Alineación del texto">
                            {ALIGNS.map(({ id, label, Icon }) => (
                              <button key={id} type="button" className={format.align === id ? "is-on" : ""} aria-pressed={format.align === id} aria-label={label} title={label} onClick={() => alignText(id)}>
                                <Icon size={13} strokeWidth={1.8} aria-hidden="true" />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="caminos-studio__field">
                          <span className="caminos-studio__label">Organizar</span>
                          {arrange(pickedNote)}
                        </div>
                      </div>
                      <div className="caminos-studio__field">
                        <span className="caminos-studio__label">Color</span>
                        {palette}
                      </div>
                    </>
                  ) : (
                    <div className="caminos-studio__field">
                      <span className="caminos-studio__label">Estilos de texto</span>
                      <div className="caminos-presets">
                        {TEXT_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            style={{ fontFamily: fontOf(preset.style).font, fontWeight: preset.bold ? 600 : 400, fontSize: `${fontOf(preset.style).base * preset.scale * 1.15}rem` }}
                            onClick={() => void addTextBox(preset)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {tool === "stickers" || tool === "iconos" ? (
                <div className="caminos-studio__block caminos-studio__fields">
                  {pickedSticker ? (
                    <div className="caminos-studio__pair">
                      <div className="caminos-studio__field">
                        <span className="caminos-studio__label">Tamaño</span>
                        {stepper("Tamaño", pickedSticker, `${Math.round(stickerScale(pickedSticker.rotation) * 100)}%`)}
                      </div>
                      <div className="caminos-studio__field">
                        <span className="caminos-studio__label">Organizar</span>
                        {arrange(pickedSticker)}
                      </div>
                    </div>
                  ) : null}
                  {stickerTiles((tool === "stickers" ? STICKER_GROUPS[0] : STICKER_GROUPS[1]).keys)}
                </div>
              ) : null}

              {tool === "casilla" ? (
                <div className="caminos-studio__block caminos-studio__fields">
                  <div className="caminos-studio__field">
                    <span className="caminos-studio__label">Fondo del día</span>
                    <div className="caminos-fills" role="group" aria-label="Color de la casilla">
                      {FILL_TONES.map((tone) => (
                        <button
                          key={tone.id}
                          type="button"
                          data-fill={tone.id}
                          className={`caminos-fill${dayFill?.color === tone.id ? " is-on" : ""}`}
                          aria-pressed={dayFill?.color === tone.id}
                          aria-label={tone.label}
                          title={tone.label}
                          onClick={() => void paintDay(tone.id)}
                        />
                      ))}
                    </div>
                  </div>
                  <button type="button" className="caminos-studio__reset" disabled={!dayFill} onClick={() => void paintDay(null)}>
                    <RotateCcw size={12} strokeWidth={1.7} aria-hidden="true" />Restaurar color
                  </button>
                </div>
              ) : null}
              </div>
              <footer className="caminos-studio__foot">
                <button type="button" className="tourist-hero__cta caminos-agenda__save" onClick={saveChanges}>
                  {saved ? <Check size={14} strokeWidth={1.6} aria-hidden="true" /> : null}
                  {saved ? "Guardado" : "Guardar cambios"}
                </button>
              </footer>
            </div>
          ) : null}

          {panel === "summary" && dialog?.mode === "edit" ? (
            <form className="caminos-sheet caminos-agenda__form" onSubmit={(event) => { event.preventDefault(); void savePlan(); }}>
              <h3>Cambiar fecha</h3>
              <p>{dialog.plan.experience.title}</p>
              <label>Fecha
                <DateField value={selected} onChange={setSelected} />
              </label>
              <label>Hora
                <TimePicker variant="field" value={time} onChange={setTime} />
              </label>
              {formError ? <p className="caminos-error">{formError}</p> : null}
              <div className="caminos-inline">
                <button type="button" onClick={openPersonalize} disabled={busy}>Cancelar</button>
                <button type="submit" className="tourist-hero__cta" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
              </div>
            </form>
          ) : null}

          {panel === "catalog" ? (
            <div className="caminos-catalog">
              <label className="caminos-catalog__search" htmlFor="caminos-search">
                <Search size={15} strokeWidth={1.5} aria-hidden="true" />
                <span className="caminos-sr">Buscar</span>
                <input id="caminos-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar experiencias" />
              </label>
              <div className="caminos-chips" role="group" aria-label="Filtros">
                {filterChip("Categoría", category, setCategory, [
                  { id: "", label: "Todas" },
                  ...categories.map((item) => ({ id: item.name, label: item.name })),
                ])}
                {filterChip("Ubicación", place, setPlace, [
                  { id: "", label: "Todas" },
                  ...locations.map((item) => ({ id: item, label: item })),
                ])}
                {filterChip("Precio", maxPrice, setMaxPrice, PRICE_STEPS)}
                {filterChip("Duración", duration, setDuration, DURATION_STEPS)}
              </div>
              {formError ? <p className="caminos-error">{formError}</p> : null}
              <ul className="caminos-offers">
                {hits.map((item) => {
                  const facts = [item.duration, priceLabel(item)].filter(Boolean).join(" · ");
                  return (
                    <li
                      key={item.id}
                      className="caminos-offer"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(EXPERIENCE_DRAG, item.id);
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={() => setDropDay(null)}
                    >
                      <img src={mediaUrl(item.imageUrl, 240)} alt="" loading="lazy" draggable={false} />
                      <div className="caminos-offer__body">
                        <strong>{item.title}</strong>
                        <span className="caminos-offer__meta">{[item.category, town(item.location)].filter(Boolean).join(" · ")}</span>
                        {facts ? <span className="caminos-offer__meta is-facts">{facts}</span> : null}
                      </div>
                      <button
                        type="button"
                        className={`caminos-offer__add${addedId === item.id ? " is-done" : ""}`}
                        disabled={addingId !== null}
                        aria-label={addedId === item.id ? `${item.title} agregada` : `Agregar ${item.title}`}
                        title={addedId === item.id ? "Agregada" : "Agregar"}
                        onClick={() => void addExperience(item.id)}
                      >
                        {addedId === item.id ? <Check size={14} strokeWidth={1.7} aria-hidden="true" /> : <Plus size={14} strokeWidth={1.7} aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {hits.length === 0 ? <p className="caminos-agenda__hint">{searching ? "Buscando…" : "Sin resultados."}</p> : null}
              <p className="caminos-catalog__tip">También puedes arrastrarlas a un día.</p>
            </div>
          ) : null}
        </aside>

        {peek && peekPlan ? (
          <div
            ref={peekRef}
            className="caminos-peek"
            role="dialog"
            aria-label={peekPlan.experience.title}
            style={peekPos ? { left: peekPos.left, top: peekPos.top } : { left: 0, top: 0, visibility: "hidden" }}
          >
            <button type="button" className="caminos-peek__close" aria-label="Cerrar" onClick={() => setPeek(null)}>
              <X size={13} strokeWidth={1.7} aria-hidden="true" />
            </button>
            <img className="caminos-peek__photo" src={mediaUrl(peekPlan.experience.imageUrl, 520)} alt="" />
            <div className="caminos-peek__body">
              <span className="caminos-peek__when">{longDay(peek.day)} · {bogotaClock(peekPlan.plannedAt)}</span>
              <strong>{peekPlan.experience.title}</strong>
              <span className="caminos-peek__meta">{[peekPlan.experience.category, town(peekPlan.experience.location)].filter(Boolean).join(" · ")}</span>
              {peekConfirm ? (
                <div className="caminos-peek__actions">
                  <span className="caminos-peek__ask">¿Quitar este plan?</span>
                  <button type="button" onClick={() => setPeekConfirm(false)}>Cancelar</button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => {
                      void onDeletePlan(peekPlan.id).then(() => setPeekConfirm(false));
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="caminos-peek__actions">
                  {peekPlan.experience.status === "PUBLISHED" ? (
                    <Link className="caminos-peek__cta" to={`/explorar/${peekPlan.experience.id}`}>
                      Ver experiencia<ArrowUpRight size={12} strokeWidth={1.7} aria-hidden="true" />
                    </Link>
                  ) : null}
                  <button type="button" onClick={() => { setPeek(null); openEdit(peekPlan); }}>Cambiar fecha</button>
                  <button type="button" onClick={() => setPeekConfirm(true)}>Quitar</button>
                  {bogotaDay(peekPlan.plannedAt) < today && !memoryPlanIds.has(peekPlan.id) ? (
                    <button type="button" onClick={() => { setPeek(null); onRemember(peekPlan); }}>Crear recuerdo</button>
                  ) : null}
                </div>
              )}
              {peekPlans.length > 1 ? (
                <div className="caminos-peek__pager">
                  <button type="button" aria-label="Plan anterior" disabled={peek.index === 0} onClick={() => { setPeekConfirm(false); setPeek({ ...peek, index: peek.index - 1 }); }}>
                    <ChevronLeft size={13} strokeWidth={1.6} aria-hidden="true" />
                  </button>
                  <span>{Math.min(peek.index, peekPlans.length - 1) + 1} de {peekPlans.length}</span>
                  <button type="button" aria-label="Plan siguiente" disabled={peek.index >= peekPlans.length - 1} onClick={() => { setPeekConfirm(false); setPeek({ ...peek, index: peek.index + 1 }); }}>
                    <ChevronRight size={13} strokeWidth={1.6} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
    </section>
  );
}
