import { useEffect, useState } from "react";
import { PageCanvas } from "./PageCanvas";
import type { BitElement, PageDoc, TemplateId } from "./types";

type Flip = { dir: 1 | -1; from: number; to: number; run: boolean };

export function BitacoraBook({
  pages,
  cursor,
  mobile,
  zoom,
  selectedId,
  editingId,
  locked,
  activePageId,
  onCursor,
  onSelect,
  onActivate,
  onBegin,
  onLive,
  onEnd,
  onEdit,
  onText,
  onCreate,
}: {
  pages: PageDoc[];
  cursor: number;
  mobile: boolean;
  zoom: number;
  selectedId: string | null;
  editingId: string | null;
  locked: boolean;
  activePageId: string | null;
  onCursor: (index: number) => void;
  onSelect: (id: string | null) => void;
  onActivate: (pageId: string) => void;
  onBegin: () => void;
  onLive: (pageId: string, element: BitElement) => void;
  onEnd: () => void;
  onEdit: (id: string) => void;
  onText: (pageId: string, element: BitElement, text: string) => void;
  onCreate: (template: TemplateId) => void;
}) {
  const step = mobile ? 1 : 2;
  const [flip, setFlip] = useState<Flip | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!flip?.run) {
      return;
    }
    const timeout = window.setTimeout(() => {
      onCursor(flip.to);
      setFlip(null);
    }, 820);
    return () => window.clearTimeout(timeout);
  }, [flip, onCursor]);

  function canGo(dir: 1 | -1) {
    const next = cursor + dir * step;
    return next >= 0 && next < pages.length;
  }

  function go(dir: 1 | -1) {
    if (flip || locked || !canGo(dir)) {
      return;
    }
    const next = cursor + dir * step;
    if (reduced) {
      onCursor(next);
      return;
    }
    setFlip({ dir, from: cursor, to: next, run: false });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setFlip((current) => (current && current.to === next ? { ...current, run: true } : current));
      });
    });
  }

  function onLeafEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== "transform" || !flip?.run) {
      return;
    }
    onCursor(flip.to);
    setFlip(null);
  }

  const showRight = !mobile;
  const leftIndex = !flip ? cursor : mobile ? flip.to : flip.dir === 1 ? flip.from : flip.to;
  const rightIndex = !flip ? cursor + 1 : flip.dir === 1 ? flip.to + 1 : flip.from + 1;
  const leafFrontIndex = flip ? (flip.dir === 1 ? flip.from + (mobile ? 0 : 1) : flip.from) : -1;
  const leafBackIndex = flip ? (flip.dir === 1 ? flip.to : flip.to + (mobile ? 0 : 1)) : -1;

  return (
    <div className="bita-book-slot" style={{ "--zoom": String(zoom) } as React.CSSProperties}>
      <div className={`bita-book${mobile ? " is-mobile" : ""}`}>
        <div
          className="bita-spread"
          onPointerDown={(event) => {
            if (locked || flip) {
              return;
            }
            const target = event.target as HTMLElement;
            if (!target.closest("[data-paper]") || target.closest("[data-element]") || target.closest("button, textarea, input")) {
              return;
            }
            const startX = event.clientX;
            const startY = event.clientY;
            const up = (ev: PointerEvent) => {
              const dx = ev.clientX - startX;
              const dy = ev.clientY - startY;
              window.removeEventListener("pointerup", up);
              if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                go(dx < 0 ? 1 : -1);
              }
            };
            window.addEventListener("pointerup", up);
          }}
        >
            <Sheet
              page={pages[leftIndex] ?? null}
              pageNumber={leftIndex + 1}
              interactive={!flip}
              selectedId={selectedId}
              editingId={editingId}
              active={pages[leftIndex]?.id === activePageId}
              welcome={pages.length === 0}
              onSelect={onSelect}
            onActivate={onActivate}
            onBegin={onBegin}
            onLive={onLive}
            onEnd={onEnd}
            onEdit={onEdit}
            onText={onText}
            onCreate={onCreate}
          />
          {showRight ? (
            <Sheet
              page={pages[rightIndex] ?? null}
              pageNumber={pages[rightIndex] ? rightIndex + 1 : null}
              interactive={!flip}
              selectedId={selectedId}
              editingId={editingId}
              active={pages[rightIndex]?.id === activePageId}
              welcome={false}
              onSelect={onSelect}
              onActivate={onActivate}
              onBegin={onBegin}
              onLive={onLive}
              onEnd={onEnd}
              onEdit={onEdit}
              onText={onText}
              onCreate={onCreate}
            />
          ) : null}
          {flip ? (
            <div
              className={`bita-leaf ${flip.dir === 1 ? "is-next" : "is-prev"}${flip.run ? " is-run" : ""}`}
              onTransitionEnd={onLeafEnd}
            >
              <div className="bita-leaf__face is-front">
                <Sheet page={pages[leafFrontIndex] ?? null} pageNumber={null} interactive={false} selectedId={null} editingId={null} active={false} welcome={false} onSelect={onSelect} onActivate={onActivate} onBegin={onBegin} onLive={onLive} onEnd={onEnd} onEdit={onEdit} onText={onText} onCreate={onCreate} />
              </div>
              <div className="bita-leaf__face is-back">
                <Sheet page={pages[leafBackIndex] ?? null} pageNumber={null} interactive={false} selectedId={null} editingId={null} active={false} welcome={false} onSelect={onSelect} onActivate={onActivate} onBegin={onBegin} onLive={onLive} onEnd={onEnd} onEdit={onEdit} onText={onText} onCreate={onCreate} />
              </div>
            </div>
          ) : null}
          <div className="bita-spine" aria-hidden="true" />
        </div>
      </div>
      <div className="bita-turn">
        <button type="button" className="bita-turn__btn" onClick={() => go(-1)} disabled={!canGo(-1) || Boolean(flip) || locked} aria-label="Página anterior">
          ‹
        </button>
        <span className="bita-turn__label">
          {pages.length === 0 ? "Sin páginas" : `${Math.min(cursor + 1, pages.length)} de ${pages.length}`}
        </span>
        <button type="button" className="bita-turn__btn" onClick={() => go(1)} disabled={!canGo(1) || Boolean(flip) || locked} aria-label="Página siguiente">
          ›
        </button>
        <button type="button" className="bita-turn__add" onClick={() => onCreate("blank")}>
          + Añadir página
        </button>
      </div>
    </div>
  );
}

