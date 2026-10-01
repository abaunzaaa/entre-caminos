import type { CSSProperties } from "react";
import type { FavoriteFolder } from "./favorite-folders";

type FavoriteFoldersGridProps = {
  folders: FavoriteFolder[];
  onFolderClick?: (folder: FavoriteFolder) => void;
};

function FolderMark({ tone }: { tone: FavoriteFolder["tone"] }) {
  if (tone === "cream") {
    return (
      <svg className="fav-folder__mark" viewBox="0 0 28 22" aria-hidden="true">
        <path
          d="M14 18c-2.2-1.6-5.8-4.8-5.8-8.2 0-2.1 1.6-3.5 3.4-3.5 1.2 0 2.1.5 2.4 1.3.3-.8 1.2-1.3 2.4-1.3 1.8 0 3.4 1.4 3.4 3.5 0 3.4-3.6 6.6-5.8 8.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "rose") {
    return (
      <svg className="fav-folder__mark" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8.5 4.5v10.2a2.8 2.8 0 1 0 2.2 2.7V9.2l7.3-1.5v6.8a2.8 2.8 0 1 0 2.2 2.7V5.6L8.5 4.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "blue") {
    return (
      <svg className="fav-folder__mark" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
        <path d="M15.2 15.2 20 20" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="fav-folder__mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.4s-6.2-3.9-6.2-8.6A3.6 3.6 0 0 1 12 9.4a3.6 3.6 0 0 1 6.2 2.4c0 4.7-6.2 8.6-6.2 8.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FavoriteFoldersGrid({ folders, onFolderClick }: FavoriteFoldersGridProps) {
  if (!folders.length) {
    return null;
  }

  return (
    <div className="fav-folders-block">
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
          Tus guardados para volver a ellos
        </p>
      </header>
      <div className="fav-folders" aria-label="Favoritos por categoría">
        {folders.map((folder, index) => {
          const interactive = typeof onFolderClick === "function";
          const className = `fav-folder fav-folder--${folder.tone} explorer-reveal explorer-reveal--card`;
          const style = {
            "--reveal-delay": `${150 + index * 80}ms`,
          } as CSSProperties;

          if (interactive) {
            return (
              <button
                key={folder.id}
                type="button"
                className={className}
                style={style}
                onClick={() => onFolderClick(folder)}
              >
                <FolderContent folder={folder} />
              </button>
            );
          }

          return (
            <article key={folder.id} className={className} style={style}>
              <FolderContent folder={folder} />
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FolderContent({ folder }: { folder: FavoriteFolder }) {
  return (
    <>
      <div className="fav-folder__media">
        <img src={folder.imageSrc} alt="" draggable={false} decoding="async" />
      </div>
      <div className="fav-folder__body">
        <span className="fav-folder__tab">{folder.category}</span>
        <h3 className="fav-folder__title">{folder.title}</h3>
        <p className="fav-folder__subtitle">{folder.subtitle}</p>
        <FolderMark tone={folder.tone} />
      </div>
    </>
  );
}
