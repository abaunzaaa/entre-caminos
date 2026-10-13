import { useRef } from "react";
import { mediaUrl } from "../../utils/media";
import { stickerById } from "./catalog";
import { clamp, type BitElement, type PageDoc } from "./types";

type Handle = "move" | "nw" | "ne" | "sw" | "se" | "rotate";

const FONT_CLASS = {
  playfair: "bita-font-playfair",
  inter: "bita-font-inter",
  cormorant: "bita-font-cormorant",
  vibes: "bita-font-vibes",
  allura: "bita-font-allura",
  caveat: "bita-font-caveat",
  special: "bita-font-special",
  nunito: "bita-font-nunito",
} as const;

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
  onText,
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
}) {
  const rootRef = useRef<HTMLDivElement>(null);
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
    const origin = { ...element, px: startPoint.x, py: startPoint.y };
    const node = event.currentTarget;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== event.pointerId) {
        return;
      }
      const next = point(ev.clientX, ev.clientY);
      const dx = next.x - origin.px;
      const dy = next.y - origin.py;
      if (handle === "move") {
        onLive({ ...element, x: clamp(origin.x + dx, -0.08, 0.92), y: clamp(origin.y + dy, -0.08, 0.9) });
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
      let x = origin.x;
      let y = origin.y;
      let w = origin.w;
      let h = origin.h;
      if (handle === "se" || handle === "ne") w = origin.w + dx;
      if (handle === "sw" || handle === "nw") w = origin.w - dx;
      if (handle === "se" || handle === "sw") h = origin.h + dy;
      if (handle === "ne" || handle === "nw") h = origin.h - dy;
      w = clamp(w, 0.08, 1.15);
      h = clamp(h, 0.06, 1.15);
      if (handle === "sw" || handle === "nw") x = origin.x + origin.w - w;
      if (handle === "ne" || handle === "nw") y = origin.y + origin.h - h;
      onLive({ ...element, x, y, w, h });
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== event.pointerId) {
        return;
      }
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
      onEnd();
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    node.setPointerCapture(event.pointerId);
  }

  return (
    <div
      ref={rootRef}
      className={`bita-paper is-${page.background}${active ? " is-active" : ""}`}
      data-paper="true"
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
            className={`bita-el${selected ? " is-selected" : ""}`}
            style={style}
            data-element="true"
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
                  onChange={(event) => onText(element, event.target.value)}
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
          <span className="bita-photo__empty">Tu fotografía</span>
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
