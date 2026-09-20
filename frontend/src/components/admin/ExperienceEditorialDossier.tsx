import avionIcon from "../../assets/avion-icon.png";
import frameVerde from "../../assets/frame-verde.png";
import { mediaUrl } from "../../utils/media";

export type ExperienceEditorialFact = {
  label: string;
  value: string;
  avatarUrl?: string | null;
};

function FactValue({
  fact,
  className,
}: {
  fact: ExperienceEditorialFact;
  className: string;
}) {
  const avatar = fact.avatarUrl?.trim() ? mediaUrl(fact.avatarUrl, 96) : null;
  if (!avatar) {
    return <span className={className}>{fact.value}</span>;
  }

  return (
    <span className={`${className} dash-exps-dossier__value--publisher`}>
      <span className="dash-exps-dossier__publisher-avatar" aria-hidden="true">
        <img src={avatar} alt="" />
      </span>
      <span>{fact.value}</span>
    </span>
  );
}

export function ExperienceEditorialDossier({
  photoUrl,
  photoLabel,
  noteFacts,
  facts,
}: {
  photoUrl: string | null;
  photoLabel: string;
  noteFacts: ExperienceEditorialFact[];
  facts: ExperienceEditorialFact[];
}) {
  return (
    <section className="dash-exps-dossier" aria-label="Información de la experiencia">
      <div className="dash-exps-dossier__visual">
        <div className="dash-exps-dossier__stamp">
          <div className="dash-exps-dossier__photo">
            {photoUrl ? (
              <img src={photoUrl} alt={photoLabel} />
            ) : (
              <span className="dash-exps-dossier__photo-empty">Sin imagen</span>
            )}
          </div>
          <img className="dash-exps-dossier__frame" src={frameVerde} alt="" />
        </div>
        <img className="dash-exps-dossier__plane" src={avionIcon} alt="" />
        {noteFacts.length ? (
          <aside className="dash-exps-dossier__note">
            {noteFacts.map((fact) => (
              <div className="dash-exps-dossier__note-item" key={fact.label}>
                <span className="dash-exps-dossier__note-label">{fact.label}</span>
                <FactValue fact={fact} className="dash-exps-dossier__note-value" />
              </div>
            ))}
          </aside>
        ) : null}
      </div>

      <div className="dash-exps-dossier__info">
        <h2 className="dash-exps-dossier__kicker">Información de la experiencia</h2>
        <div className="dash-exps-dossier__facts">
          {facts.map((fact) => (
            <div className="dash-exps-dossier__row" key={fact.label}>
              <div className="dash-exps-dossier__copy">
                <span className="dash-exps-dossier__label">{fact.label}</span>
                <FactValue fact={fact} className="dash-exps-dossier__value" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
