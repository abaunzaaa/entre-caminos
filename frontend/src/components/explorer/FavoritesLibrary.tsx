import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FolderInput,
  FolderPlus,
  Heart,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import favVacia from "../../assets/fav-vacia.png";
import heartIcon from "../../assets/heart-icon.png";
import { useFavoriteToggle } from "../../hooks/useFavoriteToggle";
import {
  addExperienceToCollection,
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
const COLLECTION_PAGE_SIZE_DESKTOP = 8;
const COLLECTION_PAGE_SIZE_TABLET = 4;
const COLLECTION_PAGE_SIZE_MOBILE = 2;

function scrollCarousel(node: HTMLElement | null, direction: -1 | 1) {
  if (!node) {
    return;
  }
  const amount = Math.max(220, Math.round(node.clientWidth * 0.72));
  node.scrollBy({ left: direction * amount, behavior: "smooth" });
}

function ExperienceCardActions({
  experienceId,
  href,
  collectionId,
  onMove,
  onCollectionUpdated,
}: {
  experienceId: string;
  href: string;
  collectionId?: string;
  onMove?: (experienceId: string) => void;
  onCollectionUpdated?: (collection: FavoriteCollection) => void;
}) {
  const { favorited, busy, toggle } = useFavoriteToggle(experienceId, {
    initialFavorited: true,
    loginRedirectTo: href,
  });
  const [removingFromCollection, setRemovingFromCollection] = useState(false);

  return (
    <div className="favorites-strip__toolbar" role="group" aria-label="Acciones de la experiencia">
      <button
        type="button"
        className={`favorites-strip__icon-btn${favorited ? " favorites-strip__icon-btn--fav" : ""}`}
        aria-label="Quitar de favoritos"
        title="Quitar de favoritos"
        disabled={busy || !favorited}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (favorited && !busy) {
            toggle();
          }
        }}
      >
        <Heart
          size={15}
          strokeWidth={1.85}
          fill={favorited ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>

      {collectionId ? (
        <button
          type="button"
          className="favorites-strip__icon-btn"
          aria-label="Quitar de esta colección"
          title="Quitar de esta colección"
          disabled={removingFromCollection}
          onClick={() => {
            setRemovingFromCollection(true);
            removeExperienceFromCollection(collectionId, experienceId)
              .then((collection) => {
                showFavoriteToast("Quitada de la colección");
                onCollectionUpdated?.(collection);
                window.dispatchEvent(new Event("ec-favorite-collections-changed"));
              })
              .catch(() => undefined)
              .finally(() => setRemovingFromCollection(false));
          }}
        >
          <Trash2 size={15} strokeWidth={1.85} aria-hidden="true" />
        </button>
      ) : null}

      {onMove ? (
        <button
          type="button"
          className="favorites-strip__icon-btn"
          aria-label="Mover a colección"
          title="Mover a colección"
          onClick={() => onMove(experienceId)}
        >
          <FolderInput size={15} strokeWidth={1.85} aria-hidden="true" />
        </button>
      ) : null}
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
    <article
      className={`favorites-strip__card favorites-strip__card--grid${collectionId ? " favorites-strip__card--in-collection" : ""}`}
      role="listitem"
    >
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
        <ExperienceCardActions
          experienceId={experience.id}
          href={href}
          collectionId={collectionId}
          onMove={onMove}
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

function AddExperiencesToCollectionModal({
  collection,
  favorites,
  onClose,
  onAdded,
}: {
  collection: FavoriteCollection;
  favorites: Experience[];
  onClose: () => void;
  onAdded: (collection: FavoriteCollection) => void;
}) {
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedIds([]);
    setQuery("");
    setError("");
    getFavoriteCollection(collection.id)
      .then((detail) => {
        if (cancelled) {
          return;
        }
        const ids = new Set((detail.experiences ?? detail.previewExperiences).map((item) => item.id));
        setMemberIds(ids);
        onAdded(detail);
      })
      .catch(() => {
        if (!cancelled) {
          setMemberIds(
            new Set((collection.experiences ?? collection.previewExperiences).map((item) => item.id)),
          );
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
  }, [collection.id]);

  const available = useMemo(() => {
    return favorites.filter((experience) => !memberIds.has(experience.id));
  }, [favorites, memberIds]);

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return available;
    }
    return available.filter((experience) =>
      experience.title.toLocaleLowerCase("es").includes(normalizedQuery),
    );
  }, [available, normalizedQuery]);

  async function confirmAdd() {
    if (!selectedIds.length || saving) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      for (const experienceId of selectedIds) {
        await addExperienceToCollection(collection.id, experienceId);
      }
      const detail = await getFavoriteCollection(collection.id);
      onAdded(detail);
      window.dispatchEvent(new Event("ec-favorite-collections-changed"));
      showFavoriteToast(
        selectedIds.length === 1 ? "Experiencia agregada" : "Experiencias agregadas",
      );
      onClose();
    } catch {
      setError("No pudimos agregar las experiencias. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="favorite-save-modal" role="dialog" aria-modal="true" aria-labelledby="add-to-collection-title">
      <button type="button" className="favorite-save-modal__backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="favorite-save-modal__panel favorite-save-modal__panel--wide">
        <button type="button" className="favorite-save-modal__close" onClick={onClose} aria-label="Cerrar">
          <X size={16} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <header className="favorite-save-modal__head">
          <AuthKeyIcon className="auth-recovery-icon" />
          <h2 id="add-to-collection-title" className="favorite-save-modal__title">
            Agregar experiencias a “{collection.name}”
          </h2>
        </header>

        {loading ? (
          <p className="favorite-save-modal__empty">Cargando experiencias…</p>
        ) : !available.length ? (
          <p className="favorite-save-modal__empty">
            Todas tus experiencias favoritas ya están en esta colección
          </p>
        ) : (
          <>
            <label className="favorites-add-modal__search">
              <Search size={14} strokeWidth={1.8} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar experiencia"
                aria-label="Buscar experiencia"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <div className="favorite-save-modal__list favorites-add-modal__list">
              {filtered.length ? (
                filtered.map((experience) => {
                  const checked = selectedIds.includes(experience.id);
                  const place = municipalityLabel(experience.location) || "Colombia";
                  return (
                    <button
                      key={experience.id}
                      type="button"
                      className={`favorite-save-modal__item${checked ? " is-on" : ""}`}
                      onClick={() =>
                        setSelectedIds((current) =>
                          checked
                            ? current.filter((id) => id !== experience.id)
                            : [...current, experience.id],
                        )
                      }
                    >
                      <span className="favorite-save-modal__thumb">
                        <img src={experienceCoverUrl(experience, 240)} alt="" draggable={false} />
                      </span>
                      <span className="favorite-save-modal__meta">
                        <strong>{experience.title}</strong>
                        <em>{place}</em>
                      </span>
                      <span className="favorite-save-modal__check" aria-hidden="true">
                        {checked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="favorite-save-modal__empty">No se encontraron experiencias con ese nombre</p>
              )}
            </div>
          </>
        )}

        {error ? <p className="favorite-save-modal__error">{error}</p> : null}

        {!loading && available.length ? (
          <div className="favorite-save-modal__actions">
            <button
              type="button"
              className="favorite-save-modal__primary"
              disabled={saving || !selectedIds.length}
              onClick={() => {
                void confirmAdd();
              }}
            >
              Agregar seleccionadas
            </button>
          </div>
        ) : null}
      </div>
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
          <AuthKeyIcon className="auth-recovery-icon" />
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
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false);
  const [collectionPendingDelete, setCollectionPendingDelete] = useState<FavoriteCollection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState(false);
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [collectionPageSize, setCollectionPageSize] = useState(COLLECTION_PAGE_SIZE_DESKTOP);

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
    function updateCollectionPageSize() {
      if (window.matchMedia("(max-width: 640px)").matches) {
        setCollectionPageSize(COLLECTION_PAGE_SIZE_MOBILE);
      } else if (window.matchMedia("(max-width: 980px)").matches) {
        setCollectionPageSize(COLLECTION_PAGE_SIZE_TABLET);
      } else {
        setCollectionPageSize(COLLECTION_PAGE_SIZE_DESKTOP);
      }
    }
    updateCollectionPageSize();
    window.addEventListener("resize", updateCollectionPageSize);
    return () => window.removeEventListener("resize", updateCollectionPageSize);
  }, []);

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

  useEffect(() => {
    setCollectionsPage(1);
  }, [collections.length, collectionPageSize]);

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

  // One slot on every page is reserved for the fixed "Crear colección" card.
  const collectionsPerPage = Math.max(1, collectionPageSize - 1);
  const collectionPageCount = Math.max(1, Math.ceil(collections.length / collectionsPerPage));
  const safeCollectionsPage = Math.min(collectionsPage, collectionPageCount);
  const pagedCollections = collections.slice(
    (safeCollectionsPage - 1) * collectionsPerPage,
    safeCollectionsPage * collectionsPerPage,
  );
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
        <div className="favorites-library__top-inner">
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
      </div>

      <section className="favorites-strip favorites-strip--grid">
        {activeCollection ? (
          <p className="favorites-strip__label">{activeCollection.name}</p>
        ) : selectedGroup ? (
          <p className="favorites-strip__label">{selectedGroup.name}</p>
        ) : (
          <header className="favorites-section-intro">
            <h2 className="favorites-section-intro__title">Todas tus experiencias</h2>
            <p className="favorites-section-intro__lead">Recorre tus favoritos</p>
          </header>
        )}

        {activeCollection ? (
          <>
            <div className="favorites-collections__view-tools">
              <button
                type="button"
                className="favorites-collections__back"
                onClick={() => {
                  setAddToCollectionOpen(false);
                  setActiveCollectionId(null);
                }}
              >
                ← Volver a mis colecciones
              </button>
              <button
                type="button"
                className="favorites-collections__add-btn"
                onClick={() => setAddToCollectionOpen(true)}
              >
                <Plus size={14} strokeWidth={1.9} aria-hidden="true" />
                Agregar experiencias
              </button>
            </div>
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
          <header className="favorites-section-intro">
            <h2 className="favorites-section-intro__title">Mis colecciones</h2>
            <p className="favorites-section-intro__lead">Guarda y reúne tus próximos planes</p>
          </header>

          <div className="favorites-collections__grid">
            <article className="favorites-collection-card favorites-collection-card--create">
              <button
                type="button"
                className="favorites-collection-card__main favorites-collection-card__main--create"
                onClick={() => {
                  setCreateOpen(true);
                  setCreateError("");
                  setNewName("");
                }}
              >
                <span className="favorites-collection-card__create-body">
                  <Plus size={42} strokeWidth={1.55} aria-hidden="true" />
                  <span>Crear colección</span>
                </span>
              </button>
            </article>

            {pagedCollections.map((collection) => {
              const previews = collection.previewExperiences.slice(0, 4);
              const collageCount = Math.min(previews.length, 4);
              return (
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
                    <span
                      className={`favorites-collection-card__collage favorites-collection-card__collage--${collageCount}`}
                      aria-hidden="true"
                    >
                      {previews.map((experience) => (
                        <img
                          key={experience.id}
                          src={experienceCoverUrl(experience, 480)}
                          alt=""
                          className="favorites-collection-card__shot"
                          draggable={false}
                        />
                      ))}
                      {!previews.length ? (
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
                    onClick={() => setCollectionPendingDelete(collection)}
                  >
                    <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>

          {collections.length > collectionsPerPage ? (
            <div className="explorer-discover-pager favorites-library__pager">
              <button
                type="button"
                onClick={() => setCollectionsPage((current) => Math.max(1, current - 1))}
                disabled={safeCollectionsPage <= 1}
              >
                Anterior
              </button>
              <span className="explorer-discover-pager__page">Página {safeCollectionsPage}</span>
              <button
                type="button"
                onClick={() => setCollectionsPage((current) => Math.min(collectionPageCount, current + 1))}
                disabled={safeCollectionsPage >= collectionPageCount}
              >
                Siguiente
              </button>
            </div>
          ) : null}
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
              <AuthKeyIcon className="auth-recovery-icon" />
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

      {addToCollectionOpen && activeCollection ? (
        <AddExperiencesToCollectionModal
          collection={activeCollection}
          favorites={experiences}
          onClose={() => setAddToCollectionOpen(false)}
          onAdded={upsertCollection}
        />
      ) : null}

      {collectionPendingDelete ? (
        <div
          className="favorite-save-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-collection-title"
        >
          <button
            type="button"
            className="favorite-save-modal__backdrop"
            aria-label="Cerrar"
            disabled={deletingCollection}
            onClick={() => {
              if (!deletingCollection) {
                setCollectionPendingDelete(null);
              }
            }}
          />
          <div className="favorite-save-modal__panel favorites-delete-modal">
            <span className="favorites-delete-modal__icon" aria-hidden="true">
              <Trash2 size={28} strokeWidth={1.6} />
            </span>
            <h2 id="delete-collection-title" className="favorite-save-modal__title">
              Eliminar colección
            </h2>
            <p className="favorites-delete-modal__question">
              ¿Quieres eliminar “{collectionPendingDelete.name}”?
            </p>
            <p className="favorites-delete-modal__note">
              Tus experiencias seguirán guardadas en favoritos.
            </p>
            <div className="favorite-save-modal__actions favorites-delete-modal__actions">
              <button
                type="button"
                className="favorite-save-modal__ghost"
                disabled={deletingCollection}
                onClick={() => setCollectionPendingDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="favorite-save-modal__primary"
                disabled={deletingCollection}
                onClick={() => {
                  const target = collectionPendingDelete;
                  setDeletingCollection(true);
                  deleteFavoriteCollection(target.id)
                    .then(() => {
                      showFavoriteToast("Colección eliminada");
                      setCollectionPendingDelete(null);
                      loadCollections();
                      if (activeCollectionId === target.id) {
                        setActiveCollectionId(null);
                      }
                    })
                    .catch(() => undefined)
                    .finally(() => setDeletingCollection(false));
                }}
              >
                Eliminar colección
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
