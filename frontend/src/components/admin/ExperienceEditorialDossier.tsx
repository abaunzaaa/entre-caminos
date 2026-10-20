import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import avionIcon from "../../assets/avion-icon.png";
import frameVerde from "../../assets/frame-verde.png";
import { ExperienceDescriptionModal } from "../experiences/ExperienceDescriptionModal";
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

const DESCRIPTION_VISIBLE_LINES = 5;

function DescriptionReveal({ text }: { text: string }) {
  const bodyId = useId();
  const probeRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
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

  return (
    <div className="dash-exps-dossier__description" style={{ "--description-lines": DESCRIPTION_VISIBLE_LINES } as CSSProperties}>
      <div id={bodyId} className="dash-exps-dossier__value dash-exps-dossier__description-body is-clamped">
        {text}
      </div>
      <div className="dash-exps-dossier__description-measure-host" aria-hidden="true">
        <div ref={probeRef} className="dash-exps-dossier__value dash-exps-dossier__description-measure">
          {text}
        </div>
      </div>
      {overflows ? (
        <button type="button" className="experience-description-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Ver descripción completa <span aria-hidden="true">→</span>
        </button>
      ) : null}
      {open ? <ExperienceDescriptionModal text={text} onClose={() => setOpen(false)} /> : null}
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

const LEFT_LABELS = new Set(["Descripción", "Precio"]);
const HIDDEN_IN_INFO = new Set(["Cómo llegar", "Contacto"]);
const RIGHT_ORDER = ["Ubicación", "Duración", "Disponibilidad", "Días disponibles", "Fechas", "Horario", "Horarios", "Enlace"];

function useFinePointer() {
  const [fine, setFine] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)").matches : false,
  );

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return fine;
}

function partitionBalancedFacts(facts: ExperienceEditorialFact[]) {
  const story: ExperienceEditorialFact[] = [];
  const right: ExperienceEditorialFact[] = [];
  let category: ExperienceEditorialFact | null = null;
  let environment: ExperienceEditorialFact | null = null;
  const ideal: ExperienceEditorialFact[] = [];

  function placeTrait(fact: ExperienceEditorialFact) {
    if (fact.label === "Categoría" || fact.label === "Categorías") {
      category = fact;
      return;
    }
    if (fact.label === "Ambiente") {
      environment = fact;
      return;
    }
    if (fact.label === "Ideal para") {
      ideal.push(fact);
      return;
    }
    right.push(fact);
  }

  for (const fact of facts) {
    if (HIDDEN_IN_INFO.has(fact.label)) {
      continue;
    }
    if (LEFT_LABELS.has(fact.label)) {
      story.push(fact);
      continue;
    }
    if (fact.columns?.length) {
      for (const column of fact.columns) {
        placeTrait({ label: column.label, value: column.value, chips: column.chips });
      }
      continue;
    }
    if (fact.label === "Enlace" || RIGHT_ORDER.includes(fact.label)) {
      right.push(fact);
      continue;
    }
    placeTrait(fact);
  }

  right.sort((leftFact, rightFact) => {
    const leftIndex = RIGHT_ORDER.indexOf(leftFact.label);
    const rightIndex = RIGHT_ORDER.indexOf(rightFact.label);
    return (leftIndex < 0 ? RIGHT_ORDER.length : leftIndex) - (rightIndex < 0 ? RIGHT_ORDER.length : rightIndex);
  });

  return { story, category, environment, ideal, right };
}

function TraitBlock({ fact }: { fact: ExperienceEditorialFact }) {
  return (
    <div className="dash-exps-dossier__trait">
      <span className="dash-exps-dossier__label">{fact.label}</span>
      {fact.chips?.length ? <FactChips chips={fact.chips} /> : <FactValue fact={fact} className="dash-exps-dossier__value" />}
    </div>
  );
}

function StampFace({
  photoUrl,
  photoLabel,
  children,
}: {
  photoUrl: string | null;
  photoLabel: string;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="dash-exps-dossier__stamp">
        <div className={`dash-exps-dossier__photo${children ? " dash-exps-dossier__photo--back" : ""}`}>
          {children ? (
            children
          ) : photoUrl ? (
            <img src={photoUrl} alt={photoLabel} />
          ) : (
            <span className="dash-exps-dossier__photo-empty">Sin imagen</span>
          )}
        </div>
        <img className="dash-exps-dossier__frame" src={frameVerde} alt="" />
      </div>
      <img className="dash-exps-dossier__plane" src={avionIcon} alt="" />
    </>
  );
}

