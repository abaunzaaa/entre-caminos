import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TouristHomeHero } from "../components/explorer/TouristHomeHero";
import { experienceCoverUrl } from "../components/explorer/explorer-media";
import { getPublicCategories, getPublicExperiences } from "../services/catalog.service";
import { formatDepartmentMunicipality } from "../data/colombia-locations";
import type { Category, Experience } from "../types";
import "../styles/explorer.css";

export function ExplorePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getPublicExperiences()
      .then((items) => {
        setExperiences(items);
        setSelectedId((current) => current ?? items[0]?.id ?? null);
      })
      .catch(() => {
        setExperiences([]);
        setSelectedId(null);
      });
    getPublicCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const selected = useMemo(
    () => experiences.find((item) => item.id === selectedId) ?? experiences[0] ?? null,
    [experiences, selectedId],
  );

  const heroExperiences = useMemo(() => experiences.slice(0, 12), [experiences]);

  const visible = useMemo(() => {
    if (filter === "all") {
      return experiences;
    }
    return experiences.filter((item) => item.categoryId === filter);
  }, [experiences, filter]);

  const recommended = useMemo(() => experiences.slice(0, 6), [experiences]);

  return (
    <div className="explorer-page">
      <TouristHomeHero
        experiences={heroExperiences}
        selected={selected}
        onSelect={(experience) => setSelectedId(experience.id)}
      />

      <section className="explorer-section" id="categorias" aria-labelledby="explorer-categories-title">
        <div className="explorer-section__head">
          <div>
            <h2 className="explorer-section__title" id="explorer-categories-title">
              Categorías
            </h2>
            <p className="explorer-section__lead">Elige un camino según lo que te inspira hoy.</p>
          </div>
        </div>
        <div className="explorer-chips" role="list">
          <button
            type="button"
            className={`explorer-chip${filter === "all" ? " is-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`explorer-chip${filter === category.id ? " is-active" : ""}`}
              onClick={() => setFilter(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className="explorer-section" id="recomendadas" aria-labelledby="explorer-recommended-title">
        <div className="explorer-section__head">
          <div>
            <h2 className="explorer-section__title" id="explorer-recommended-title">
              Experiencias recomendadas
            </h2>
            <p className="explorer-section__lead">
              {filter === "all"
                ? "Una selección para empezar a descubrir el territorio."
                : "Resultados filtrados por la categoría elegida."}
            </p>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="explorer-empty">No hay experiencias publicadas todavía.</p>
        ) : (
          <div className="explorer-grid">
            {(filter === "all" ? recommended : visible).map((experience) => (
              <ExperienceDiscoverCard key={experience.id} experience={experience} />
            ))}
          </div>
        )}
      </section>

      <section className="explorer-section" id="favoritos" aria-labelledby="explorer-favorites-title">
        <div className="explorer-section__head">
          <div>
            <h2 className="explorer-section__title" id="explorer-favorites-title">
              Favoritos
            </h2>
            <p className="explorer-section__lead">Guarda lo que quieres vivir más adelante.</p>
          </div>
        </div>
        <p className="explorer-empty">Aún no tienes favoritos. Explora una experiencia y márcala cuando esté disponible.</p>
      </section>

      <section className="explorer-section" id="planes" aria-labelledby="explorer-plans-title">
        <div className="explorer-section__head">
          <div>
            <h2 className="explorer-section__title" id="explorer-plans-title">
              Plan con amigos
            </h2>
            <p className="explorer-section__lead">Próximamente podrás armar rutas compartidas desde aquí.</p>
          </div>
        </div>
        <p className="explorer-empty">Todavía no hay planes recientes. Vuelve cuando invites a alguien a descubrir juntos.</p>
      </section>

      <section className="explorer-section" id="visitados" aria-labelledby="explorer-visited-title">
        <div className="explorer-section__head">
          <div>
            <h2 className="explorer-section__title" id="explorer-visited-title">
              Visitados
            </h2>
            <p className="explorer-section__lead">Tu historial de caminos recorridos aparecerá aquí.</p>
          </div>
        </div>
        <p className="explorer-empty">Aún no registras visitas. Cada experiencia vivida irá sumándose a este espacio.</p>
      </section>

      <section className="explorer-section" id="mapa" aria-labelledby="explorer-map-title">
        <div className="explorer-section__head">
          <div>
            <h2 className="explorer-section__title" id="explorer-map-title">
              Mapa
            </h2>
            <p className="explorer-section__lead">
              Un mapa interactivo llegará pronto. Mientras tanto, revisa la ubicación de cada experiencia.
            </p>
          </div>
        </div>
        {experiences.length === 0 ? (
          <p className="explorer-empty">Cuando haya experiencias publicadas, podrás ubicarlas aquí.</p>
        ) : (
          <div className="explorer-soft-grid">
            {experiences.slice(0, 6).map((experience) => {
              const place =
                formatDepartmentMunicipality(experience.location) || experience.location || "Colombia";
              return (
                <Link key={experience.id} to={`/explorar/${experience.id}`} className="explorer-soft-card">
                  <img src={experienceCoverUrl(experience, 320)} alt="" />
                  <div>
                    <h3>{experience.title}</h3>
                    <p>{place}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="explorer-footer-space" />
    </div>
  );
}

function ExperienceDiscoverCard({ experience }: { experience: Experience }) {
  const place = formatDepartmentMunicipality(experience.location) || experience.location;
  const category = experience.category?.name ?? "Experiencia";

  return (
    <Link to={`/explorar/${experience.id}`} className="explorer-card">
      <div className="explorer-card__media">
        <img src={experienceCoverUrl(experience, 900)} alt="" />
      </div>
      <div className="explorer-card__body">
        <p className="explorer-card__meta">
          {category}
          {place ? ` · ${place}` : ""}
        </p>
        <h3 className="explorer-card__title">{experience.title}</h3>
        <p className="explorer-card__text">{experience.description}</p>
      </div>
    </Link>
  );
}
