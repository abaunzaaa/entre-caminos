import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { uploadStampImage } from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import stampExamples from "../../assets/stamp-examples.jpg";
import "../../styles/experience-stamp.css";

const STAMP_TYPES = ["image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type ExperienceStampFieldProps = {
  value: string | null;
  disabled?: boolean;
  onChange: (url: string | null) => void;
  onError: (message: string) => void;
};

function StampSilhouette() {
  return (
    <svg className="dash-stamp-modal__silhouette" viewBox="0 0 120 120" aria-hidden="true">
      <rect x="10" y="10" width="100" height="100" rx="10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 5" />
      <path d="M28 86l18-24 14 16 16-22 16 30H28z" fill="currentColor" opacity="0.08" />
      <circle cx="46" cy="44" r="8" fill="currentColor" opacity="0.1" />
    </svg>
  );
}

function StampOutline() {
  return (
    <svg className="dash-exps-stamp__mark" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <path
        d="M17.5 7c0 1.93 1.57 3.5 3.5 3.5S24.5 8.93 24.5 7h7c0 1.93 1.57 3.5 3.5 3.5S38.5 8.93 38.5 7H41a8 8 0 0 1 8 8v2.5c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5v7c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5V41a8 8 0 0 1-8 8h-2.5c0-1.93-1.57-3.5-3.5-3.5s-3.5 1.57-3.5 3.5h-7c0-1.93-1.57-3.5-3.5-3.5S17.5 47.93 17.5 49H15a8 8 0 0 1-8-8v-2.5c1.93 0 3.5-1.57 3.5-3.5S8.93 31.5 7 31.5v-7c1.93 0 3.5-1.57 3.5-3.5S8.93 17.5 7 17.5V15a8 8 0 0 1 8-8h2.5z"
        stroke="currentColor"
        strokeWidth="1.15"
      />
    </svg>
  );
}

