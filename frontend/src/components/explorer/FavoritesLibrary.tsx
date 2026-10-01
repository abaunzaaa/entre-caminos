import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, FolderPlus, Heart, MapPin, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import favVacia from "../../assets/fav-vacia.png";
import heartIcon from "../../assets/heart-icon.png";
import { useFavoriteToggle } from "../../hooks/useFavoriteToggle";
import {
  createFavoriteCollection,
  deleteFavoriteCollection,
  getFavoriteCollection,
  listCollectionsForExperience,
  listFavoriteCollections,
  removeExperienceFromCollection,
  setExperienceCollections,
  type FavoriteCollection,
} from "../../services/favorite-collections.service";
import { onFavoritesChanged, showFavoriteToast } from "../../services/favorites-sync";
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
const PAGE_SIZE = 8;

function scrollCarousel(node: HTMLElement | null, direction: -1 | 1) {
  if (!node) {
    return;
  }
  const amount = Math.max(220, Math.round(node.clientWidth * 0.72));
  node.scrollBy({ left: direction * amount, behavior: "smooth" });
}

function FavoriteStripRemove({
  experienceId,
  href,
  collectionId,
  experienceTitle,
  onCollectionUpdated,
}: {
  experienceId: string;
  href: string;
  collectionId?: string;
  experienceTitle?: string;
  onCollectionUpdated?: (collection: FavoriteCollection) => void;
}) {
  const { favorited, busy, toggle } = useFavoriteToggle(experienceId, {
    initialFavorited: true,
    loginRedirectTo: href,
    experienceTitle,
  });
  const [moving, setMoving] = useState(false);

  return (
    <div className="favorites-strip__actions">
      {collectionId ? (
        <button
          type="button"
          className="favorites-strip__remove"
          disabled={moving}
          onClick={() => {
            setMoving(true);
            removeExperienceFromCollection(collectionId, experienceId)
              .then((collection) => {
                showFavoriteToast("Quitada de la colección");
                onCollectionUpdated?.(collection);
                window.dispatchEvent(new Event("ec-favorite-collections-changed"));
              })
              .catch(() => undefined)
              .finally(() => setMoving(false));
          }}
        >
          Quitar de esta colección
        </button>
      ) : null}
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
    </div>
  );
}

