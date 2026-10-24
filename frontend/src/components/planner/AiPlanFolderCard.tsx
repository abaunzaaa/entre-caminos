import { ChevronRight } from "lucide-react";
import flores from "../../assets/mis-caminos/carpeta-naturaleza.png";
import paleta from "../../assets/mis-caminos/carpeta-cultura.png";
import camara from "../../assets/mis-caminos/carpeta-sabores.png";
import lupa from "../../assets/mis-caminos/carpeta-descubrimientos.png";
import { type AiPlanFolderKey } from "../../data/ai-plan-folders";
import { mediaUrl } from "../../utils/media";
import "../../styles/ai-plan-folders.css";

const ART: Record<AiPlanFolderKey, string> = {
  naturaleza: flores,
  cultura: paleta,
  sabores: camara,
  descubrimientos: lupa,
};

export function planCountLabel(count: number) {
  return `${count} ${count === 1 ? "itinerario" : "itinerarios"}`;
}

export function distinctPlanPhotoUrls(items: { imageUrl?: string | null }[], limit = 3) {
  const seen = new Set<string>();
  const photos: string[] = [];
  for (const item of items) {
    const raw = item.imageUrl?.trim();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    photos.push(mediaUrl(raw, 320));
    if (photos.length >= limit) break;
  }
  return photos;
}

type AiPlanFolderCardProps = {
  folderKey: AiPlanFolderKey;
  name: string;
  tone: string;
  count: number | null;
  photos?: string[];
  selected?: boolean;
  selectable?: boolean;
  onClick: () => void;
};

export function AiPlanFolderCard({
  folderKey,
  name,
  tone,
  count,
  photos = [],
  selected = false,
  selectable = false,
  onClick,
}: AiPlanFolderCardProps) {
  const label = count === null ? name : `${name}, ${planCountLabel(count)}`;
  const covers = count !== null && count > 0 ? photos.slice(0, 3) : [];
  return (
    <button
      type="button"
      className={`ai-folder favorites-cat--${tone} ai-folder--shots-${covers.length}${selected ? " is-on" : ""}`}
      onClick={onClick}
      aria-pressed={selectable ? selected : undefined}
      aria-label={label}
    >
      {covers.length ? (
        <span className="ai-folder__photos" aria-hidden="true">
          {covers.map((src) => (
            <img key={src} className="ai-folder__photo" src={src} alt="" draggable={false} decoding="async" />
          ))}
        </span>
      ) : null}
      <span className="ai-folder__tab" aria-hidden="true" />
      <span className="ai-folder__body">
        <img className={`ai-folder__art ai-folder__art--${folderKey}`} src={ART[folderKey]} alt="" draggable={false} decoding="async" />
        <span className="ai-folder__copy">
          <span className="ai-folder__name">{name}</span>
          {count === null ? null : <span className="ai-folder__count">{planCountLabel(count)}</span>}
        </span>
        <ChevronRight className="ai-folder__arrow" size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>
    </button>
  );
}
