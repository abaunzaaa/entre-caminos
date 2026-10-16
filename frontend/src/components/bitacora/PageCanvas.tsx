import { useState, useRef } from "react";
import { mediaUrl } from "../../utils/media";
import { stickerById } from "./catalog";
import { FONT_CLASS } from "./fonts";
import { clamp, type BitElement, type PageDoc } from "./types";

export const BITACORA_MIME = "application/x-ec-bitacora";

export type BitacoraDrop =
  | { kind: "photo"; assetId: string; url: string }
  | { kind: "sticker"; stickerId: string };

export function writeBitacoraDrop(event: React.DragEvent, payload: BitacoraDrop) {
  const raw = JSON.stringify(payload);
  event.dataTransfer.setData(BITACORA_MIME, raw);
  event.dataTransfer.setData("text/plain", raw);
  event.dataTransfer.effectAllowed = "copy";
}

function readBitacoraDrop(raw: string): BitacoraDrop | null {
  try {
    const value = JSON.parse(raw) as BitacoraDrop;
    if (value?.kind === "photo" && value.assetId && value.url) {
      return value;
    }
    if (value?.kind === "sticker" && value.stickerId) {
      return value;
    }
  } catch {
    return null;
  }
  return null;
}

type Handle = "move" | "nw" | "ne" | "sw" | "se" | "rotate";

function paperUnder(clientX: number, clientY: number) {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    const paper = node.closest("[data-paper-id]");
    if (paper instanceof HTMLElement) {
      return paper;
    }
  }
  const spread = document.querySelector(".bita-spread")?.getBoundingClientRect();
  if (!spread || clientY < spread.top || clientY > spread.bottom) {
    return null;
  }
  let best: HTMLElement | null = null;
  let bestDist = Infinity;
  for (const paper of document.querySelectorAll<HTMLElement>("[data-paper-id]")) {
    const rect = paper.getBoundingClientRect();
    const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
    if (dx < bestDist) {
      bestDist = dx;
      best = paper;
    }
  }
  return best;
}

