import type { ReactNode } from "react";
import avionIcon from "../../assets/avion-icon.png";
import frameVerde from "../../assets/frame-verde.png";
import { mediaUrl } from "../../utils/media";

export type ExperienceEditorialFact = {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
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
  const content = fact.href ? (
    <a
      className="dash-exps-dossier__link"
      href={fact.href}
      {...(fact.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {fact.value}
    </a>
  ) : (
    fact.value
  );
  if (!avatar) {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={`${className} dash-exps-dossier__value--publisher`}>
      <span className="dash-exps-dossier__publisher-avatar" aria-hidden="true">
        <img src={avatar} alt="" />
      </span>
      <span>{content}</span>
    </span>
  );
}

function FactRows({ facts }: { facts: ExperienceEditorialFact[] }) {
  return facts.map((fact) => (
    <div className="dash-exps-dossier__row" key={fact.label}>
      <div className="dash-exps-dossier__copy">
        <span className="dash-exps-dossier__label">{fact.label}</span>
        <FactValue fact={fact} className="dash-exps-dossier__value" />
      </div>
    </div>
  ));
}

export function ExperienceEditorialDossier({
  photoUrl,
  photoLabel,
  noteFacts,
  facts,
  places,
  placeFacts = [],
}: {
  photoUrl: string | null;
  photoLabel: string;
  noteFacts: ExperienceEditorialFact[];
  facts: ExperienceEditorialFact[];
  places?: ReactNode;
  placeFacts?: ExperienceEditorialFact[];
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
          <FactRows facts={facts} />
        </div>
        {places ? <div className="dash-exps-dossier__places">{places}</div> : null}
        {placeFacts.length ? (
          <div className="dash-exps-dossier__facts dash-exps-dossier__facts--place">
            <FactRows facts={placeFacts} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
