import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import avionIcon from "../../assets/avion-icon.png";
import frameVerde from "../../assets/frame-verde.png";
import { ExperienceOrganizationCard } from "../experiences/ExperienceOrganizationCard";
import { mediaUrl } from "../../utils/media";
import type { PublicOrganizationProfile } from "../../types";

export type ExperienceEditorialColumn = {
  label: string;
  value: string;
  chips?: string[];
  centered?: boolean;
};

export type ExperienceEditorialFact = {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  avatarUrl?: string | null;
  chips?: string[];
  columns?: ExperienceEditorialColumn[];
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

const DESCRIPTION_VISIBLE_LINES = 7;

function DescriptionReveal({ text }: { text: string }) {
  const bodyId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe) {
      return;
    }
    const update = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(probe).lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        setOverflows(false);
        return;
      }
      setOverflows(probe.scrollHeight > lineHeight * DESCRIPTION_VISIBLE_LINES + lineHeight * 0.35);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(probe);
    return () => observer.disconnect();
  }, [text]);

  function onToggle() {
    setExpanded((open) => {
      if (open) {
        const node = rootRef.current;
        window.requestAnimationFrame(() => {
          if (!node) {
            return;
          }
          if (node.getBoundingClientRect().top >= 80) {
            return;
          }
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        });
      }
      return !open;
    });
  }

  return (
    <div
      ref={rootRef}
      className="dash-exps-dossier__description"
      style={{ "--description-lines": DESCRIPTION_VISIBLE_LINES } as CSSProperties}
    >
      <div
        id={bodyId}
        className={`dash-exps-dossier__value dash-exps-dossier__description-body${expanded ? "" : " is-clamped"}`}
      >
        {text}
      </div>
      <div className="dash-exps-dossier__description-measure-host" aria-hidden="true">
        <div ref={probeRef} className="dash-exps-dossier__value dash-exps-dossier__description-measure">
          {text}
        </div>
      </div>
      {overflows ? (
        <button
          type="button"
          className="dash-exps-dossier__more"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={onToggle}
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      ) : null}
    </div>
  );
}

function FactChips({ chips, compact = false }: { chips: string[]; compact?: boolean }) {
  return (
    <span className={`dash-exps-dossier__chips${compact ? " dash-exps-dossier__chips--compact" : ""}`}>
      {chips.map((chip) => (
        <span key={chip} className={`dash-exps-dossier__chip${compact ? " dash-exps-dossier__chip--compact" : ""}`}>
          {chip}
        </span>
      ))}
    </span>
  );
}

function FactRows({ facts, clampDescription = false }: { facts: ExperienceEditorialFact[]; clampDescription?: boolean }) {
  return facts.map((fact) => {
    if (fact.columns?.length) {
      return (
        <div
          className="dash-exps-dossier__row dash-exps-dossier__row--meta"
          key={fact.label}
          style={{ "--meta-cols": fact.columns.length } as CSSProperties}
        >
          {fact.columns.map((column) => (
            <div
              className={`dash-exps-dossier__copy${column.centered ? " dash-exps-dossier__copy--centered" : ""}`}
              key={column.label}
            >
              <span className="dash-exps-dossier__label">{column.label}</span>
              {column.chips?.length ? (
                <FactChips chips={column.chips} compact />
              ) : (
                <span className="dash-exps-dossier__value">{column.value}</span>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="dash-exps-dossier__row" key={fact.label}>
        <div className="dash-exps-dossier__copy">
          <span className="dash-exps-dossier__label">{fact.label}</span>
          {fact.label === "Descripción" && clampDescription ? (
            <DescriptionReveal text={fact.value} />
          ) : fact.chips?.length ? (
            <FactChips chips={fact.chips} />
          ) : (
            <FactValue fact={fact} className="dash-exps-dossier__value" />
          )}
        </div>
      </div>
    );
  });
}

export function ExperienceEditorialDossier({
  photoUrl,
  photoLabel,
  noteFacts,
  facts,
  places,
  placeFacts = [],
  organization = null,
  clampDescription = false,
}: {
  photoUrl: string | null;
  photoLabel: string;
  noteFacts: ExperienceEditorialFact[];
  facts: ExperienceEditorialFact[];
  places?: ReactNode;
  placeFacts?: ExperienceEditorialFact[];
  organization?: PublicOrganizationProfile | null;
  clampDescription?: boolean;
}) {
  const hasOrganization = Boolean(organization?.tradeName?.trim());

  return (
    <section className="dash-exps-dossier" aria-label="Información de la experiencia">
      <div className="dash-exps-dossier__column">
      <div className={`dash-exps-dossier__visual${hasOrganization ? " is-clear" : ""}`}>
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
        {!hasOrganization && noteFacts.length ? (
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
      {hasOrganization && organization ? <ExperienceOrganizationCard organization={organization} /> : null}
      </div>

      <div className="dash-exps-dossier__info">
        <h2 className="dash-exps-dossier__kicker">Información de la experiencia</h2>
        <div className="dash-exps-dossier__facts">
          <FactRows facts={facts} clampDescription={clampDescription} />
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
