import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Heart, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import favVacia from "../../assets/fav-vacia.png";
import heartIcon from "../../assets/heart-icon.png";
import { useFavoriteToggle } from "../../hooks/useFavoriteToggle";
import type { Experience } from "../../types";
import { formatPrice } from "../../utils/cn";
import { experienceCoverUrl, municipalityLabel } from "./explorer-media";
import {
  favoriteCategoryTone,
  groupFavoritesByCategory,
  type FavoriteCategoryGroup,
} from "./favorites-library";

type FavoritesLibraryProps = {
  experiences: Experience[];
};

const ALL_CATEGORY_KEY = "ver-todo";

function scrollCarousel(node: HTMLElement | null, direction: -1 | 1) {
  if (!node) {
    return;
  }
  const amount = Math.max(220, Math.round(node.clientWidth * 0.72));
  node.scrollBy({ left: direction * amount, behavior: "smooth" });
}

function FavoriteStripRemove({ experienceId, href }: { experienceId: string; href: string }) {
  const { favorited, busy, toggle } = useFavoriteToggle(experienceId, {
    initialFavorited: true,
    loginRedirectTo: href,
  });

  return (
    <button
      type="button"
      className="favorites-strip__remove"
      aria-label="Quitar de favoritos"
      disabled={busy || !favorited}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (favorited && !busy) {
          toggle();
        }
      }}
    >
      <Heart size={12} strokeWidth={1.85} fill="none" aria-hidden="true" />
      <span>Quitar de favoritos</span>
    </button>
  );
}

