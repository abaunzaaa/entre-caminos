import { useState } from "react";
import { Link } from "react-router-dom";
import { bogotaClock, bogotaDay, bogotaTimeValue, bogotaToday, ticketDate, toPlannedAt } from "../../utils/journey-dates";
import { mediaUrl } from "../../utils/media";
import type { JourneyPlan } from "../../services/journey.service";

export function upcomingPlans(plans: JourneyPlan[], now = new Date()) {
  const today = bogotaToday(now);
  return plans
    .filter((plan) => bogotaDay(plan.plannedAt) >= today)
    .sort((left, right) => new Date(left.plannedAt).getTime() - new Date(right.plannedAt).getTime());
}

export function JourneyUpcoming({
  plans,
  compact = false,
  onUpdatePlan,
  onDeletePlan,
  onOpenAll,
}: {
  plans: JourneyPlan[];
  compact?: boolean;
  onUpdatePlan: (planId: string, plannedAt: string) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onOpenAll?: () => void;
}) {
  const items = compact ? upcomingPlans(plans).slice(0, 3) : upcomingPlans(plans);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("09:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <section className={`caminos-section caminos-upcoming${compact ? " is-compact" : ""}`} aria-labelledby="caminos-upcoming-title">
      <div className="caminos-section__head">
        <div>
          <p className="caminos-kicker">{compact ? "Lo que viene" : "Lo mejor está por venir"}</p>
          <h2 id="caminos-upcoming-title">{compact ? "Próximas" : "Próximas aventuras"}</h2>
          {compact ? null : <p className="caminos-section__lead">Los planes que esperan convertirse en historias.</p>}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="caminos-empty">
          <p>Todavía no hay planes por delante.</p>
          <Link to="/explorar">Descubrir experiencias</Link>
        </div>
      ) : (
        items.map((plan) => {
          const date = ticketDate(plan.plannedAt);
          const open = openId === plan.id;
          const blurb = (plan.experience.description ?? "").replace(/\s+/g, " ").trim();
          return (
            <article key={plan.id}>
              <div role="button" tabIndex={0} className="caminos-ticket" aria-expanded={open} onClick={() => setOpenId(open ? null : plan.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpenId(open ? null : plan.id); } }}>
                <span className="caminos-ticket__photo">
                  <img src={mediaUrl(plan.experience.imageUrl, 640)} alt="" loading="lazy" />
                </span>
                <span className="caminos-ticket__body">
                  <p>{plan.experience.category || "Experiencia"}</p>
                  <h3>{plan.experience.title}</h3>
                  {blurb ? <span>{blurb.slice(0, 140)}{blurb.length > 140 ? "…" : ""}</span> : null}
                  <span>{bogotaClock(plan.plannedAt)} · {plan.experience.location}</span>
                </span>
                <time dateTime={plan.plannedAt}>
                  <span>{date.month}</span>
                  <strong>{date.day}</strong>
                  <small>{date.year}</small>
                </time>
              </div>
              {open ? (
                <div className="caminos-ticket__actions">
                  {plan.experience.status === "PUBLISHED" ? <Link to={`/explorar/${plan.experience.id}`}>Ver experiencia</Link> : null}
                  <button type="button" onClick={() => { setEditing(plan.id); setDay(bogotaDay(plan.plannedAt)); setTime(bogotaTimeValue(plan.plannedAt)); setError(""); }}>Reprogramar</button>
                  <button type="button" onClick={() => setRemoving(plan.id)}>Quitar de la agenda</button>
                </div>
              ) : null}
              {editing === plan.id ? (
                <form onSubmit={(event) => { event.preventDefault(); setBusy(true); setError(""); void onUpdatePlan(plan.id, toPlannedAt(day, time)).then(() => setEditing(null)).catch(() => setError("No pudimos reprogramar el plan.")).finally(() => setBusy(false)); }}>
                  <label>Fecha<input type="date" value={day} onChange={(event) => setDay(event.target.value)} required /></label>
                  <label>Hora<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
                  {error ? <p className="caminos-error">{error}</p> : null}
                  <div className="caminos-inline">
                    <button type="button" onClick={() => setEditing(null)} disabled={busy}>Cancelar</button>
                    <button type="submit" className="caminos-btn" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
                  </div>
                </form>
              ) : null}
              {removing === plan.id ? (
                <div className="caminos-confirm">
                  <p>Este plan saldrá de tu agenda. No cancela una reserva.</p>
                  <div className="caminos-inline">
                    <button type="button" onClick={() => setRemoving(null)}>Cancelar</button>
                    <button type="button" onClick={() => { void onDeletePlan(plan.id).then(() => setRemoving(null)); }}>Quitar</button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })
      )}
      {compact && onOpenAll ? (
        <button type="button" className="caminos-quiet" onClick={onOpenAll}>Ver todas</button>
      ) : null}
    </section>
  );
}