export function ExperienceStampField({ value, disabled, onChange, onError }: ExperienceStampFieldProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState("");

  const preview = pendingPreview || value;

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (pendingPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingPreview);
      }
    };
  }, [pendingPreview]);

  function close() {
    if (uploading) {
      return;
    }
    setOpen(false);
    setGuide(false);
    setLocalError("");
    setPendingFile(null);
    setPendingPreview((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }

  function acceptFile(file: File | undefined) {
    if (!file) {
      return;
    }
    if (!STAMP_TYPES.includes(file.type)) {
      setLocalError("La estampita debe ser PNG o WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("La imagen no puede superar 5 MB.");
      return;
    }
    setLocalError("");
    setPendingPreview((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
    setPendingFile(file);
  }

  async function uploadPending() {
    if (!pendingFile) {
      setLocalError("Selecciona un archivo PNG o WEBP.");
      return;
    }
    setUploading(true);
    setLocalError("");
    try {
      const url = await uploadStampImage(pendingFile);
      onChange(url);
      setPendingFile(null);
      setPendingPreview((current) => {
        if (current?.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudo subir la estampita");
      setLocalError(message);
      onError(message);
    } finally {
      setUploading(false);
    }
  }

  function removeStamp() {
    onChange(null);
    setPendingFile(null);
    setPendingPreview((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }

  function openStampModal() {
    setGuide(false);
    setOpen(true);
  }

  return (
    <div className="dash-exps-stamp">
      <div className="dash-exps-stamp__copy">
        <span className="dash-exps-stamp__label">Estampita de la experiencia</span>
        <p className="dash-exps-stamp__lead">
          Agrega el recuerdo que tus visitantes podrán coleccionar después de vivir esta experiencia.
        </p>
      </div>
      <button
        type="button"
        className="dash-exps-stamp__zone"
        disabled={disabled}
        aria-label={value ? "Cambiar estampita de la experiencia" : "Agregar estampita de la experiencia"}
        onClick={openStampModal}
      >
        {value ? (
          <span className="dash-exps-stamp__preview">
            <img src={mediaUrl(value)} alt="" />
          </span>
        ) : (
          <StampOutline />
        )}
        <span className="dash-exps-stamp__zone-copy">
          <span className="dash-exps-stamp__zone-title">
            {value ? "Estampita lista" : "Agrega tu estampita"}
          </span>
          {value ? null : (
            <span className="dash-exps-stamp__zone-meta">PNG o WEBP · formato 1:1</span>
          )}
        </span>
        <span className="dash-exps-stamp__cta">
          {value ? "Cambiar" : "Agregar"}
          <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" />
        </span>
      </button>

      {open
        ? createPortal(
            <div className="dash-stamp-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
              <div
                className="dash-stamp-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
              >
                <button
                  ref={closeRef}
                  type="button"
                  className="dash-stamp-modal__close"
                  aria-label="Cerrar"
                  onClick={close}
                >
                  <X size={18} strokeWidth={1.7} aria-hidden="true" />
                </button>
                <div className="dash-stamp-modal__scene">
                  <div className={`dash-stamp-modal__card${guide ? " is-guide" : ""}`}>
                    <div className="dash-stamp-modal__face dash-stamp-modal__face--front">
                      <div className="dash-stamp-modal__front-stack">
                      <h2 id={titleId}>Agregar estampita</h2>
                      <p>
                        Esta será la estampita que tus visitantes podrán coleccionar después de vivir tu
                        experiencia.
                      </p>
                      {preview ? (
                        <div className="dash-stamp-modal__preview-wrap">
                          <img src={mediaUrl(preview)} alt="" />
                        </div>
                      ) : (
                        <label
                          className={`dash-stamp-modal__drop${dragOver ? " is-over" : ""}`}
                          onClick={() => inputRef.current?.click()}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOver(true);
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDragOver(false);
                            acceptFile(event.dataTransfer.files[0]);
                          }}
                        >
                          <StampSilhouette />
                          <span>
                            Arrastra tu archivo aquí
                            <em>o haz clic para seleccionarlo</em>
                          </span>
                        </label>
                      )}
                      <input
                        ref={inputRef}
                        className="dash-stamp-modal__file"
                        type="file"
                        accept="image/png,image/webp"
                        onChange={(event) => {
                          acceptFile(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <p className="dash-stamp-modal__meta">PNG o WEBP · fondo transparente · formato 1:1</p>
                      <p className="dash-stamp-modal__meta">Recomendado: 1000 × 1000 px o superior</p>
                      {localError ? (
                        <p className="dash-stamp-modal__error" role="alert">
                          {localError}
                        </p>
                      ) : null}
                      {preview ? (
                        <div className="dash-stamp-modal__preview-actions">
                          {pendingFile ? null : (
                            <button
                              type="button"
                              className="dash-stamp-modal__ghost"
                              disabled={uploading}
                              onClick={() => inputRef.current?.click()}
                            >
                              Cambiar estampita
                            </button>
                          )}
                          <button
                            type="button"
                            className="dash-stamp-modal__ghost dash-stamp-modal__ghost--quiet"
                            disabled={uploading}
                            onClick={removeStamp}
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                      {!preview || pendingFile ? (
                        <button
                          type="button"
                          className="dash-stamp-modal__submit"
                          disabled={uploading || !pendingFile}
                          onClick={() => void uploadPending()}
                        >
                          {uploading ? "Subiendo…" : "Subir estampita"}
                        </button>
                      ) : null}
                      <button type="button" className="dash-stamp-modal__guide-link" onClick={() => setGuide(true)}>
                        Ver guía para subir estampita
                        <span className="dash-stamp-modal__guide-arrow" aria-hidden="true">
                          <ArrowRight size={14} strokeWidth={1.8} />
                        </span>
                      </button>
                      </div>
                    </div>
                    <div className="dash-stamp-modal__face dash-stamp-modal__face--back">
                      <button
                        type="button"
                        className="dash-stamp-modal__back"
                        aria-label="Volver a subir estampita"
                        onClick={() => setGuide(false)}
                      >
                        <ArrowLeft size={16} strokeWidth={1.7} aria-hidden="true" />
                      </button>
                      <h2>Guía para tu estampita</h2>
                      <p>
                        Tu estampita será parte de la colección digital de los viajeros. Diseñala como un pequeño
                        recuerdo de tu experiencia: simple, reconocible y especial.
                      </p>
                      <h3>Cómo debería verse</h3>
                      <img
                        className="dash-stamp-guide__examples"
                        src={stampExamples}
                        alt="Ejemplos de estampitas de Entre Caminos"
                      />
                      <h3>Para crear la tuya</h3>
                      <ol className="dash-stamp-guide__steps">
                        <li>
                          <span>01</span>
                          <div>
                            <strong>Representa tu experiencia</strong>
                            <p>Elige un lugar, objeto, actividad o elemento que la haga reconocible.</p>
                          </div>
                        </li>
                        <li>
                          <span>02</span>
                          <div>
                            <strong>Mantén un estilo ilustrado</strong>
                            <p>Debe sentirse como una pequeña insignia o recuerdo turístico, no como una fotografía.</p>
                          </div>
                        </li>
                        <li>
                          <span>03</span>
                          <div>
                            <strong>Usa pocos elementos</strong>
                            <p>Prioriza una composición limpia y fácil de reconocer incluso en tamaño pequeño.</p>
                          </div>
                        </li>
                        <li>
                          <span>04</span>
                          <div>
                            <strong>Cuida los colores</strong>
                            <p>Utiliza una paleta armónica y evita colores excesivamente fuertes o saturados.</p>
                          </div>
                        </li>
                        <li>
                          <span>05</span>
                          <div>
                            <strong>El texto es opcional</strong>
                            <p>Puedes incluir el nombre corto de la experiencia o del lugar, pero evita frases largas.</p>
                          </div>
                        </li>
                      </ol>
                      <hr className="dash-stamp-guide__rule" />
                      <h3>Antes de subirla</h3>
                      <div className="dash-stamp-guide__before">
                      <p>
                        Guárdala en PNG o WEBP, con fondo transparente, formato cuadrado 1:1 y una resolución
                        recomendada de 1000 × 1000 px o superior.
                      </p>
                      <p className="dash-stamp-guide__note">
                        Evita fotografías, fondos visibles, logos demasiado grandes, demasiado texto o imágenes
                        pixeladas.
                      </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
