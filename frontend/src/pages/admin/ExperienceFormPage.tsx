import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, ImagePlus, MapPin, X } from "lucide-react";
import { ExperienceLocationMap } from "../../components/admin/ExperienceLocationMap";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import {
  COLOMBIA_DEPARTMENTS,
  composeLocation,
  findDepartment,
  parseStoredLocation,
} from "../../data/colombia-locations";
import {
  createExperience,
  getAdminCategories,
  getAdminExperience,
  updateExperience,
  uploadImage,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { experienceImages, mediaUrl } from "../../utils/media";
import { geocodeColombia } from "../../utils/geocode";
import type { Category, ExperienceStatus } from "../../types";
import superadmIlus2 from "../../assets/superadm-ilus2.png";
import "../../styles/admin-access.css";

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "En revisión",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};

const STATUSES = Object.keys(STATUS_LABEL) as ExperienceStatus[];

function FieldPicker({
  label,
  value,
  placeholder,
  options,
  disabled,
  searchable,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  disabled?: boolean;
  searchable?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, query]);

  const exactMatch = options.some((option) => option.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className={`dash-team-role${disabled ? " is-disabled" : ""}`} ref={rootRef}>
      <span className="dash-team-role__label">{label}</span>
      <button
        type="button"
        className={`dash-team-role__trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }
          setOpen((current) => !current);
          setQuery("");
        }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={18} strokeWidth={1.7} aria-hidden="true" />
      </button>
      <div className={`dash-team-role__menu${open ? " is-open" : ""}`} role="listbox">
        {searchable ? (
          <input
            className="dash-exps-picker__search"
            type="search"
            value={query}
            placeholder="Buscar"
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}
        {visible.map((option) => (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={value === option}
            className={`dash-team-role__option${value === option ? " is-active" : ""}`}
            onClick={() => {
              onChange(option);
              setOpen(false);
            }}
          >
            {option}
          </button>
        ))}
        {searchable && query.trim() && !exactMatch ? (
          <button
            type="button"
            role="option"
            className="dash-team-role__option"
            onClick={() => {
              onChange(query.trim());
              setOpen(false);
            }}
          >
            Usar “{query.trim()}”
          </button>
        ) : null}
        {visible.length === 0 && !(searchable && query.trim()) ? (
          <p className="dash-exps-picker__empty">No hay coincidencias.</p>
        ) : null}
      </div>
    </div>
  );
}

export function ExperienceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<ExperienceStatus>("DRAFT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [department, setDepartment] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [pinAdjusted, setPinAdjusted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedDepartment = findDepartment(department);
  const cityOptions = selectedDepartment?.cities ?? [];
  const locationLabel = composeLocation(address, municipality, department);
  const latNumber = latitude ? Number(latitude) : null;
  const lngNumber = longitude ? Number(longitude) : null;
  const hasMapPoint = Number.isFinite(latNumber) && Number.isFinite(lngNumber);
  const mapZoom = address.trim() ? 16 : municipality.trim() ? 13 : department ? 8 : 6;

  const categoryName = useMemo(
    () => categories.find((item) => item.id === categoryId)?.name ?? "",
    [categories, categoryId],
  );

  useEffect(() => {
    getAdminCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    if (id) {
      getAdminExperience(id)
        .then((experience) => {
          const parsed = parseStoredLocation(experience.location);
          setTitle(experience.title);
          setDescription(experience.description);
          setCategoryId(experience.categoryId);
          setPrice(String(experience.price));
          setDepartment(parsed.department);
          setMunicipality(parsed.municipality);
          setAddress(parsed.address);
          setLatitude(experience.latitude ? String(experience.latitude) : "");
          setLongitude(experience.longitude ? String(experience.longitude) : "");
          setImageUrls(experienceImages(experience));
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

  useEffect(() => {
    if (!department || pinAdjusted) {
      return;
    }
    const fallback = selectedDepartment;
    if (fallback && !municipality.trim() && !address.trim()) {
      setLatitude(String(fallback.lat));
      setLongitude(String(fallback.lng));
    }
    let cancelled = false;
    const query = composeLocation(address, municipality, department);
    const timer = window.setTimeout(() => {
      void geocodeColombia(query).then((point) => {
        if (!cancelled && point) {
          setLatitude(String(point.lat));
          setLongitude(String(point.lng));
        }
      });
    }, address.trim() ? 700 : 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, department, municipality, pinAdjusted, selectedDepartment]);

  async function onFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) {
      return;
    }
    setError("");
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        uploaded.push(await uploadImage(file));
      }
      setImageUrls((current) => [...current, ...uploaded].slice(0, 12));
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo subir la imagen"));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!categoryId) {
      setError("Selecciona una categoría.");
      return;
    }
    if (!department || !municipality || !address.trim()) {
      setError("Completa departamento, municipio y dirección.");
      return;
    }
    const payload = {
      title,
      description,
      categoryId,
      price: Number(price),
      location: locationLabel,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      imageUrl: imageUrls[0] || null,
      imageUrls,
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
            <img src={superadmIlus2} alt="" className="dash-profile__stat-art dash-access-hero__art dash-float-art" />
          </div>
        </div>
      </article>

      <section className="dash-exps-studio" aria-label="Formulario de experiencia">
        <aside className="dash-split__panel dash-exps-mapcard" aria-label="Ubicación en el mapa">
          <div className="dash-exps-mapwrap">
            <ExperienceLocationMap
              latitude={hasMapPoint ? latNumber : selectedDepartment?.lat ?? 4.570868}
              longitude={hasMapPoint ? lngNumber : selectedDepartment?.lng ?? -74.297333}
              zoom={mapZoom}
              onChange={(nextLat, nextLng) => {
                setLatitude(String(nextLat));
                setLongitude(String(nextLng));
                setPinAdjusted(true);
              }}
            />
            <p className="dash-exps-map__hint">
              <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>Confirma la ubicación de la experiencia. Puedes mover el marcador en el mapa para ajustar el punto exacto.</span>
            </p>
          </div>
        </aside>

        <form className="dash-split__panel dash-exps-formcard" onSubmit={onSubmit}>
          <div className="dash-exps-section">
            <h2 className="dash-section__title">Información básica</h2>
            <p className="dash-section__lead">Completa los datos de la experiencia y confirma su ubicación en el mapa.</p>
            <div className="dash-exps-form__grid">
              <Input
                label="Nombre de experiencia"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre de la experiencia"
                required
              />
              <div className="dash-team-role" ref={categoryRef}>
                <span className="dash-team-role__label">Categoría</span>
                <button
                  type="button"
                  className={`dash-team-role__trigger${categoryOpen ? " is-open" : ""}`}
                  aria-haspopup="listbox"
                  aria-expanded={categoryOpen}
                  onClick={() => setCategoryOpen((open) => !open)}
                >
                  <span>{categoryName || "Seleccionar categoría"}</span>
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
              <FieldPicker
                label="Departamento"
                value={department}
                placeholder="Seleccionar departamento"
                options={COLOMBIA_DEPARTMENTS.map((item) => item.name)}
                searchable
                onChange={(value) => {
                  setDepartment(value);
                  setMunicipality("");
                  setPinAdjusted(false);
                }}
              />
              <FieldPicker
                label="Municipio / ciudad"
                value={municipality}
                placeholder={department ? "Seleccionar municipio o ciudad" : "Primero elige un departamento"}
                options={cityOptions}
                disabled={!department}
                searchable
                onChange={(value) => {
                  setMunicipality(value);
                  setPinAdjusted(false);
                }}
              />
            </div>
            <Input
              label="Dirección exacta"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setPinAdjusted(false);
              }}
              placeholder="Calle, carrera, vereda o punto de referencia"
              required
            />
            <Textarea
              label="Descripción"
              className="dash-exps-desc min-h-0 resize-none overflow-y-auto"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la experiencia, el recorrido y lo que incluye."
              required
            />
            <div
              className={`admin-dropzone dash-exps-dropzone${dragOver ? " is-over" : ""}${uploading ? " is-busy" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOver(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                if (event.dataTransfer.files.length) {
                  void onFiles(event.dataTransfer.files);
                }
              }}
            >
              <button
                type="button"
                className="dash-exps-dropzone__hit"
                disabled={uploading}
                aria-label="Agregar imágenes de la experiencia"
                onClick={() => imageInputRef.current?.click()}
              >
                <span className="dash-exps-dropzone__icon" aria-hidden="true">
                  <ImagePlus size={22} strokeWidth={1.75} />
                </span>
                <span className="dash-exps-dropzone__copy">
                  <span className="dash-exps-dropzone__title">Agrega imágenes de tu experiencia</span>
                  <span className="dash-exps-dropzone__lead">
                    Sube una o varias fotos para mostrar mejor esta experiencia
                  </span>
                  <span className="dash-exps-dropzone__hint">
                    Formatos permitidos: JPG, PNG o WebP · Máximo 5 MB cada una
                  </span>
                  {uploading ? <span className="dash-exps-dropzone__status">Subiendo…</span> : null}
                </span>
              </button>
              <input
                ref={imageInputRef}
                className="dash-exps-dropzone__input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void onFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              {imageUrls.length ? (
                <ul className="dash-exps-thumbs">
                  {imageUrls.map((url) => (
                    <li key={url} className="dash-exps-thumbs__item">
                      <img src={mediaUrl(url)} alt="" />
                      <button
                        type="button"
                        className="dash-exps-thumbs__remove"
                        aria-label="Quitar imagen"
                        onClick={() => setImageUrls((current) => current.filter((item) => item !== url))}
                      >
                        <X size={12} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="dash-exps-form__grid">
              <Input
                label="Precio (COP)"
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                required
              />
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
    </div>
  );
}