function OrganizationStamp({
  photoUrl,
  photoLabel,
  organization,
}: {
  photoUrl: string | null;
  photoLabel: string;
  organization: PublicOrganizationProfile | null;
}) {
  const finePointer = useFinePointer();
  const [open, setOpen] = useState(false);
  const canFlip = Boolean(organization?.tradeName?.trim());

  if (!canFlip || !organization) {
    return (
      <div className="dash-exps-dossier__portrait">
        <StampFace photoUrl={photoUrl} photoLabel={photoLabel} />
      </div>
    );
  }

  function toggleFromPointer(event: ReactMouseEvent<HTMLDivElement>) {
    if (finePointer) {
      return;
    }
    if ((event.target as HTMLElement).closest("a, button")) {
      return;
    }
    setOpen((current) => !current);
  }

  return (
    <div
      className={`dossier-flip${open ? " is-open" : ""}`}
      onMouseEnter={() => {
        if (finePointer) {
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (!finePointer) {
          return;
        }
        const active = document.activeElement;
        const back = document.querySelector(".dossier-flip__face--back");
        if (active instanceof Node && back?.contains(active)) {
          return;
        }
        setOpen(false);
      }}
      onClick={toggleFromPointer}
      onBlur={(event) => {
        if (!finePointer) {
          return;
        }
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }
        setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        if ((event.target as HTMLElement).closest("a")) {
          return;
        }
        event.preventDefault();
        setOpen((current) => !current);
      }}
    >
      <div className="dossier-flip__inner">
        <div
          className="dossier-flip__face dossier-flip__face--front"
          tabIndex={0}
          role="button"
          aria-pressed={open}
          aria-label={open ? "Volver a la fotografía" : "Ver quién creó la experiencia"}
        >
          <StampFace photoUrl={photoUrl} photoLabel={photoLabel} />
        </div>
        <div className="dossier-flip__face dossier-flip__face--back" inert={!open}>
          <StampFace photoUrl={photoUrl} photoLabel={photoLabel}>
            <ExperienceOrganizationCard organization={organization} />
          </StampFace>
        </div>
      </div>
    </div>
  );
}

function FactRows({
  facts,
  clampDescription = false,
}: {
  facts: ExperienceEditorialFact[];
  clampDescription?: boolean;
}) {
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
  sectionId,
  balanced = false,
}: {
  photoUrl: string | null;
  photoLabel: string;
  noteFacts: ExperienceEditorialFact[];
  facts: ExperienceEditorialFact[];
  places?: ReactNode;
  placeFacts?: ExperienceEditorialFact[];
  organization?: PublicOrganizationProfile | null;
  clampDescription?: boolean;
  sectionId?: string;
  balanced?: boolean;
}) {
  const hasOrganization = Boolean(organization?.tradeName?.trim());
  const balancedFacts = partitionBalancedFacts([...facts, ...placeFacts]);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!balanced) {
      return;
    }
    const stage = stageRef.current;
    const story = stage?.querySelector<HTMLElement>(".dash-exps-dossier__story");
    const aside = stage?.querySelector<HTMLElement>(".dash-exps-dossier__aside");
    if (!story || !aside) {
      return;
    }
    const query = window.matchMedia("(min-width: 1101px)");
    const sync = () => {
      aside.style.minHeight = query.matches ? `${story.offsetHeight}px` : "";
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(story);
    query.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", sync);
      aside.style.minHeight = "";
    };
  }, [balanced, facts, placeFacts, places]);

  if (balanced) {
    const pair = [balancedFacts.category, balancedFacts.environment].filter(
      (fact): fact is ExperienceEditorialFact => Boolean(fact),
    );

    return (
      <section
        id={sectionId}
        className={`dash-exps-dossier dash-exps-dossier--balanced${sectionId ? " experience-detail-target" : ""}`}
        aria-label="Información de la experiencia"
      >
        <p className="experience-detail-kicker">Información de la experiencia</p>
        <div className="dash-exps-dossier__stage" ref={stageRef}>
          <div className="dash-exps-dossier__story">
            <div className="dash-exps-dossier__facts">
              <FactRows facts={balancedFacts.story} clampDescription={clampDescription} />
            </div>
            {pair.length || balancedFacts.ideal.length ? (
              <div className="dash-exps-dossier__traits">
                {pair.length ? (
                  <div className="dash-exps-dossier__pair">
                    {pair.map((fact) => (
                      <TraitBlock key={fact.label} fact={fact} />
                    ))}
                  </div>
                ) : null}
                {balancedFacts.ideal.map((fact) => (
                  <TraitBlock key={fact.label} fact={fact} />
                ))}
              </div>
            ) : null}
          </div>
          <OrganizationStamp photoUrl={photoUrl} photoLabel={photoLabel} organization={organization ?? null} />
          <div className="dash-exps-dossier__aside">
            {places ? <div className="dash-exps-dossier__places">{places}</div> : null}
            {balancedFacts.right.length ? (
              <div className="dash-exps-dossier__facts">
                <FactRows facts={balancedFacts.right} />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={sectionId}
      className={`dash-exps-dossier${sectionId ? " experience-detail-target" : ""}`}
      aria-label="Información de la experiencia"
    >
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