export function PageCanvas({
  page,
  selectedId,
  editingId,
  interactive,
  active,
  onSelect,
  onActivate,
  onBegin,
  onLive,
  onEnd,
  onEdit,
  onPlace,
  onCarry,
  adjusting,
}: {
  page: PageDoc;
  selectedId: string | null;
  editingId: string | null;
  interactive: boolean;
  active: boolean;
  onSelect: (id: string | null) => void;
  onActivate: () => void;
  onBegin: () => void;
  onLive: (element: BitElement) => void;
  onEnd: () => void;
  onEdit: (id: string) => void;
  onText: (element: BitElement, text: string) => void;
  onPlace?: (payload: BitacoraDrop, point: { x: number; y: number }, elementId: string | null) => void;
  onCarry?: (element: BitElement, pageId: string) => void;
  adjusting?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [hot, setHot] = useState(false);
  const ordered = [...page.elements].sort((a, b) => a.z - b.z);

  function point(clientX: number, clientY: number) {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  }

  function start(event: React.PointerEvent<HTMLElement>, element: BitElement, handle: Handle) {
    if (!interactive) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("textarea")) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    onSelect(element.id);
    onActivate();
    onBegin();
    const startPoint = point(event.clientX, event.clientY);
    const grabX = startPoint.x - element.x;
    const grabY = startPoint.y - element.y;
    const origin = { ...element, px: startPoint.x, py: startPoint.y };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== event.pointerId) {
        return;
      }
      if (handle === "move" && !(adjusting && element.type === "photo" && selectedId === element.id)) {
        const paper = paperUnder(ev.clientX, ev.clientY);
        const rect = paper?.getBoundingClientRect();
        const pageId = paper?.getAttribute("data-paper-id");
        if (!paper || !rect || !pageId || rect.width === 0 || rect.height === 0) {
          return;
        }
        const px = (ev.clientX - rect.left) / rect.width;
        const py = (ev.clientY - rect.top) / rect.height;
        const carried = { ...element, x: clamp(px - grabX, -0.35, 0.92), y: clamp(py - grabY, -0.28, 0.9) };
        if (onCarry) {
          onCarry(carried, pageId);
        } else {
          onLive(carried);
        }
        return;
      }
      const next = point(ev.clientX, ev.clientY);
      const dx = next.x - origin.px;
      const dy = next.y - origin.py;
      if (handle === "move" && element.type === "photo") {
        onLive({
          ...element,
          props: {
            ...element.props,
            cropX: clamp(element.props.cropX + dx * 120, -40, 40),
            cropY: clamp(element.props.cropY + dy * 120, -40, 40),
          },
        });
        return;
      }
      if (handle === "rotate") {
        const cx = origin.x + origin.w / 2;
        const cy = origin.y + origin.h / 2;
        const startAngle = Math.atan2(origin.py - cy, origin.px - cx);
        const angle = Math.atan2(next.y - cy, next.x - cx);
        let rotation = origin.rotation + ((angle - startAngle) * 180) / Math.PI;
        rotation = ((rotation + 540) % 360) - 180;
        onLive({ ...element, rotation });
        return;
      }
      const lockRatio = element.type === "photo" || element.type === "sticker";
      let x = origin.x;
      let y = origin.y;
      let w = origin.w;
      let h = origin.h;
      if (lockRatio && origin.h > 0) {
        const ratio = origin.w / origin.h;
        const dw = handle === "se" || handle === "ne" ? dx : -dx;
        const dh = handle === "se" || handle === "sw" ? dy : -dy;
        if (Math.abs(dw) >= Math.abs(dh * ratio)) {
          w = clamp(origin.w + dw, 0.08, 1.15);
          h = clamp(w / ratio, 0.06, 1.15);
          w = clamp(h * ratio, 0.08, 1.15);
        } else {
          h = clamp(origin.h + dh, 0.06, 1.15);
          w = clamp(h * ratio, 0.08, 1.15);
          h = clamp(w / ratio, 0.06, 1.15);
        }
      } else {
        if (handle === "se" || handle === "ne") w = origin.w + dx;
        if (handle === "sw" || handle === "nw") w = origin.w - dx;
        if (handle === "se" || handle === "sw") h = origin.h + dy;
        if (handle === "ne" || handle === "nw") h = origin.h - dy;
        w = clamp(w, 0.08, 1.15);
        h = clamp(h, 0.06, 1.15);
      }
      if (handle === "sw" || handle === "nw") x = origin.x + origin.w - w;
      if (handle === "ne" || handle === "nw") y = origin.y + origin.h - h;
      onLive({ ...element, x, y, w, h });
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== event.pointerId) {
        return;
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      onEnd();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  return (
    <div
      ref={rootRef}
      className={`bita-paper is-${page.background}${active ? " is-active" : ""}${hot ? " is-hot" : ""}${adjusting ? " is-adjusting" : ""}`}
      data-paper="true"
      data-paper-id={page.id}
      onDragOver={(event) => {
        if (!interactive || !onPlace) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        const host = (event.target as HTMLElement).closest("[data-element]");
        const id = host?.getAttribute("data-id") ?? null;
        const photo = id ? page.elements.find((item) => item.id === id && item.type === "photo") : null;
        setHot(true);
        setDropId(photo ? id : null);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) {
          return;
        }
        setHot(false);
        setDropId(null);
      }}
      onDrop={(event) => {
        if (!interactive || !onPlace) {
          return;
        }
        const raw = event.dataTransfer.getData(BITACORA_MIME) || event.dataTransfer.getData("text/plain");
        const payload = readBitacoraDrop(raw);
        setHot(false);
        setDropId(null);
        if (!payload) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const host = (event.target as HTMLElement).closest("[data-element]");
        onActivate();
        onPlace(payload, point(event.clientX, event.clientY), host?.getAttribute("data-id") ?? null);
      }}
      onPointerDown={(event) => {
        if (!interactive) {
          return;
        }
        if (event.target === event.currentTarget) {
          onActivate();
          onSelect(null);
        }
      }}
    >
      {ordered.map((element) => {
        const selected = interactive && selectedId === element.id;
        const style = {
          left: `${element.x * 100}%`,
          top: `${element.y * 100}%`,
          width: `${element.w * 100}%`,
          height: `${element.h * 100}%`,
          transform: `rotate(${element.rotation}deg)`,
          zIndex: element.z,
        };
        return (
          <div
            key={element.id}
            className={`bita-el${selected ? " is-selected" : ""}${dropId === element.id ? " is-drop" : ""}`}
            style={style}
            data-element="true"
            data-id={element.id}
            onPointerDown={(event) => start(event, element, "move")}
            onDoubleClick={(event) => {
              event.stopPropagation();
              if (element.type === "text") {
                onEdit(element.id);
              }
            }}
          >
            {element.type === "photo" ? <PhotoBody element={element} /> : null}
            {element.type === "sticker" ? <StickerBody element={element} /> : null}
            {element.type === "text" ? (
              editingId === element.id && interactive ? (
                <textarea
                  className={`bita-text ${FONT_CLASS[element.props.font]}`}
                  style={textStyle(element)}
                  value={element.props.text}
                  aria-label="Editar texto"
                  onPointerDown={(event) => event.stopPropagation()}
                  onFocus={onBegin}
                  onBlur={onEnd}
                  onChange={(event) => {
                    const paper = rootRef.current?.getBoundingClientRect();
                    let h = element.h;
                    if (paper && paper.height > 0) {
                      const needed = event.currentTarget.scrollHeight / paper.height;
                      if (needed > h + 0.008) {
                        h = clamp(needed + 0.012, h, 0.95);
                      }
                    }
                    onLive({ ...element, h, props: { ...element.props, text: event.target.value } });
                  }}
                  autoFocus
                />
              ) : (
                <p className={`bita-text ${FONT_CLASS[element.props.font]}`} style={textStyle(element)}>
                  {element.props.text || "Escribe algo"}
                </p>
              )
            ) : null}
            {selected ? (
              <>
                {(["nw", "ne", "sw", "se"] as const).map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    className={`bita-handle is-${handle}`}
                    data-handle="true"
                    aria-label="Cambiar tamaño"
                    onPointerDown={(event) => start(event, element, handle)}
                  />
                ))}
                <button
                  type="button"
                  className="bita-handle is-rotate"
                  data-handle="true"
                  aria-label="Rotar"
                  onPointerDown={(event) => start(event, element, "rotate")}
                />
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function textStyle(element: Extract<BitElement, { type: "text" }>): React.CSSProperties {
  return {
    fontSize: `${element.props.size * 100}cqh`,
    color: element.props.color,
    fontWeight: element.props.weight,
    fontStyle: element.props.italic ? "italic" : "normal",
    textAlign: element.props.align,
    lineHeight: element.props.lineHeight,
  };
}

function PhotoBody({ element }: { element: Extract<BitElement, { type: "photo" }> }) {
  const { frame, url, caption, cropX, cropY, cropScale } = element.props;
  return (
    <div className={`bita-polaroid is-${frame}`}>
      <div className="bita-polaroid__shot">
        {url ? (
          <img
            src={mediaUrl(url, 960)}
            alt=""
            draggable={false}
            style={{ transform: `translate(${cropX}%, ${cropY}%) scale(${cropScale})` }}
          />
        ) : (
          <span className="bita-photo__empty">Suelta una foto</span>
        )}
      </div>
      {frame !== "none" ? <span className="bita-polaroid__caption">{caption || " "}</span> : null}
    </div>
  );
}

function StickerBody({ element }: { element: Extract<BitElement, { type: "sticker" }> }) {
  const sticker = stickerById(element.props.stickerId);
  if (!sticker) {
    return null;
  }
  return <img className="bita-sticker" src={sticker.src} alt="" draggable={false} />;
}
