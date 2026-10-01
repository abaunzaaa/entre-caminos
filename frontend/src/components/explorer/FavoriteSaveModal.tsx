import { useEffect, useState, type CSSProperties } from "react";
import { FolderPlus, Plus, X } from "lucide-react";
import heartIcon from "../../assets/heart-icon.png";
import {
  createFavoriteCollection,
  listFavoriteCollections,
  setExperienceCollections,
  type FavoriteCollection,
} from "../../services/favorite-collections.service";
import { addFavorite } from "../../services/favorites.service";
import {
  notifyFavoritesChanged,
  notifyFavoriteStatus,
  onFavoriteSaveModal,
  showFavoriteToast,
} from "../../services/favorites-sync";
import { experienceCoverUrl } from "./explorer-media";

type Mode = "pick" | "create";

export function FavoriteSaveModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("pick");
  const [experienceId, setExperienceId] = useState("");
  const [collections, setCollections] = useState<FavoriteCollection[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return onFavoriteSaveModal(({ experienceId: id }) => {
      setExperienceId(id);
      setMode("pick");
      setName("");
      setError("");
      setSelectedIds([]);
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    listFavoriteCollections()
      .then((items) => {
        if (!cancelled) {
          setCollections(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollections([]);
          setError("No pudimos cargar tus colecciones.");
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
  }, [open]);

  function close() {
    if (saving) {
      return;
    }
    setOpen(false);
  }

  async function saveFavorite() {
    if (!experienceId || saving) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (selectedIds.length) {
        await setExperienceCollections(experienceId, selectedIds);
      } else {
        await addFavorite(experienceId);
      }
      notifyFavoriteStatus(experienceId, true);
      notifyFavoritesChanged();
      window.dispatchEvent(new Event("ec-favorite-collections-changed"));
      showFavoriteToast("Añadido a favoritos");
      setOpen(false);
    } catch {
      setError("No pudimos guardar en favoritos. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function createCollection() {
    if (!experienceId || saving) {
      return;
    }
    const cleaned = name.trim();
    if (!cleaned) {
      setError("Escribe un nombre para la colección.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createFavoriteCollection({ name: cleaned, experienceId });
      notifyFavoriteStatus(experienceId, true);
      notifyFavoritesChanged();
      window.dispatchEvent(new Event("ec-favorite-collections-changed"));
      showFavoriteToast("Colección creada");
      setOpen(false);
    } catch {
      setError("No pudimos crear la colección. Prueba con otro nombre.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="favorite-save-modal" role="dialog" aria-modal="true" aria-labelledby="favorite-save-title">
      <button type="button" className="favorite-save-modal__backdrop" aria-label="Cerrar" onClick={close} />
      <div className="favorite-save-modal__panel">
        <button type="button" className="favorite-save-modal__close" onClick={close} aria-label="Cerrar">
          <X size={16} strokeWidth={1.9} aria-hidden="true" />
        </button>

        <header className="favorite-save-modal__head">
          {mode === "pick" ? (
            <span
              className="favorite-save-modal__mark"
              style={{ "--favorites-mark-mask": `url(${heartIcon})` } as CSSProperties}
              role="img"
              aria-hidden="true"
            />
          ) : null}
          <h2 id="favorite-save-title" className="favorite-save-modal__title">
            {mode === "create" ? "Crear nueva colección" : "Guardar en favoritos"}
          </h2>
        </header>

        {mode === "pick" ? (
          <>
            <div className="favorite-save-modal__list">
              {loading ? (
                <p className="favorite-save-modal__empty">Cargando colecciones…</p>
              ) : collections.length ? (
                collections.map((collection) => {
                  const checked = selectedIds.includes(collection.id);
                  const preview = collection.previewExperiences[0];
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      className={`favorite-save-modal__item${checked ? " is-on" : ""}`}
                      onClick={() => {
                        setSelectedIds((current) =>
                          checked ? current.filter((id) => id !== collection.id) : [...current, collection.id],
                        );
                      }}
                    >
                      <span className="favorite-save-modal__thumb">
                        {preview ? (
                          <img src={experienceCoverUrl(preview, 240)} alt="" draggable={false} />
                        ) : (
                          <FolderPlus size={16} strokeWidth={1.7} aria-hidden="true" />
                        )}
                      </span>
                      <span className="favorite-save-modal__meta">
                        <strong>{collection.name}</strong>
                        <em>
                          {collection.count} {collection.count === 1 ? "experiencia" : "experiencias"}
                        </em>
                      </span>
                      <span className="favorite-save-modal__check" aria-hidden="true">
                        {checked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="favorite-save-modal__empty">Aún no tienes colecciones. Puedes crear una ahora.</p>
              )}
            </div>

            <button
              type="button"
              className="favorite-save-modal__create-link"
              onClick={() => {
                setMode("create");
                setError("");
              }}
            >
              <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
              Crear nueva colección
            </button>

            {error ? <p className="favorite-save-modal__error">{error}</p> : null}

            <div className="favorite-save-modal__actions">
              <button type="button" className="favorite-save-modal__primary" disabled={saving} onClick={saveFavorite}>
                Guardar en favoritos
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="favorite-save-modal__field">
              <span>Nombre</span>
              <input
                type="text"
                value={name}
                maxLength={50}
                placeholder="Ej. Planes de fin de semana"
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </label>
            {error ? <p className="favorite-save-modal__error">{error}</p> : null}
            <div className="favorite-save-modal__actions favorite-save-modal__actions--split">
              <button
                type="button"
                className="favorite-save-modal__ghost"
                disabled={saving}
                onClick={() => {
                  setMode("pick");
                  setError("");
                }}
              >
                Cancelar
              </button>
              <button type="button" className="favorite-save-modal__primary" disabled={saving} onClick={createCollection}>
                Crear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
