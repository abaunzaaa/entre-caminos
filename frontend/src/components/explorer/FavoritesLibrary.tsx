import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Heart, MapPin } from "lucide-react";
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

function scrollCarousel(node: HTMLElement | null, direction: -1 | 1) {
  if (!node) {
    return;
  }
  const amount = Math.max(220, Math.round(node.clientWidth * 0.72));
  node.scrollBy({ left: direction * amount, behavior: "smooth" });
}

function FavoriteStripHeart({ experienceId, href }: { experienceId: string; href: string }) {
  const { favorited, busy, toggle } = useFavoriteToggle(experienceId, {
    initialFavorited: true,
    loginRedirectTo: href,
  });

  return (
    <button
      type="button"
      className={`favorites-strip__fav${favorited ? " is-on" : ""}`}
      aria-label="Quitar de favoritos"
      aria-pressed={favorited}
      disabled={busy || !favorited}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (favorited && !busy) {
          toggle();
        }
      }}
    >
      <Heart size={14} strokeWidth={1.9} fill="currentColor" aria-hidden="true" />
      <span className="favorites-strip__fav-tip" role="tooltip">
        Quitar de favoritos
      </span>
    </button>
  );
}

function CategoryCarousel({
  groups,
  selectedKey,
  onSelect,
}: {
  groups: FavoriteCategoryGroup[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const showControls = groups.length > 2;

  return (
    <div
      className={`favorites-cats${groups.length <= 2 ? ` favorites-cats--few favorites-cats--count-${groups.length}` : ""}`}
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
        {groups.map((group, index) => {
          const active = group.key === selectedKey;
          const stack = group.imageSrcs.slice(0, 3);
          const stackCount = stack.length;
          return (
            <button
              key={group.key}
              type="button"
              role="listitem"
              className={`favorites-cat favorites-cat--${favoriteCategoryTone(index)} favorites-cat--stack-${stackCount}${active ? " is-active" : ""}`}
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

function ExperienceStrip({ experiences }: { experiences: Experience[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const showControls = experiences.length > 2;

  return (
    <div className="favorites-strip">
      <p className="favorites-strip__label">Experiencias guardadas</p>

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
                    src={experienceCoverUrl(experience, 480)}
                    alt=""
                    draggable={false}
                    decoding="async"
                  />
                </Link>
                <div className="favorites-strip__body">
                  <div className="favorites-strip__top">
                    <h3 className="favorites-strip__title">
                      <Link to={href}>{experience.title}</Link>
                    </h3>
                    <FavoriteStripHeart experienceId={experience.id} href={href} />
                  </div>
                  <p className="favorites-strip__place">
                    <MapPin size={12} strokeWidth={1.8} aria-hidden="true" />
                    <span>{place}</span>
                  </p>
                  {price ? <p className="favorites-strip__price">{price}</p> : null}
                  <Link to={href} className="favorites-strip__cta">
                    Ver detalle
                  </Link>
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
    </div>
  );
}

export function FavoritesLibrary({ experiences }: FavoritesLibraryProps) {
  const groups = useMemo(() => groupFavoritesByCategory(experiences), [experiences]);
  const [selectedKey, setSelectedKey] = useState(groups[0]?.key ?? "");

  useEffect(() => {
    if (!groups.length) {
      setSelectedKey("");
      return;
    }
    if (!groups.some((group) => group.key === selectedKey)) {
      setSelectedKey(groups[0].key);
    }
  }, [groups, selectedKey]);

  const selectedGroup = groups.find((group) => group.key === selectedKey) ?? groups[0] ?? null;

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
          <p className="favorites-library__lead">Tus experiencias guardadas para volver a ellas</p>
        </header>

        <CategoryCarousel groups={groups} selectedKey={selectedGroup?.key ?? ""} onSelect={setSelectedKey} />
      </div>

      {selectedGroup ? <ExperienceStrip experiences={selectedGroup.experiences} /> : null}
    </div>
  );
}