function ExperienceCard({
  experience,
  collectionId,
  onMove,
  onCollectionUpdated,
}: {
  experience: Experience;
  collectionId?: string;
  onMove?: (experienceId: string) => void;
  onCollectionUpdated?: (collection: FavoriteCollection) => void;
}) {
  const href = `/explorar/${experience.id}`;
  const place = municipalityLabel(experience.location) || "Colombia";
  const price =
    experience.price !== undefined && experience.price !== null && experience.price !== ""
      ? formatPrice(experience.price, experience.currency)
      : "";

  return (
    <article className="favorites-strip__card favorites-strip__card--grid" role="listitem">
      <Link to={href} className="favorites-strip__media" aria-label={`Ver ${experience.title}`}>
        <img src={experienceCoverUrl(experience, 640)} alt="" draggable={false} decoding="async" />
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
        {onMove ? (
          <button type="button" className="favorites-strip__remove" onClick={() => onMove(experience.id)}>
            Mover a colección
          </button>
        ) : null}
        <FavoriteStripRemove
          experienceId={experience.id}
          href={href}
          collectionId={collectionId}
          experienceTitle={experience.title}
          onCollectionUpdated={onCollectionUpdated}
        />
      </div>
    </article>
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

function MoveCollectionModal({
  experienceId,
  collections,
  onClose,
}: {
  experienceId: string;
  collections: FavoriteCollection[];
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCollectionsForExperience(experienceId)
      .then((ids) => {
        if (!cancelled) {
          setSelectedIds(ids);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedIds([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [experienceId]);

  return (
    <div className="favorite-save-modal" role="dialog" aria-modal="true">
      <button type="button" className="favorite-save-modal__backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="favorite-save-modal__panel">
        <header className="favorite-save-modal__head">
          <h2 className="favorite-save-modal__title">Mover a colección</h2>
          <button type="button" className="favorite-save-modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="favorite-save-modal__list">
          {loading ? (
            <p className="favorite-save-modal__empty">Cargando…</p>
          ) : collections.length ? (
            collections.map((collection) => {
              const checked = selectedIds.includes(collection.id);
              return (
                <button
                  key={collection.id}
                  type="button"
                  className={`favorite-save-modal__item${checked ? " is-on" : ""}`}
                  onClick={() =>
                    setSelectedIds((current) =>
                      checked ? current.filter((id) => id !== collection.id) : [...current, collection.id],
                    )
                  }
                >
                  <span className="favorite-save-modal__thumb" aria-hidden="true">
                    {collection.previewExperiences[0] ? (
                      <img
                        src={experienceCoverUrl(collection.previewExperiences[0], 240)}
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      <FolderPlus size={16} strokeWidth={1.7} />
                    )}
                  </span>
                  <span className="favorite-save-modal__meta">
                    <strong>{collection.name}</strong>
                    <em>
                      {collection.count} {collection.count === 1 ? "experiencia" : "experiencias"}
                    </em>
                  </span>
                  <span className="favorite-save-modal__check">{checked ? "✓" : ""}</span>
                </button>
              );
            })
          ) : (
            <p className="favorite-save-modal__empty">Aún no tienes colecciones. Crea una primero.</p>
          )}
        </div>
        {error ? <p className="favorite-save-modal__error">{error}</p> : null}
        <div className="favorite-save-modal__actions">
          <button type="button" className="favorite-save-modal__ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="favorite-save-modal__primary"
            disabled={saving || loading}
            onClick={() => {
              setSaving(true);
              setExperienceCollections(experienceId, selectedIds)
                .then(() => {
                  showFavoriteToast("Colección actualizada");
                  window.dispatchEvent(new Event("ec-favorite-collections-changed"));
                  onClose();
                })
                .catch(() => setError("No pudimos actualizar la colección."))
                .finally(() => setSaving(false));
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function matchesQuery(experience: Experience, normalizedQuery: string) {
  return experience.title.toLocaleLowerCase("es").includes(normalizedQuery);
}

export function FavoritesLibrary({ experiences }: FavoritesLibraryProps) {
  const groups = useMemo(() => groupFavoritesByCategory(experiences), [experiences]);
  const recentImageSrcs = useMemo(
    () => experiences.slice(0, 3).map((experience) => experienceCoverUrl(experience, 720)),
    [experiences],
  );
  const [selectedKey, setSelectedKey] = useState(ALL_CATEGORY_KEY);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [collections, setCollections] = useState<FavoriteCollection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [moveExperienceId, setMoveExperienceId] = useState<string | null>(null);

  function upsertCollection(detail: FavoriteCollection) {
    setCollections((current) => {
      const exists = current.some((item) => item.id === detail.id);
      if (!exists) {
        return [detail, ...current];
      }
      return current.map((item) => (item.id === detail.id ? { ...item, ...detail } : item));
    });
  }

  function loadCollections() {
    listFavoriteCollections()
      .then((items) => {
        setCollections((current) =>
          items.map((item) => {
            const previous = current.find((entry) => entry.id === item.id);
            if (previous?.experiences && previous.id === activeCollectionId) {
              return { ...item, experiences: previous.experiences };
            }
            return item;
          }),
        );
      })
      .catch(() => setCollections([]));
  }

  useEffect(() => {
    loadCollections();
    const onChanged = () => {
      loadCollections();
      if (activeCollectionId) {
        getFavoriteCollection(activeCollectionId)
          .then(upsertCollection)
          .catch(() => undefined);
      }
    };
    window.addEventListener("ec-favorite-collections-changed", onChanged);
    const unsubscribe = onFavoritesChanged(onChanged);
    return () => {
      window.removeEventListener("ec-favorite-collections-changed", onChanged);
      unsubscribe();
    };
  }, [activeCollectionId]);

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

  useEffect(() => {
    setPage(1);
  }, [selectedKey, query, experiences.length]);

  const showingAll = selectedKey === ALL_CATEGORY_KEY || !selectedKey;
  const selectedGroup = showingAll ? null : (groups.find((group) => group.key === selectedKey) ?? null);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const isSearching = normalizedQuery.length > 0;

  const filteredExperiences = useMemo(() => {
    const source = selectedGroup ? selectedGroup.experiences : experiences;
    if (!isSearching) {
      return source;
    }
    return source.filter((experience) => matchesQuery(experience, normalizedQuery));
  }, [experiences, isSearching, normalizedQuery, selectedGroup]);

  const pageCount = Math.max(1, Math.ceil(filteredExperiences.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedExperiences = filteredExperiences.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCollection = collections.find((item) => item.id === activeCollectionId) ?? null;

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
          onSelect={(key) => {
            setSelectedKey(key);
            setActiveCollectionId(null);
          }}
        />
      </div>

      <section className="favorites-strip favorites-strip--grid">
        <p className="favorites-strip__label">
          {activeCollection ? activeCollection.name : selectedGroup ? selectedGroup.name : "Todas tus experiencias"}
        </p>

        {activeCollection ? (
          <>
            <button
              type="button"
              className="favorites-collections__back"
              onClick={() => setActiveCollectionId(null)}
            >
              ← Volver a mis colecciones
            </button>
            {!activeCollection.experiences?.length && !activeCollection.previewExperiences.length ? (
              <p className="favorites-strip__empty">Esta colección aún no tiene experiencias.</p>
            ) : (
              <div className="favorites-grid">
                {(activeCollection.experiences ?? activeCollection.previewExperiences).map((experience) => (
                  <ExperienceCard
                    key={experience.id}
                    experience={experience}
                    collectionId={activeCollection.id}
                    onMove={setMoveExperienceId}
                    onCollectionUpdated={upsertCollection}
                  />
                ))}
              </div>
            )}
          </>
        ) : !filteredExperiences.length ? (
          <p className="favorites-strip__empty" role="status">
            {isSearching
              ? "No se encontraron experiencias con ese nombre"
              : "Aún no hay experiencias en esta categoría"}
          </p>
        ) : showingAll ? (
          <>
            <div className="favorites-grid">
              {pagedExperiences.map((experience) => (
                <ExperienceCard key={experience.id} experience={experience} onMove={setMoveExperienceId} />
              ))}
            </div>
            {pageCount > 1 ? (
              <div className="explorer-discover-pager favorites-library__pager">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage <= 1}
                >
                  Anterior
                </button>
                <span className="explorer-discover-pager__page">Página {safePage}</span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={safePage >= pageCount}
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="favorites-grid">
            {filteredExperiences.map((experience) => (
              <ExperienceCard key={experience.id} experience={experience} onMove={setMoveExperienceId} />
            ))}
          </div>
        )}
      </section>

      {showingAll && !activeCollection ? (
        <section className="favorites-collections">
          <div className="favorites-collections__head">
            <p className="favorites-strip__label">Mis colecciones</p>
            {collections.length ? (
              <button
                type="button"
                className="favorites-collections__create"
                onClick={() => {
                  setCreateOpen(true);
                  setCreateError("");
                  setNewName("");
                }}
              >
                + Crear colección
              </button>
            ) : null}
          </div>

          {!collections.length ? (
            <div className="favorites-collections__empty">
              <p>Aún no tienes colecciones</p>
              <span>Crea una para organizar tus experiencias favoritas.</span>
              <button type="button" className="explorer-empty__cta" onClick={() => setCreateOpen(true)}>
                Crear colección
              </button>
            </div>
          ) : (
            <div className="favorites-collections__grid">
              {collections.map((collection) => (
                <article key={collection.id} className="favorites-collection-card">
                  <button
                    type="button"
                    className="favorites-collection-card__main"
                    onClick={() => {
                      setActiveCollectionId(collection.id);
                      getFavoriteCollection(collection.id)
                        .then((detail) => {
                          setCollections((current) =>
                            current.map((item) => (item.id === detail.id ? detail : item)),
                          );
                        })
                        .catch(() => undefined);
                    }}
                  >
                    <span className="favorites-collection-card__stack" aria-hidden="true">
                      {collection.previewExperiences.slice(0, 3).map((experience, index) => (
                        <img
                          key={experience.id}
                          src={experienceCoverUrl(experience, 320)}
                          alt=""
                          className={`favorites-collection-card__shot favorites-collection-card__shot--${index}`}
                          draggable={false}
                        />
                      ))}
                      {!collection.previewExperiences.length ? (
                        <span className="favorites-collection-card__placeholder">
                          <FolderPlus size={20} strokeWidth={1.7} />
                        </span>
                      ) : null}
                    </span>
                    <span className="favorites-collection-card__meta">
                      <strong>{collection.name}</strong>
                      <em>
                        {collection.count} {collection.count === 1 ? "experiencia" : "experiencias"}
                      </em>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="favorites-collection-card__delete"
                    aria-label={`Eliminar colección ${collection.name}`}
                    onClick={() => {
                      if (!window.confirm(`¿Eliminar la colección “${collection.name}”? Tus favoritos se conservarán.`)) {
                        return;
                      }
                      deleteFavoriteCollection(collection.id)
                        .then(() => {
                          showFavoriteToast("Colección eliminada");
                          loadCollections();
                          if (activeCollectionId === collection.id) {
                            setActiveCollectionId(null);
                          }
                        })
                        .catch(() => undefined);
                    }}
                  >
                    <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {createOpen ? (
        <div className="favorite-save-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="favorite-save-modal__backdrop"
            aria-label="Cerrar"
            onClick={() => setCreateOpen(false)}
          />
          <div className="favorite-save-modal__panel">
            <header className="favorite-save-modal__head">
              <h2 className="favorite-save-modal__title">Crear nueva colección</h2>
            </header>
            <label className="favorite-save-modal__field">
              <span>Nombre</span>
              <input
                type="text"
                value={newName}
                maxLength={50}
                placeholder="Ej. Planes de fin de semana"
                onChange={(event) => setNewName(event.target.value)}
              />
            </label>
            {createError ? <p className="favorite-save-modal__error">{createError}</p> : null}
            <div className="favorite-save-modal__actions">
              <button type="button" className="favorite-save-modal__ghost" onClick={() => setCreateOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="favorite-save-modal__primary"
                disabled={creating}
                onClick={() => {
                  const cleaned = newName.trim();
                  if (!cleaned) {
                    setCreateError("Escribe un nombre para la colección.");
                    return;
                  }
                  setCreating(true);
                  setCreateError("");
                  createFavoriteCollection({ name: cleaned })
                    .then(() => {
                      showFavoriteToast("Colección creada");
                      setCreateOpen(false);
                      setNewName("");
                      loadCollections();
                    })
                    .catch(() => setCreateError("No pudimos crear la colección."))
                    .finally(() => setCreating(false));
                }}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {moveExperienceId ? (
        <MoveCollectionModal
          experienceId={moveExperienceId}
          collections={collections}
          onClose={() => {
            setMoveExperienceId(null);
            loadCollections();
          }}
        />
      ) : null}
    </div>
  );
}
