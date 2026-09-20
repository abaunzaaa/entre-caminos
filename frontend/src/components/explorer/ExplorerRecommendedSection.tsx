import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin } from "lucide-react";
import { experienceCoverUrl, municipalityLabel } from "./explorer-media";
import { formatPrice } from "../../utils/cn";
import { buildRecommendationTabs } from "../../utils/explorer-recommendations";
import type { Experience } from "../../types";

type ExplorerRecommendedSectionProps = {
  experiences: Experience[];
  interests?: string[] | null;
};

function briefDescription(value: string, max = 140) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) {
    return clean;
  }
  const clipped = clean.slice(0, max).replace(/\s+\S*$/, "");
  return `${clipped}…`;
}

export function ExplorerRecommendedSection({
  experiences,
  interests = [],
}: ExplorerRecommendedSectionProps) {
  const tablistId = useId();
  const preferred = useMemo(() => (interests ?? []).filter(Boolean), [interests]);
  const personalized = preferred.length > 0;
  const tabs = useMemo(
    () => buildRecommendationTabs(experiences, preferred, 5),
    [experiences, preferred],
  );

  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    if (!tabs.length) {
      setActiveId("");
      return;
    }
    if (!tabs.some((tab) => tab.id === activeId)) {
      setActiveId(tabs[0].id);
    }
  }, [tabs, activeId]);

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0] ?? null;

  if (!active) {
    return null;
  }

  const experience = active.experience;
  const place = municipalityLabel(experience.location);
  const category = experience.category?.name?.trim() || active.label;
  const interestLine = preferred.slice(0, 4).join(" · ");

  function selectTab(id: string) {
    setActiveId(id);
  }

  return (
    <section
      className="explorer-section explorer-section--recs"
      id="recomendados"
      aria-labelledby="explorer-recs-title"
    >
      <div className="explorer-recs">
        <div className="explorer-recs__copy">
          <h2 className="explorer-recs__title" id="explorer-recs-title">
            <span>Nuestros</span>
            <span>recomendados</span>
            <span>para ti</span>
          </h2>
          <p className="explorer-recs__lead">
            Experiencias elegidas según tus gustos e intereses.
          </p>
          {personalized ? (
            <p className="explorer-recs__note">
              Pensados a partir de tus intereses: {interestLine}
              {preferred.length > 4 ? "…" : ""}
            </p>
          ) : (
            <p className="explorer-recs__note">
              Una selección reciente para empezar a descubrir caminos con sentido.
            </p>
          )}
        </div>

        <div className="explorer-recs__stage">
          <div className="explorer-recs__shell">
            <article className="explorer-recs__panel" aria-labelledby={`${tablistId}-heading`}>
              <div className="explorer-recs__photo">
                <img src={experienceCoverUrl(experience, 960)} alt="" />
              </div>
              <div className="explorer-recs__body">
                <p className="explorer-recs__category">{category}</p>
                <h3 className="explorer-recs__heading" id={`${tablistId}-heading`}>
                  {experience.title}
                </h3>
                {place ? (
                  <p className="explorer-recs__place">
                    <MapPin size={13} strokeWidth={2} aria-hidden="true" />
                    <span>{place}</span>
                  </p>
                ) : null}
                {experience.description?.trim() ? (
                  <p className="explorer-recs__excerpt">{briefDescription(experience.description)}</p>
                ) : null}
                <div className="explorer-recs__footer">
                  <span className="explorer-recs__price">{formatPrice(experience.price)}</span>
                  <Link to={`/explorar/${experience.id}`} className="explorer-recs__cta">
                    Ver experiencia
                    <ArrowUpRight size={15} strokeWidth={2.15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>

            {tabs.length > 1 ? (
              <div
                className="explorer-recs__tabs"
                role="tablist"
                aria-label="Categorías recomendadas"
                aria-orientation="vertical"
              >
                {tabs.map((tab, index) => {
                  const selected = tab.id === active.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      id={`${tablistId}-${tab.id}`}
                      className={`explorer-recs__tab${selected ? " is-active" : ""}`}
                      style={{ zIndex: selected ? tabs.length + 1 : index + 1 }}
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      onMouseEnter={() => selectTab(tab.id)}
                      onFocus={() => selectTab(tab.id)}
                      onClick={() => selectTab(tab.id)}
                    >
                      <span className="explorer-recs__tab-label">{tab.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
