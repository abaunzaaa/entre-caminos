import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Clock, ImagePlus, MapPin, Plus, X } from "lucide-react";
import { ExperienceLocationMap } from "../../components/admin/ExperienceLocationMap";
import { SuccessConfirm } from "../../components/feedback/SuccessConfirm";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import {
  COLOMBIA_DEPARTMENTS,
  composeLocation,
  findDepartment,
  findMunicipality,
  isValidDepartmentMunicipality,
  parseStoredLocation,
} from "../../data/colombia-locations";
import {
  createExperience,
  getAdminExperience,
  getPublicCategories,
  submitExperience,
  updateExperience,
  uploadImage,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { experienceImages, mediaUrl } from "../../utils/media";
import { geocodeColombiaLocation, reverseGeocodeColombia } from "../../utils/geocode";
import {
  AVAILABILITY_TYPES,
  DURATION_UNITS,
  WEEKDAYS,
  availabilityLabel,
  parseAvailability,
  parseDurationFields,
  type DurationUnit,
  type ExperienceAvailability,
} from "../../utils/experience-details";
import type { Category, ExperienceStatus } from "../../types";
import superadmIlus2 from "../../assets/superadm-ilus2.png";
import "../../styles/admin-access.css";

const MIN_EXPERIENCE_IMAGES = 5;
const MIN_EXPERIENCE_IMAGES_MESSAGE = "Agrega al menos 5 imágenes para continuar.";
const EMPTY_CITIES: string[] = [];

function ExperienceImagesHint({ uploading }: { uploading?: boolean }) {
  return (
    <>
      <span className="dash-exps-dropzone__hint">Mínimo 5 imágenes</span>
      {uploading ? <span className="dash-exps-dropzone__status">Subiendo…</span> : null}
    </>
  );
}

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
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery("");
    }
  }, [disabled]);

  useEffect(() => {
    setQuery("");
  }, [options]);

  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus();
    }
  }, [open, searchable]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(term));
  }, [options, query]);

  return (
    <div className={`dash-team-role${disabled ? " is-disabled" : ""}${open ? " is-open" : ""}`} ref={rootRef}>
      <span className="dash-team-role__label">{label}</span>
      <button
        type="button"
        className={`dash-team-role__trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
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
            ref={searchRef}
            className="dash-exps-picker__search"
            type="search"
            value={query}
            placeholder="Buscar"
            onChange={(event) => setQuery(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        ) : null}
        <div className="dash-exps-picker__list">
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
                setQuery("");
              }}
            >
              {option}
            </button>
          ))}
          {visible.length === 0 ? (
            <p className="dash-exps-picker__empty">No hay coincidencias.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ExperienceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const canReview = hasPermission("experiences.review");
  const isAdministrator = user?.role === "ADMIN";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdOpen, setCreatedOpen] = useState(false);
  const [createdPendingReview, setCreatedPendingReview] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<ExperienceStatus>("PENDING");
  const [rejectionReason, setRejectionReason] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [department, setDepartment] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("HOURS");
  const [availability, setAvailability] = useState<ExperienceAvailability>({ type: "EVERY_DAY" });
  const [nextDate, setNextDate] = useState("");
  const [howToGetThere, setHowToGetThere] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geocodedLabel, setGeocodedLabel] = useState("");
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "searching" | "exact" | "missing" | "manual">("idle");
  const [dragOver, setDragOver] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const reverseSeq = useRef(0);
  const geocodeTrigger = useRef<"user" | "pin" | "load">("user");
  const locationRef = useRef({ municipality: "", department: "" });
  locationRef.current = { municipality, department };

  const selectedDepartment = findDepartment(department);
  const cityOptions = selectedDepartment?.cities ?? EMPTY_CITIES;
  const locationLabel = composeLocation(address, municipality, department);
  const latNumber = latitude ? Number(latitude) : null;
  const lngNumber = longitude ? Number(longitude) : null;
  const hasMapPoint = Number.isFinite(latNumber) && Number.isFinite(lngNumber);
  const mapZoom = geocodeStatus === "exact" || geocodeStatus === "manual" ? 17 : address.trim() ? 16 : municipality.trim() ? 13 : department ? 8 : 6;

  const selectableCategories = useMemo(
    () => categories.filter((item) => item.status === "APPROVED" || item.id === categoryId),
    [categories, categoryId],
  );
  const categoryName = useMemo(
    () => selectableCategories.find((item) => item.id === categoryId)?.name ?? "",
    [selectableCategories, categoryId],
  );
  const categoryOptions = useMemo(
    () => selectableCategories.map((item) => item.name),
    [selectableCategories],
  );

  useEffect(() => {
    let cancelled = false;
    getPublicCategories()
      .then((items) => {
        if (!cancelled) {
          setCategories(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (id) {
      getAdminExperience(id)
        .then((experience) => {
          const parsed = parseStoredLocation(experience.location);
          const loadedDepartment = findDepartment(parsed.department)?.name ?? "";
          const loadedMunicipality = loadedDepartment
            ? findMunicipality(loadedDepartment, parsed.municipality)
            : "";
          setTitle(experience.title);
          setDescription(experience.description);
          setCategoryId(experience.categoryId);
          setPrice(String(experience.price));
          setDepartment(loadedDepartment);
          setMunicipality(loadedMunicipality);
          setAddress(parsed.address);
          setExternalUrl(experience.externalUrl ?? "");
          const parsedDuration = parseDurationFields(experience);
          setDurationValue(parsedDuration.value);
          setDurationUnit(parsedDuration.unit);
          setAvailability(parseAvailability(experience.availability));
          setHowToGetThere(experience.howToGetThere ?? "");
          geocodeTrigger.current = "load";
          setLatitude(experience.latitude ? String(experience.latitude) : "");
          setLongitude(experience.longitude ? String(experience.longitude) : "");
          setGeocodeStatus(experience.latitude && experience.longitude ? "manual" : "idle");
          setGeocodedLabel("");
          setImageUrls(experienceImages(experience));
          setStatus(experience.status);
          setRejectionReason(experience.rejectionReason ?? "");
        })
        .catch((err) => setError(getApiErrorMessage(err, "No se pudo cargar")));
    }
  }, [id]);

  const applyReverseGeocode = useCallback(async (nextLat: number, nextLng: number) => {
    geocodeTrigger.current = "pin";
    setLatitude(String(nextLat));
    setLongitude(String(nextLng));
    setGeocodeStatus("manual");
    const seq = (reverseSeq.current += 1);
    const match = await reverseGeocodeColombia(nextLat, nextLng);
    if (seq !== reverseSeq.current) {
      return;
    }
    if (!match) {
      const fallback =
        [locationRef.current.municipality, locationRef.current.department].filter(Boolean).join(", ") ||
        `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`;
      setAddress(fallback);
      setGeocodedLabel(fallback);
      return;
    }
    setAddress(match.address);
    if (match.department) {
      const nextDepartment = findDepartment(match.department)?.name ?? "";
      if (nextDepartment) {
        setDepartment(nextDepartment);
        setMunicipality(findMunicipality(nextDepartment, match.municipality));
      }
    } else if (match.municipality) {
      const currentDepartment = locationRef.current.department;
      const nextMunicipality = findMunicipality(currentDepartment, match.municipality);
      if (nextMunicipality) {
        setMunicipality(nextMunicipality);
      }
    }
    setGeocodedLabel(match.label);
  }, []);

  useEffect(() => {
    if (!department) {
      return;
    }
    const fallback = selectedDepartment;
    const street = address.trim();
    if (fallback && !municipality.trim() && !street) {
      setLatitude(String(fallback.lat));
      setLongitude(String(fallback.lng));
      setGeocodedLabel("");
      setGeocodeStatus("idle");
      return;
    }
    if (!street) {
      setGeocodedLabel("");
      setGeocodeStatus("idle");
      if (fallback) {
        setLatitude(String(fallback.lat));
        setLongitude(String(fallback.lng));
      }
      return;
    }
    if (geocodeTrigger.current !== "user") {
      return;
    }
    const searchId = reverseSeq.current;
    let cancelled = false;
    setGeocodedLabel("");
    setGeocodeStatus("searching");
    setLatitude("");
    setLongitude("");
    const timer = window.setTimeout(() => {
      void geocodeColombiaLocation(
        { address: street, municipality, department },
        fallback ? { lat: fallback.lat, lng: fallback.lng } : undefined,
      ).then((match) => {
        if (cancelled || searchId !== reverseSeq.current || geocodeTrigger.current !== "user") {
          return;
        }
        if (match) {
          setLatitude(String(match.lat));
          setLongitude(String(match.lng));
          setGeocodedLabel(match.label);
          setGeocodeStatus("exact");
          return;
        }
        setGeocodedLabel("");
        setGeocodeStatus("missing");
      });
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, department, municipality, selectedDepartment]);

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

  function moveImage(from: number, to: number) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) {
      return;
    }
    setImageUrls((current) => {
      if (from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function persist(submitToReview: boolean) {
    setError("");
    if (!categoryId) {
      setError("Selecciona una categoría.");
      return;
    }
    if (!department || !municipality || !address.trim()) {
      setError("Completa departamento, municipio y dirección.");
      return;
    }
    if (!isValidDepartmentMunicipality(department, municipality)) {
      setError("Selecciona un municipio que pertenezca al departamento.");
      return;
    }
    if (imageUrls.length < MIN_EXPERIENCE_IMAGES) {
      setError(MIN_EXPERIENCE_IMAGES_MESSAGE);
      return;
    }
    if (externalUrl.trim()) {
      const href = /^https?:\/\//i.test(externalUrl.trim()) ? externalUrl.trim() : `https://${externalUrl.trim()}`;
      try {
        const parsed = new URL(href);
        if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname.includes(".")) {
          setError("Ingresa un enlace válido, por ejemplo una página web, WhatsApp o Instagram.");
          return;
        }
      } catch {
        setError("Ingresa un enlace válido, por ejemplo una página web, WhatsApp o Instagram.");
        return;
      }
    }
    if (availability.type === "WEEKDAYS" && availability.days.length === 0) {
      setError("Selecciona al menos un día de la semana.");
      return;
    }
    if (availability.type === "DATES" && availability.dates.length === 0) {
      setError("Agrega al menos una fecha disponible.");
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
      externalUrl: externalUrl.trim() || null,
      durationValue: durationValue ? Number(durationValue) : null,
      durationUnit: durationValue ? durationUnit : null,
      availability,
      howToGetThere: howToGetThere.trim() || null,
      imageUrl: imageUrls[0] || null,
      imageUrls,
    };
    try {
      setSaving(true);
      if (id) {
        await updateExperience(id, payload);
        if (submitToReview && (status === "REJECTED" || status === "DRAFT")) {
          await submitExperience(id);
        }
      } else {
        const created = await createExperience(payload);
        setCreatedPendingReview(created.status === "PENDING");
        setCreatedOpen(true);
        return;
      }
      navigate("/admin/experiencias");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await persist(!id || status === "REJECTED" || status === "DRAFT");
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
                  ? "Actualiza los datos de esta experiencia."
                  : isSuperAdmin
                    ? "Completa la información para publicarla en el catálogo."
                    : "Completa la información para enviarla a revisión."}
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
                reverseSeq.current += 1;
                geocodeTrigger.current = "pin";
                setLatitude(String(nextLat));
                setLongitude(String(nextLng));
                setGeocodeStatus("manual");
              }}
              onMoveEnd={(nextLat, nextLng) => {
                void applyReverseGeocode(nextLat, nextLng);
              }}
            />
            <p className={`dash-exps-map__hint${geocodeStatus === "missing" ? " is-warning" : ""}`}>
              <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>
                {geocodeStatus === "searching"
                  ? "Buscando la nueva dirección…"
                  : geocodeStatus === "missing"
                  ? "No encontramos esa dirección exacta. Mueve el pin al punto correcto para guardar la ubicación."
                  : geocodeStatus === "exact"
                    ? `Dirección encontrada: ${geocodedLabel}. Puedes mover el pin si necesitas un ajuste más preciso.`
                    : geocodeStatus === "manual"
                      ? geocodedLabel
                        ? `Dirección en el pin: ${geocodedLabel}`
                        : "Ubicación ajustada. Estamos buscando la dirección de este punto."
                      : "Confirma la ubicación de la experiencia. Puedes mover el marcador en el mapa para ajustar el punto exacto."}
              </span>
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
              <FieldPicker
                label="Categoría"
                value={categoryName}
                placeholder="Seleccionar categoría"
                options={categoryOptions}
                searchable
                onChange={(value) => {
                  const selected = selectableCategories.find((item) => item.name === value);
                  setCategoryId(selected?.id ?? "");
                }}
              />
              <FieldPicker
                label="Departamento"
                value={department}
                placeholder="Seleccionar departamento"
                options={COLOMBIA_DEPARTMENTS.map((item) => item.name)}
                searchable
                onChange={(value) => {
                  reverseSeq.current += 1;
                  geocodeTrigger.current = "user";
                  setDepartment(findDepartment(value)?.name ?? value);
                  setMunicipality("");
                  setGeocodeStatus("idle");
                  setGeocodedLabel("");
                  setLatitude("");
                  setLongitude("");
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
                  reverseSeq.current += 1;
                  geocodeTrigger.current = "user";
                  setMunicipality(findMunicipality(department, value));
                  setGeocodeStatus("idle");
                  setGeocodedLabel("");
                  setLatitude("");
                  setLongitude("");
                }}
              />
            </div>
            <Input
              label="Dirección exacta"
              value={address}
              onChange={(e) => {
                reverseSeq.current += 1;
                geocodeTrigger.current = "user";
                setAddress(e.target.value);
                setGeocodeStatus("idle");
                setGeocodedLabel("");
                setLatitude("");
                setLongitude("");
              }}
              placeholder="Calle, carrera, vereda o punto de referencia"
              required
            />
            <div className="dash-exps-form__grid dash-exps-form__grid--link">
              <Input
                label="Enlace de la experiencia"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="Página oficial, WhatsApp o Instagram"
              />
              <label className="dash-exps-duration">
                <span className="dash-exps-duration__label">Duración de la actividad</span>
                <input
                  className="dash-exps-duration__value"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  name="durationValue"
                  aria-label="Cantidad de duración"
                  value={durationValue}
                  autoComplete="off"
                  placeholder="2"
                  onKeyDown={(event) => {
                    if (["e", "E", "+", "-", ".", ",", " "].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === "") {
                      setDurationValue("");
                      return;
                    }
                    if (!/^\d{1,3}$/.test(next)) {
                      return;
                    }
                    const amount = Number(next);
                    if (amount >= 1 && amount <= 999) {
                      setDurationValue(String(amount));
                    }
                  }}
                />
              </label>
              <label className="dash-exps-duration">
                <span className="dash-exps-duration__label">Unidad</span>
                <select
                  className="dash-exps-duration__unit"
                  name="durationUnit"
                  aria-label="Unidad de tiempo"
                  value={durationUnit}
                  onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
                >
                  {DURATION_UNITS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <FieldPicker
              label="Próximas fechas / disponibilidad"
              value={availabilityLabel(availability.type)}
              placeholder="Selecciona la disponibilidad"
              options={AVAILABILITY_TYPES.map((item) => item.label)}
              onChange={(label) => {
                const next = AVAILABILITY_TYPES.find((item) => item.label === label)?.id ?? "EVERY_DAY";
                if (next === "WEEKDAYS") {
                  setAvailability({
                    type: "WEEKDAYS",
                    days: availability.type === "WEEKDAYS" ? availability.days : [],
                  });
                  return;
                }
                if (next === "DATES") {
                  setAvailability({
                    type: "DATES",
                    dates: availability.type === "DATES" ? availability.dates : [],
                  });
                  return;
                }
                setAvailability({ type: "EVERY_DAY" });
              }}
            />
            {availability.type === "WEEKDAYS" ? (
              <div className="dash-exps-days" role="group" aria-label="Días de la semana">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={availability.days.includes(day) ? "is-active" : ""}
                    onClick={() => {
                      const selected = availability.days.includes(day)
                        ? availability.days.filter((item) => item !== day)
                        : [...availability.days, day];
                      setAvailability({
                        type: "WEEKDAYS",
                        days: WEEKDAYS.filter((item) => selected.includes(item)),
                      });
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            ) : null}
            {availability.type === "DATES" ? (
              <div className="dash-exps-dates">
                <div className="dash-exps-dates__row">
                  <Input
                    label="Fecha"
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                  />
                  <button
                    type="button"
                    className="dash-exps-dates__add"
                    onClick={() => {
                      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || availability.dates.includes(nextDate)) {
                        return;
                      }
                      setAvailability({
                        type: "DATES",
                        dates: [...availability.dates, nextDate].sort(),
                      });
                      setNextDate("");
                    }}
                  >
                    Agregar fecha
                  </button>
                </div>
                {availability.dates.length ? (
                  <div className="dash-exps-dates__chips">
                    {availability.dates.map((date) => {
                      const [year, month, day] = date.split("-");
                      return (
                        <span key={date} className="dash-exps-dates__chip">
                          {`${day}/${month}/${year}`}
                          <button
                            type="button"
                            aria-label={`Quitar ${date}`}
                            onClick={() =>
                              setAvailability({
                                type: "DATES",
                                dates: availability.dates.filter((item) => item !== date),
                              })
                            }
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
            <Textarea
              label="Cómo llegar"
              value={howToGetThere}
              onChange={(e) => setHowToGetThere(e.target.value)}
              placeholder="Ruta recomendada, transporte público cercano, punto de referencia e indicaciones adicionales."
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
              className={`admin-dropzone dash-exps-dropzone${imageUrls.length ? " is-gallery" : ""}${dragOver ? " is-over" : ""}${uploading ? " is-busy" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (event.dataTransfer.types.includes("Files")) {
                  setDragOver(true);
                }
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOver(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                setDraggingIndex(null);
                setOverIndex(null);
                if (event.dataTransfer.files.length) {
                  void onFiles(event.dataTransfer.files);
                }
              }}
            >
              {imageUrls.length === 0 ? (
                <button
                  type="button"
                  className="dash-exps-dropzone__hit"
                  disabled={uploading}
                  aria-label="Agregar imágenes"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <span className="dash-exps-dropzone__icon" aria-hidden="true">
                    <ImagePlus size={22} strokeWidth={1.75} />
                  </span>
                  <span className="dash-exps-dropzone__copy">
                    <span className="dash-exps-dropzone__title">Agrega imágenes</span>
                    <span className="dash-exps-dropzone__lead">Las mejores experiencias tienen 5 fotos o más.</span>
                    <ExperienceImagesHint uploading={uploading} />
                  </span>
                </button>
              ) : (
                <>
                <ul className="dash-exps-thumbs">
                  {imageUrls.map((url, index) => (
                    <li
                      key={url}
                      aria-label={index === 0 ? "Imagen principal" : `Imagen ${index + 1}`}
                      className={`dash-exps-thumbs__item${draggingIndex === index ? " is-dragging" : ""}${overIndex === index ? " is-over" : ""}`}
                      draggable={!uploading}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(index));
                        setDraggingIndex(index);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                        if (overIndex !== index) {
                          setOverIndex(index);
                        }
                      }}
                      onDragLeave={() => {
                        setOverIndex((current) => (current === index ? null : current));
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDragOver(false);
                        if (event.dataTransfer.files.length) {
                          void onFiles(event.dataTransfer.files);
                        } else {
                          moveImage(Number(event.dataTransfer.getData("text/plain")), index);
                        }
                        setDraggingIndex(null);
                        setOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggingIndex(null);
                        setOverIndex(null);
                      }}
                    >
                      <img src={mediaUrl(url)} alt="" draggable={false} />
                      {index === 0 ? <span className="dash-exps-thumbs__badge">Principal</span> : null}
                      <button
                        type="button"
                        className="dash-exps-thumbs__remove"
                        aria-label="Quitar imagen"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => setImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <X size={12} strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                  {imageUrls.length < 12 ? (
                    <li
                      className="dash-exps-thumbs__item dash-exps-thumbs__add"
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDragOver(false);
                        if (event.dataTransfer.files.length) {
                          void onFiles(event.dataTransfer.files);
                        } else {
                          moveImage(Number(event.dataTransfer.getData("text/plain")), imageUrls.length - 1);
                        }
                        setDraggingIndex(null);
                        setOverIndex(null);
                      }}
                    >
                      <button
                        type="button"
                        disabled={uploading}
                        aria-label="Agregar más imágenes"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        {uploading ? "…" : <Plus size={22} strokeWidth={1.9} aria-hidden="true" />}
                      </button>
                    </li>
                  ) : null}
                </ul>
                <div className="dash-exps-dropzone__meta">
                  <ExperienceImagesHint uploading={uploading} />
                </div>
              </>
              )}
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
            </div>
          </div>
          {status === "REJECTED" && rejectionReason ? (
            <p className="dash-exps-reject" role="status">
              Esta experiencia fue rechazada. Motivo: {rejectionReason}
            </p>
          ) : null}
          {id && isAdministrator && status === "PENDING" ? (
            <p className="dash-exps-pending" role="status">
              <Clock size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>Tu experiencia está en revisión y aún no es visible en el catálogo.</span>
            </p>
          ) : null}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="dash-cats-actions">
            {id && (status === "REJECTED" || status === "DRAFT") ? (
              <>
                <Button type="button" variant="secondary" disabled={saving || uploading} onClick={() => void persist(false)}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button type="submit" disabled={saving || uploading}>
                  {saving ? "Enviando..." : "Enviar nuevamente a revisión"}
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={saving || uploading || Boolean(id && status === "PUBLISHED" && !canReview)}>
                {saving ? "Guardando..." : id ? "Guardar cambios" : isSuperAdmin ? "Publicar experiencia" : "Enviar a revisión"}
              </Button>
            )}
            <Link
              to="/admin/experiencias"
              className="admin-cta-hover inline-flex items-center justify-center rounded-full border border-forest/15 bg-white px-[22px] py-2 font-poppins text-[13.5px] font-medium tracking-[0.03em] text-ink"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </section>

      <SuccessConfirm
        open={createdOpen}
        variant="experience"
        title="Experiencia creada correctamente"
        text={
          createdPendingReview
            ? "La experiencia quedó pendiente de revisión."
            : "La experiencia ya está publicada en el catálogo."
        }
        onClose={() => {
          setCreatedOpen(false);
          navigate("/admin/experiencias");
        }}
      />
    </div>
  );
}
