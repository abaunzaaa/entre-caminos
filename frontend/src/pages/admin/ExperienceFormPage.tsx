import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import {
  createExperience,
  getAdminCategories,
  getAdminExperience,
  updateExperience,
  uploadImage,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { EXPERIENCE_SPARKS, LOCATION_PRESETS, mediaUrl } from "../../utils/media";
import { formatPrice } from "../../utils/cn";
import type { Category, ExperienceStatus } from "../../types";
import expeIlus from "../../assets/expe-agregadas.png";
import "../../styles/admin-access.css";

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "En revisión",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};

const STATUSES = Object.keys(STATUS_LABEL) as ExperienceStatus[];

export function ExperienceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<ExperienceStatus>("DRAFT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("120000");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAdminCategories()
      .then((list) => {
        setCategories(list);
        if (!id && list[0]) {
          setCategoryId(list[0].id);
        }
      })
      .catch(() => setCategories([]));
    if (id) {
      getAdminExperience(id)
        .then((experience) => {
          setTitle(experience.title);
          setDescription(experience.description);
          setCategoryId(experience.categoryId);
          setPrice(String(experience.price));
          setLocation(experience.location);
          setLatitude(experience.latitude ? String(experience.latitude) : "");
          setLongitude(experience.longitude ? String(experience.longitude) : "");
          setImageUrl(experience.imageUrl ?? "");
          setStatus(experience.status);
        })
        .catch((err) => setError(getApiErrorMessage(err, "No se pudo cargar")));
    }
  }, [id]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!categoryRef.current?.contains(target)) {
        setCategoryOpen(false);
      }
      if (!statusRef.current?.contains(target)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const categoryName = useMemo(
    () => categories.find((item) => item.id === categoryId)?.name ?? "Seleccionar categoría",
    [categories, categoryId],
  );

  async function onFile(file: File) {
    setError("");
    setUploading(true);
    try {
      setImageUrl(await uploadImage(file));
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo subir la imagen"));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const payload = {
      title,
      description,
      categoryId,
      price: Number(price),
      location,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      imageUrl: imageUrl || null,
      status,
    };
    try {
      setSaving(true);
      if (id) {
        await updateExperience(id, payload);
      } else {
        await createExperience(payload);
      }
      navigate("/admin/experiencias");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dash dash--exps">
      <article className="dash-profile">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">{id ? "Editar experiencia" : "Crear experiencia"}</h1>
            <p className="dash-profile__row">
              <span>
                {id
                  ? "Actualiza los datos de esta experiencia en el catálogo."
                  : "Completa la información para publicar un nuevo plan en Entre Caminos."}
              </span>
            </p>
          </div>
        </div>
        <div className="dash-access-hero" aria-hidden="true">
          <div className="dash-profile__stat dash-access-hero__frame">
            <img src={expeIlus} alt="" className="dash-profile__stat-art dash-access-hero__art dash-float-art" />
          </div>
        </div>
      </article>

      <section className="dash-exps-studio" aria-label="Formulario de experiencia">
        <section className="dash-split__panel" aria-label="Datos de la experiencia">
          <form className="dash-exps-form" onSubmit={onSubmit}>
            <div className="dash-exps-section">
              <h2 className="dash-section__title">Información básica</h2>
              <p className="dash-section__lead">Nombre, categoría, descripción e imagen de la experiencia.</p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_SPARKS.map((spark) => (
                  <button
                    key={spark.title}
                    type="button"
                    className="admin-chip px-3 py-1.5 text-[13px] font-medium"
                    onClick={() => {
                      setTitle(spark.title);
                      setDescription(spark.description);
                    }}
                  >
                    {spark.title}
                  </button>
                ))}
              </div>
              <Input label="Nombre" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <div className="dash-team-role" ref={categoryRef}>
                <span className="dash-team-role__label">Categoría</span>
                <button
                  type="button"
                  className={`dash-team-role__trigger${categoryOpen ? " is-open" : ""}`}
                  aria-haspopup="listbox"
                  aria-expanded={categoryOpen}
                  onClick={() => setCategoryOpen((open) => !open)}
                >
                  <span>{categoryName}</span>
                  <ChevronDown size={18} strokeWidth={1.7} aria-hidden="true" />
                </button>
                <div className={`dash-team-role__menu${categoryOpen ? " is-open" : ""}`} role="listbox">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      role="option"
                      aria-selected={categoryId === category.id}
                      className={`dash-team-role__option${categoryId === category.id ? " is-active" : ""}`}
                      onClick={() => {
                        setCategoryId(category.id);
                        setCategoryOpen(false);
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                label="Descripción"
                className="dash-exps-desc min-h-0 resize-none overflow-y-auto"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <div
                className={`admin-dropzone dash-exps-dropzone p-8 text-center ${dragOver ? "is-over" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  const file = event.dataTransfer.files[0];
                  if (file) {
                    void onFile(file);
                  }
                }}
              >
                <p className="font-poppins text-xl font-semibold tracking-[-0.02em] text-forest">Imagen</p>
                <p className="mt-2 text-sm text-neutral-600">Arrastra una imagen o elige un archivo</p>
                <p className="text-xs text-neutral-400">JPG, PNG o WebP · máx. 5 MB</p>
                <input
                  className="mt-4 w-full text-sm"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void onFile(file);
                    }
                  }}
                />
                {uploading && <p className="mt-2 text-sm text-neutral-500">Subiendo…</p>}
              </div>
              <Input
                label="URL de imagen (opcional)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="dash-exps-section">
              <h2 className="dash-section__title">Detalles</h2>
              <p className="dash-section__lead">Ubicación, precio y estado de publicación.</p>
              <div>
                <p className="mb-2 text-[13px] font-medium text-neutral-500">Lugar rápido</p>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="admin-chip px-3 py-1.5 text-[13px] font-medium"
                      onClick={() => {
                        setLocation(preset.location);
                        setLatitude(preset.latitude);
                        setLongitude(preset.longitude);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dash-exps-form__grid">
                <Input label="Ubicación" value={location} onChange={(e) => setLocation(e.target.value)} required />
                <Input
                  label="Precio (COP)"
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <Input label="Latitud" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                <Input label="Longitud" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              </div>
              <div className="dash-team-role" ref={statusRef}>
                <span className="dash-team-role__label">Estado</span>
                <button
                  type="button"
                  className={`dash-team-role__trigger${statusOpen ? " is-open" : ""}`}
                  aria-haspopup="listbox"
                  aria-expanded={statusOpen}
                  onClick={() => setStatusOpen((open) => !open)}
                >
                  <span>{STATUS_LABEL[status]}</span>
                  <ChevronDown size={18} strokeWidth={1.7} aria-hidden="true" />
                </button>
                <div className={`dash-team-role__menu${statusOpen ? " is-open" : ""}`} role="listbox">
                  {STATUSES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={status === item}
                      className={`dash-team-role__option${status === item ? " is-active" : ""}`}
                      onClick={() => {
                        setStatus(item);
                        setStatusOpen(false);
                      }}
                    >
                      {STATUS_LABEL[item]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="dash-cats-actions">
              <Button type="submit" disabled={saving || uploading}>
                {saving ? "Guardando..." : id ? "Guardar cambios" : "Crear experiencia"}
              </Button>
              <Link
                to="/admin/experiencias"
                className="admin-cta-hover inline-flex items-center justify-center rounded-full border border-forest/15 bg-white px-[22px] py-2 font-poppins text-[13.5px] font-medium tracking-[0.03em] text-ink"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </section>

        <aside className="dash-split__panel dash-exps-preview" aria-label="Vista previa">
          <p className="dash-section__lead">Vista previa</p>
          <div className="dash-exps-preview__frame">
            <img src={mediaUrl(imageUrl)} alt="" />
          </div>
          <div className="dash-exps-preview__body">
            <p className="dash-team-card__email">
              {location || "Ubicación"} · {categoryName}
            </p>
            <h3>{title || "Nombre de la experiencia"}</h3>
            <p className="dash-exps-preview__brief">
              {description || "La descripción aparecerá aquí mientras escribes."}
            </p>
            <p className="dash-exps-preview__price">{formatPrice(Number(price) || 0)}</p>
            <p className="dash-section__lead">{STATUS_LABEL[status]}</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
