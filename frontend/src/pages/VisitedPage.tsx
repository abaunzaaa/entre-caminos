import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { VisitedCoverFilters } from "../components/visited/VisitedCoverFilters";
import { VisitedCoverMarkers } from "../components/visited/VisitedCoverMarkers";
import { OpenBitacoraButton } from "../components/journeys/OpenBitacoraButton";
import { VisitedMemories } from "../components/visited/VisitedMemories";
import brujula from "../assets/brujula.png";
import fondoVisitados from "../assets/fondovisitados.jpg";
import sobreVisitados from "../assets/sobrevisitados.png";
import mapaIcon from "../assets/mapa-icon.png";
import { useAuth } from "../hooks/useAuth";
import { listVisitedJourney, type VisitedJourneyStop } from "../services/visits.service";
import { onVisitsChanged } from "../services/visits-sync";
import { visitedCategoryFilters } from "../utils/visited-filters";
import { isMappable, journeySummary, orderJourney } from "../utils/visited-map";
import "../styles/visited-paths.css";

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function regionCount(stops: VisitedJourneyStop[]) {
  const names = new Set<string>();
  for (const stop of stops) {
    const value = stop.department?.trim();
    if (value) {
      names.add(value.toLocaleLowerCase("es"));
    }
  }
  return names.size;
}

export function VisitedPage() {
  const { user, loading: authLoading } = useAuth();
  const [stops, setStops] = useState<VisitedJourneyStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setStops([]);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    function load(showSpinner: boolean) {
      if (showSpinner) {
        setLoading(true);
      }
      setError("");
      listVisitedJourney()
        .then((items) => {
          if (!cancelled) {
            setStops(items);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setStops([]);
            setError("No pudimos cargar tus experiencias visitadas. Intenta de nuevo.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }

    load(true);
    const unsubscribe = onVisitsChanged(() => load(false));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authLoading, reloadKey, user?.id]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    for (const stop of stops) {
      if (!isMappable(stop)) {
        console.warn("[visitados] Sin coordenadas; no entra al mapa:", stop.id, stop.title);
      }
    }
  }, [stops]);

  const ordered = useMemo(() => orderJourney(stops), [stops]);
  const categoryFilters = useMemo(() => visitedCategoryFilters(ordered), [ordered]);
  const summary = useMemo(() => journeySummary(ordered), [ordered]);
  const regions = regionCount(ordered);

  useEffect(() => {
    if (categoryId && !categoryFilters.some((item) => item.id === categoryId)) {
      setCategoryId(null);
    }
  }, [categoryFilters, categoryId]);

  return (
    <main className="visited-paths" aria-labelledby="visited-page-title">
      {authLoading || loading ? (
        <div className="visited-paths__status">
          <p>Cargando tu recorrido…</p>
        </div>
      ) : !user ? (
        <div className="visited-paths__empty">
          <img className="visited-paths__mark" src={mapaIcon} alt="" />
          <h1 className="visited-paths__empty-title" id="visited-page-title">
            Inicia sesión para ver las experiencias que has visitado
          </h1>
          <Link to="/login" className="explorer-empty__cta">
            Acceder
          </Link>
        </div>
      ) : error ? (
        <div className="visited-paths__empty">
          <h1 className="visited-paths__empty-title" id="visited-page-title">
            Mis visitados
          </h1>
          <p className="visited-paths__lead">{error}</p>
          <button type="button" className="explorer-empty__cta" onClick={() => setReloadKey((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <section className="visited-hero favorites-library">
            <div className="favorites-library__content">
              <div className="favorites-library__top">
                <div className="favorites-library__top-inner">
                  <header className="favorites-library__intro">
                    <span
                      className="favorites-library__mark"
                      style={{ "--favorites-mark-mask": `url(${sobreVisitados})` } as CSSProperties}
                      role="img"
                      aria-hidden="true"
                    />
                    <h1 className="favorites-library__title explorer-block-title" id="visited-page-title">
                      Mis visitados
                    </h1>
                    <p className="favorites-library__lead explorer-block-lead">Tus experiencias visitadas</p>
                    <div className="visited-bitacora">
                      <p className="visited-bitacora__title">Guarda tus recuerdos</p>
                      <p className="visited-bitacora__lead">Crea tu bitácora con fotos y notas.</p>
                      <OpenBitacoraButton />
                    </div>
                  </header>
                  <VisitedMemories stops={ordered} />
                </div>
              </div>
              <div className="visited-stage">
                  <div className="visited-hero__map">
                  <section className="visited-summary" aria-label="Tu recorrido">
                    <div className="visited-summary__sheet">
                      <h2>Mi recorrido</h2>
                      <ul>
                        <li>{countLabel(summary.places, "experiencia", "experiencias")}</li>
                        {summary.municipalities > 0 ? <li>{countLabel(summary.municipalities, "municipio", "municipios")}</li> : null}
                        {regions > 0 ? <li>{countLabel(regions, "región", "regiones")}</li> : null}
                      </ul>
                      {summary.latestName ? (
                        <p className="visited-summary__last">
                          <span>Último camino</span>
                          {summary.latestName}
                        </p>
                      ) : null}
                    </div>
                  </section>
                  <div className="visited-hero__frame">
                    <div className="visited-hero__canvas">
                      <svg className="visited-hero__bg" viewBox="0 0 3168 1344" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                        <defs>
                          <filter id="visited-land" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
                            <feColorMatrix
                              in="SourceGraphic"
                              type="matrix"
                              result="cut"
                              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3.3 -3.3 -3.3 0 9.86"
                            />
                            <feComposite in="SourceGraphic" in2="cut" operator="in" />
                          </filter>
                        </defs>
                        <image href={fondoVisitados} width="3168" height="1344" filter="url(#visited-land)" />
                      </svg>
                      <VisitedCoverMarkers stops={ordered} categoryId={categoryId} />
                    </div>
                  </div>
                    <img className="visited-map-compass" src={brujula} alt="" draggable={false} />
                    <VisitedCoverFilters options={categoryFilters} total={ordered.length} activeId={categoryId} onChange={setCategoryId} />
                  </div>
                </div>
              </div>
          </section>
        </>
      )}
    </main>
  );
}
