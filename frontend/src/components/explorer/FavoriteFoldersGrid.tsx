import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import favVacia from "../../assets/fav-vacia.png";
import { useFavoriteToggle } from "../../hooks/useFavoriteToggle";
import type { FavoriteFolder } from "./favorite-folders";

type FavoriteFoldersGridProps = {
  folders: FavoriteFolder[];
  onFolderClick?: (folder: FavoriteFolder) => void;
  emptyMessage?: string;
};

const LEAVE_MS = 280;

function FavoriteHeartButton({
  experienceId,
  href,
  onRemoved,
}: {
  experienceId: string;
  href?: string;
  onRemoved: () => void;
}) {
  const onRemovedRef = useRef(onRemoved);
  onRemovedRef.current = onRemoved;
  const [removed, setRemoved] = useState(false);
  const { favorited, busy, toggle } = useFavoriteToggle(experienceId, {
    initialFavorited: true,
    loginRedirectTo: href ?? `/explorar/${experienceId}`,
  });

  useEffect(() => {
    if (!favorited && !busy && !removed) {
      setRemoved(true);
      onRemovedRef.current();
    }
  }, [busy, favorited, removed]);

  return (
    <button
      type="button"
      className="fav-folder__fav is-on"
      aria-label="Quitar de favoritos"
      aria-pressed={true}
      disabled={busy || removed}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (favorited && !busy && !removed) {
          toggle();
        }
      }}
    >
      <Heart size={14} strokeWidth={1.9} fill="currentColor" aria-hidden="true" />
      <span className="fav-folder__fav-tip" role="tooltip">
        Quitar de favoritos
      </span>
    </button>
  );
}

function FavoriteFolderCard({
  folder,
  className,
  style,
  leaving,
  onFolderClick,
  onRemoved,
  onLeaveDone,
}: {
  folder: FavoriteFolder;
  className: string;
  style: CSSProperties;
  leaving: boolean;
  onFolderClick?: (folder: FavoriteFolder) => void;
  onRemoved: () => void;
  onLeaveDone: () => void;
}) {
  const onLeaveDoneRef = useRef(onLeaveDone);
  onLeaveDoneRef.current = onLeaveDone;
  const cardClassName = `${className}${leaving ? " is-leaving" : ""}`;

  useEffect(() => {
    if (!leaving) {
      return;
    }
    const timer = window.setTimeout(() => {
      onLeaveDoneRef.current();
    }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const content = (
    <>
      <div className="fav-folder__media">
        <img src={folder.imageSrc} alt="" draggable={false} decoding="async" />
      </div>
      <div className="fav-folder__body">
        <span className="fav-folder__tab">{folder.category}</span>
        <h3 className="fav-folder__title">{folder.title}</h3>
        <p className="fav-folder__subtitle">{folder.subtitle}</p>
        <FavoriteHeartButton experienceId={folder.id} href={folder.href} onRemoved={onRemoved} />
      </div>
    </>
  );

  if (folder.href) {
    return (
      <Link
        to={folder.href}
        className={cardClassName}
        style={style}
        aria-disabled={leaving || undefined}
        tabIndex={leaving ? -1 : undefined}
        onClick={(event) => {
          if (leaving) {
            event.preventDefault();
          }
        }}
      >
        {content}
      </Link>
    );
  }

  if (typeof onFolderClick === "function") {
    return (
      <button
        type="button"
        className={cardClassName}
        style={style}
        disabled={leaving}
        onClick={() => onFolderClick(folder)}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={cardClassName} style={style}>
      {content}
    </article>
  );
}

export function FavoriteFoldersGrid({ folders, onFolderClick, emptyMessage }: FavoriteFoldersGridProps) {
  const folderCacheRef = useRef(new Map<string, FavoriteFolder>());
  const [leavingIds, setLeavingIds] = useState<string[]>([]);

  folders.forEach((folder) => {
    folderCacheRef.current.set(folder.id, folder);
  });

  const displayFolders = useMemo(() => {
    const byId = new Set(folders.map((folder) => folder.id));
    const ordered = [...folders];

    for (const id of leavingIds) {
      if (!byId.has(id)) {
        const cached = folderCacheRef.current.get(id);
        if (cached) {
          ordered.push(cached);
        }
      }
    }

    return ordered;
  }, [folders, leavingIds]);

  const isEmpty = displayFolders.length === 0;

  return (
    <div className={`fav-folders-block${isEmpty ? " fav-folders-block--empty" : ""}`}>
      <header className="explorer-recs__column-head fav-folders__intro">
        <h2
          className="explorer-recs__column-title explorer-reveal explorer-reveal--title"
          id="explorer-favorites-title"
          style={{ "--reveal-delay": "0ms" } as CSSProperties}
        >
          Tus experiencias favoritas
        </h2>
        <p
          className="explorer-recs__column-lead explorer-reveal explorer-reveal--soft"
          style={{ "--reveal-delay": "80ms" } as CSSProperties}
        >
          Guardadas recientemente
        </p>
      </header>

      {isEmpty ? (
        <div className="fav-folders__empty-state" aria-live="polite">
          <span
            className="fav-folders__empty-icon explorer-reveal explorer-reveal--soft"
            style={
              {
                "--reveal-delay": "150ms",
                "--fav-empty-mask": `url(${favVacia})`,
              } as CSSProperties
            }
            role="img"
            aria-hidden="true"
          />
          <p
            className="fav-folders__empty explorer-reveal explorer-reveal--soft"
            style={{ "--reveal-delay": "280ms" } as CSSProperties}
          >
            {emptyMessage || "Aún no tienes experiencias favoritas"}
          </p>
        </div>
      ) : (
        <div className="fav-folders" aria-label="Favoritos por categoría">
          {displayFolders.map((folder, index) => (
            <FavoriteFolderCard
              key={folder.id}
              folder={folder}
              leaving={leavingIds.includes(folder.id)}
              className={`fav-folder fav-folder--${folder.tone} explorer-reveal explorer-reveal--card`}
              style={{ "--reveal-delay": `${150 + index * 80}ms` } as CSSProperties}
              onFolderClick={onFolderClick}
              onRemoved={() => {
                setLeavingIds((current) => (current.includes(folder.id) ? current : [...current, folder.id]));
              }}
              onLeaveDone={() => {
                setLeavingIds((current) => current.filter((id) => id !== folder.id));
                folderCacheRef.current.delete(folder.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
