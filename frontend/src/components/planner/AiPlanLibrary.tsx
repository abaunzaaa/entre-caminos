import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { AiPlanFolderCard, distinctPlanPhotoUrls } from "./AiPlanFolderCard";
import { AI_PLAN_FOLDERS, type AiPlanFolderKey } from "../../data/ai-plan-folders";
import type { PlannerListItem } from "../../services/planner.service";
import { mediaUrl } from "../../utils/media";

const DURATION: Record<string, string> = {
  "1-2": "1–2 horas",
  "3-5": "3–5 horas",
  "5-8": "5–8 horas",
  "8+": "Más de 8 horas",
};

function planDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function AiPlanLibrary({ items }: { items: PlannerListItem[] }) {
  const navigate = useNavigate();
  const [openKey, setOpenKey] = useState<AiPlanFolderKey | null>(null);
  const grouped = useMemo(() => {
    const buckets = new Map<AiPlanFolderKey, PlannerListItem[]>();
    for (const folder of AI_PLAN_FOLDERS) buckets.set(folder.key, []);
    for (const item of items) {
      const key = AI_PLAN_FOLDERS.some((folder) => folder.key === item.folderKey) ? item.folderKey! : "descubrimientos";
      buckets.get(key)?.push(item);
    }
    return buckets;
  }, [items]);
  const openFolder = AI_PLAN_FOLDERS.find((folder) => folder.key === openKey) ?? null;
  const openItems = openKey ? grouped.get(openKey) ?? [] : [];

  useEffect(() => {
    if (!openKey) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenKey(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openKey]);

  return (
    <section className="ai-plans" aria-labelledby="ai-plans-title">
      <div className="ai-plans__frame">
        <header className="ai-plans__intro">
          <h2 id="ai-plans-title" className="favorites-library__title">Mis planes con IA</h2>
          <p className="ai-plans__lead">Tus caminos soñados, organizados a tu manera.</p>
        </header>
        <div className="ai-plans__grid">
          {AI_PLAN_FOLDERS.map((folder) => {
            const plans = grouped.get(folder.key) ?? [];
            return (
              <AiPlanFolderCard
                key={folder.key}
                folderKey={folder.key}
                name={folder.name}
                tone={folder.tone}
                count={plans.length}
                photos={distinctPlanPhotoUrls(plans)}
                onClick={() => setOpenKey(folder.key)}
              />
            );
          })}
        </div>
      </div>
      {openFolder ? (
        <div className="favorite-save-modal" role="dialog" aria-modal="true" aria-labelledby="ai-folder-title">
          <button type="button" className="favorite-save-modal__backdrop" aria-label="Cerrar" onClick={() => setOpenKey(null)} />
          <div className="favorite-save-modal__panel ai-plans-modal">
            <button type="button" className="favorite-save-modal__close" aria-label="Cerrar" onClick={() => setOpenKey(null)}>
              <X size={16} />
            </button>
            <header className="favorite-save-modal__head">
              <h2 id="ai-folder-title" className="favorite-save-modal__title">{openFolder.name}</h2>
            </header>
            {openItems.length ? (
              <ul className="ai-plans-modal__list">
                {openItems.map((item) => (
                  <li key={item.id}>
                    {item.imageUrl ? <img src={mediaUrl(item.imageUrl, 240)} alt="" /> : <span className="ai-plans-modal__mark" aria-hidden="true" />}
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {planDate(item.date)}
                        {item.municipality ? ` · ${item.municipality}` : ""}
                        {item.durationKey && DURATION[item.durationKey] ? ` · ${DURATION[item.durationKey]}` : ""}
                      </p>
                      <em>Plan con IA</em>
                    </div>
                    <div className="ai-plans-modal__actions">
                      <button type="button" onClick={() => navigate(`/planear-mi-plan/guardado/${item.id}`)}>Ver itinerario</button>
                      <button
                        type="button"
                        disabled={!item.primaryExperienceId}
                        onClick={() => item.primaryExperienceId && navigate(`/explorar/${item.primaryExperienceId}`)}
                      >
                        Ver experiencia
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ai-plans-modal__empty">
                <p>Todavía no tienes caminos guardados aquí.</p>
                <button type="button" className="favorite-save-modal__primary" onClick={() => navigate("/planear-mi-plan")}>Crear un plan</button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