function CategoryCarousel({
  groups,
  selectedKey,
  onSelect,
  totalCount,
  recentImageSrcs,
}: {
  groups: FavoriteCategoryGroup[];
  selectedKey: string;
  onSelect: (key: string) => void;
  totalCount: number;
  recentImageSrcs: string[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemCount = groups.length + 1;
  const showControls = itemCount > 2;
  const allActive = selectedKey === ALL_CATEGORY_KEY;
  const recentStack = recentImageSrcs.slice(0, 3);
  const recentCount = recentStack.length;

  return (
    <div
      className={`favorites-cats${itemCount <= 2 ? ` favorites-cats--few favorites-cats--count-${itemCount}` : ""}`}
    >
      {showControls ? (
        <button
          type="button"
          className="favorites-cats__nav favorites-cats__nav--prev"
          aria-label="Categorías anteriores"
          onClick={() => scrollCarousel(trackRef.current, -1)}
        >
          <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}

      <div className="favorites-cats__track" ref={trackRef} role="list">
        <button
          type="button"
          role="listitem"
          className={`favorites-cat favorites-cat--cream favorites-cat--all favorites-cat--stack-${Math.max(recentCount, 1)}${allActive ? " is-active" : ""}`}
          aria-pressed={allActive}
          aria-label={`Ver todo, ${totalCount} ${totalCount === 1 ? "experiencia" : "experiencias"}`}
          onClick={() => onSelect(ALL_CATEGORY_KEY)}
        >
          <span className="favorites-cat__stack" aria-hidden="true">
            {recentCount >= 3 ? (
              <span className="favorites-cat__shot favorites-cat__shot--back-2">
                <img src={recentStack[2]} alt="" draggable={false} decoding="async" />
              </span>
            ) : null}
            {recentCount >= 2 ? (
              <span className="favorites-cat__shot favorites-cat__shot--back-1">
                <img src={recentStack[1]} alt="" draggable={false} decoding="async" />
              </span>
            ) : null}
            {recentCount >= 1 ? (
              <span className="favorites-cat__shot favorites-cat__shot--main">
                <img src={recentStack[0]} alt="" draggable={false} decoding="async" />
              </span>
            ) : (
              <span className="favorites-cat__shot favorites-cat__shot--main favorites-cat__shot--glyph">
                <Heart size={22} strokeWidth={1.7} fill="none" />
              </span>
            )}
          </span>
          <span className="favorites-cat__folder">
            <span className="favorites-cat__tab" />
            <span className="favorites-cat__panel">
              <span className="favorites-cat__name">Ver todo</span>
              <span className="favorites-cat__count">
                {totalCount} {totalCount === 1 ? "experiencia" : "experiencias"}
              </span>
            </span>
          </span>
        </button>

        {groups.map((group, index) => {
          const active = group.key === selectedKey;
          const stack = group.imageSrcs.slice(0, 3);
          const stackCount = stack.length;
          return (
            <button
              key={group.key}
              type="button"
              role="listitem"
              className={`favorites-cat favorites-cat--${favoriteCategoryTone(index + 1)} favorites-cat--stack-${stackCount}${active ? " is-active" : ""}`}
              aria-pressed={active}
              aria-label={`${group.name}, ${group.count} ${group.count === 1 ? "experiencia" : "experiencias"}`}
              onClick={() => onSelect(group.key)}
            >
              <span className="favorites-cat__stack" aria-hidden="true">
                {stackCount >= 3 ? (
                  <span className="favorites-cat__shot favorites-cat__shot--back-2">
                    <img src={stack[2]} alt="" draggable={false} decoding="async" />
                  </span>
                ) : null}
                {stackCount >= 2 ? (
                  <span className="favorites-cat__shot favorites-cat__shot--back-1">
                    <img src={stack[1]} alt="" draggable={false} decoding="async" />
                  </span>
                ) : null}
                <span className="favorites-cat__shot favorites-cat__shot--main">
                  <img src={stack[0]} alt="" draggable={false} decoding="async" />
                </span>
              </span>

              <span className="favorites-cat__folder">
                <span className="favorites-cat__tab" />
                <span className="favorites-cat__panel">
                  <span className="favorites-cat__name">{group.name}</span>
                  <span className="favorites-cat__count">
                    {group.count} {group.count === 1 ? "experiencia" : "experiencias"}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {showControls ? (
        <button
          type="button"
          className="favorites-cats__nav favorites-cats__nav--next"
          aria-label="Categorías siguientes"
          onClick={() => scrollCarousel(trackRef.current, 1)}
        >
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function ExperienceStrip({
  label,
  experiences,
  emptyMessage,
  divided = false,
}: {
  label: string;
  experiences: Experience[];
  emptyMessage?: string;
  divided?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const showControls = experiences.length > 2;

  return (
    <section className={`favorites-strip${divided ? " favorites-strip--divided" : ""}`}>
      <p className="favorites-strip__label">{label}</p>

      {!experiences.length ? (
        <p className="favorites-strip__empty" role="status">
          {emptyMessage || "No se encontraron experiencias con ese nombre"}
        </p>
      ) : (
        <div className="favorites-strip__frame">
          {showControls ? (
            <button
              type="button"
              className="favorites-strip__nav favorites-strip__nav--prev"
              aria-label="Experiencias anteriores"
              onClick={() => scrollCarousel(trackRef.current, -1)}
            >
              <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : null}

          <div className="favorites-strip__track" ref={trackRef} role="list">
            {experiences.map((experience) => {
              const href = `/explorar/${experience.id}`;
              const place = municipalityLabel(experience.location) || "Colombia";
              const price =
                experience.price !== undefined && experience.price !== null && experience.price !== ""
                  ? formatPrice(experience.price, experience.currency)
                  : "";

              return (
                <article key={experience.id} className="favorites-strip__card" role="listitem">
                  <Link to={href} className="favorites-strip__media" aria-label={`Ver ${experience.title}`}>
                    <img
                      src={experienceCoverUrl(experience, 640)}
                      alt=""
                      draggable={false}
                      decoding="async"
                    />
                  </Link>
                  <div className="favorites-strip__body">
                    <h3 className="favorites-strip__title">
                      <Link to={href}>{experience.title}</Link>
                    </h3>
                    <p className="favorites-strip__place">
                      <MapPin size={12} strokeWidth={1.8} aria-hidden="true" />
                      <span>{place}</span>
                    </p>
                    {price ? <p className="favorites-strip__price">{price}</p> : null}
                    <Link to={href} className="favorites-strip__cta">
                      Ver detalle
                    </Link>
                    <FavoriteStripRemove experienceId={experience.id} href={href} />
                  </div>
                </article>
              );
            })}
          </div>

          {showControls ? (
            <button
              type="button"
              className="favorites-strip__nav favorites-strip__nav--next"
              aria-label="Experiencias siguientes"
              onClick={() => scrollCarousel(trackRef.current, 1)}
            >
              <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function matchesQuery(experience: Experience, normalizedQuery: string) {
  return experience.title.toLocaleLowerCase("es").includes(normalizedQuery);
}

export function FavoritesLibrary({ experiences }: FavoritesLibraryProps) {
  const groups = useMemo(() => groupFavoritesByCategory(experiences), [experiences]);
  /** API ya ordena favoritos por fecha de añadido (desc): los 3 primeros son los más recientes. */
  const recentImageSrcs = useMemo(
    () => experiences.slice(0, 3).map((experience) => experienceCoverUrl(experience, 720)),
    [experiences],
  );
  const [selectedKey, setSelectedKey] = useState(ALL_CATEGORY_KEY);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!groups.length) {
      setSelectedKey(ALL_CATEGORY_KEY);
      return;
    }
    if (
      selectedKey !== ALL_CATEGORY_KEY &&
      selectedKey &&
      !groups.some((group) => group.key === selectedKey)
    ) {
      setSelectedKey(ALL_CATEGORY_KEY);
    }
  }, [groups, selectedKey]);

  const showingAll = selectedKey === ALL_CATEGORY_KEY || !selectedKey;
  const selectedGroup = showingAll ? null : (groups.find((group) => group.key === selectedKey) ?? null);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const isSearching = normalizedQuery.length > 0;

  const visibleGroups = useMemo(() => {
    if (isSearching) {
      const source = selectedGroup ? [selectedGroup] : groups;
      return source
        .map((group) => ({
          ...group,
          experiences: group.experiences.filter((experience) => matchesQuery(experience, normalizedQuery)),
        }))
        .filter((group) => group.experiences.length > 0);
    }
    if (selectedGroup) {
      return [selectedGroup];
    }
    return groups;
  }, [groups, isSearching, normalizedQuery, selectedGroup]);

  if (!groups.length) {
    return (
      <div className="favorites-library__empty" aria-live="polite">
        <h1 className="favorites-library__title favorites-library__title--empty" id="favorites-page-title">
          Favoritos
        </h1>
        <span
          className="favorites-library__empty-icon"
          style={{ "--fav-empty-mask": `url(${favVacia})` } as CSSProperties}
          role="img"
          aria-hidden="true"
        />
        <p className="favorites-library__empty-text">Aún no tienes experiencias favoritas</p>
        <Link to="/explorar" className="explorer-empty__cta">
          Explorar experiencias
        </Link>
      </div>
    );
  }

  return (
    <div className="favorites-library__content">
      <div className="favorites-library__top">
        <header className="favorites-library__intro">
          <span
            className="favorites-library__mark"
            style={{ "--favorites-mark-mask": `url(${heartIcon})` } as CSSProperties}
            role="img"
            aria-hidden="true"
          />
          <h1 className="favorites-library__title" id="favorites-page-title">
            Favoritos
          </h1>
          <p className="favorites-library__lead">Tus experiencias guardadas</p>
          <label className="favorites-library__search">
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar una experiencia"
              aria-label="Buscar una experiencia"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <p className="favorites-library__hint">O selecciona las categorías en las carpetas</p>
        </header>

        <CategoryCarousel
          groups={groups}
          selectedKey={showingAll ? ALL_CATEGORY_KEY : selectedKey}
          totalCount={experiences.length}
          recentImageSrcs={recentImageSrcs}
          onSelect={setSelectedKey}
        />
      </div>

      <div className="favorites-library__groups">
        {!visibleGroups.length ? (
          <section className="favorites-strip">
            <p className="favorites-strip__empty" role="status">
              {isSearching
                ? "No se encontraron experiencias con ese nombre"
                : "Aún no hay experiencias en esta categoría"}
            </p>
          </section>
        ) : (
          visibleGroups.map((group, index) => (
            <ExperienceStrip
              key={group.key}
              label={group.name}
              experiences={group.experiences}
              divided={index > 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