function Sheet({
  page,
  pageNumber,
  interactive,
  selectedId,
  editingId,
  active,
  welcome,
  onSelect,
  onActivate,
  onBegin,
  onLive,
  onEnd,
  onEdit,
  onText,
  onCreate,
}: {
  page: PageDoc | null;
  pageNumber: number | null;
  interactive: boolean;
  selectedId: string | null;
  editingId: string | null;
  active: boolean;
  welcome: boolean;
  onSelect: (id: string | null) => void;
  onActivate: (pageId: string) => void;
  onBegin: () => void;
  onLive: (pageId: string, element: BitElement) => void;
  onEnd: () => void;
  onEdit: (id: string) => void;
  onText: (pageId: string, element: BitElement, text: string) => void;
  onCreate: (template: TemplateId) => void;
}) {
  if (!page) {
    return (
      <div className="bita-paper is-cream is-blank" data-paper="true">
        {welcome ? <Welcome onCreate={onCreate} /> : null}
      </div>
    );
  }
  return (
    <div className="bita-sheet">
      {pageNumber ? <span className="bita-folio">{pageNumber}</span> : null}
      <PageCanvas
        page={page}
        selectedId={selectedId}
        editingId={editingId}
        interactive={interactive}
        active={active}
        onSelect={onSelect}
        onActivate={() => onActivate(page.id)}
        onBegin={onBegin}
        onLive={(element) => onLive(page.id, element)}
        onEnd={onEnd}
        onEdit={onEdit}
        onText={(element, text) => onText(page.id, element, text)}
      />
    </div>
  );
}

function Welcome({ onCreate }: { onCreate: (template: TemplateId) => void }) {
  return (
    <div className="bita-welcome">
      <p>Toda historia merece ser recordada.</p>
      <button type="button" className="bita-welcome__go" onClick={() => onCreate("blank")}>
        Crear mi primera página
      </button>
    </div>
  );
}
