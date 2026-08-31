import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Panel } from "../../components/admin/Panel";
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

const STATUS_LABEL: Record<ExperienceStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "En revisión",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};

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

  const categoryName = useMemo(
    () => categories.find((item) => item.id === categoryId)?.name ?? "Experiencia",
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
    <div className="grid gap-px bg-black xl:grid-cols-[1.15fr_0.85fr]">
      <Panel className="p-8 md:p-10">
        <form className="space-y-6" onSubmit={onSubmit}>
          <p className="text-sm text-neutral-600">
            Todo se guarda en la base. Al publicar, la pieza entra a la vitrina y a Explorar.
          </p>

          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_SPARKS.map((spark) => (
              <button
                key={spark.title}
                type="button"
                className="border border-black px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] hover:bg-charcoal hover:text-white"
                onClick={() => {
                  setTitle(spark.title);
                  setDescription(spark.description);
                }}
              >
                {spark.title}
              </button>
            ))}
          </div>

          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} required />

          <label className="block space-y-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Categoría</span>
            <select
              className="w-full border border-black bg-white px-4 py-3"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Seleccionar</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-neutral-500">Lugar rápido</p>
            <div className="flex flex-wrap gap-2">
              {LOCATION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="border border-black px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] hover:bg-sand"
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

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Precio (COP)" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <Input label="Ubicación" value={location} onChange={(e) => setLocation(e.target.value)} required />
            <Input label="Latitud" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            <Input label="Longitud" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>

          <div
            className={`border border-dashed p-8 text-center transition ${
              dragOver ? "border-black bg-sand" : "border-black/40"
            }`}
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
            <p className="font-serif text-2xl italic">Fotografía</p>
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

          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-neutral-500">Estado</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABEL) as ExperienceStatus[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.14em] ${
                    status === item ? "bg-charcoal text-white" : "border border-black text-ink"
                  }`}
                  onClick={() => setStatus(item)}
                >
                  {STATUS_LABEL[item]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          <Button className="w-full bg-charcoal" disabled={saving || uploading}>
            {saving ? "Guardando..." : "Guardar publicación"}
          </Button>
        </form>
      </Panel>

      <aside className="bg-white">
        <p className="border-b border-black px-8 py-4 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
          Vista previa
        </p>
        <img src={mediaUrl(imageUrl)} alt="" className="aspect-[4/5] w-full object-cover" />
        <div className="space-y-3 border-t border-black p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            {location || "Ubicación"} · {categoryName}
          </p>
          <h3 className="font-serif text-3xl italic leading-tight">{title || "Título de la experiencia"}</h3>
          <p className="line-clamp-5 text-sm leading-6 text-neutral-600">
            {description || "La descripción aparecerá aquí mientras escribes."}
          </p>
          <p className="font-serif text-xl">{formatPrice(Number(price) || 0)}</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">{STATUS_LABEL[status]}</p>
        </div>
      </aside>
    </div>
  );
}
