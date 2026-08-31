import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Panel, StatusDot } from "../../components/admin/Panel";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
} from "../../services/catalog.service";
import { getApiErrorMessage } from "../../utils/api-error";
import type { Category } from "../../types";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setCategories(await getAdminCategories());
  }

  useEffect(() => {
    load().catch((err) => setError(getApiErrorMessage(err, "No se pudieron cargar las categorías")));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name")),
      description: String(form.get("description")),
      status: String(form.get("status")) as "ACTIVE" | "INACTIVE",
    };

    try {
      setSaving(true);
      if (editing) {
        await updateCategory(editing.id, payload);
        setSuccess("Categoría actualizada.");
        setEditing(null);
      } else {
        await createCategory(payload);
        setSuccess("Categoría creada y guardada.");
      }
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-px bg-black xl:grid-cols-2">
      <Panel className="p-8">
        <h2 className="font-serif text-3xl italic">Colección viva</h2>
        <p className="mt-2 text-sm text-neutral-600">
          No se elimina una categoría si ya tiene experiencias asociadas.
        </p>
        <ul className="mt-8 divide-y divide-black">
          {categories.length === 0 && (
            <li className="py-8 text-sm text-neutral-500">Crea la primera a la derecha.</li>
          )}
          {categories.map((category) => (
            <li key={category.id} className="flex items-start justify-between gap-4 py-5">
              <div>
                <p className="font-serif text-2xl">{category.name}</p>
                <p className="mt-1 text-sm text-neutral-600">{category.description}</p>
                <div className="mt-3">
                  <StatusDot active={category.status === "ACTIVE"}>
                    {category.status === "ACTIVE" ? "Activa" : "Inactiva"} · {category._count?.experiences ?? 0} piezas
                  </StatusDot>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-[11px] uppercase tracking-[0.16em]">
                <button type="button" className="underline underline-offset-4" onClick={() => setEditing(category)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="text-neutral-500"
                  onClick={async () => {
                    setError("");
                    setSuccess("");
                    try {
                      await deleteCategory(category.id);
                      setSuccess("Categoría eliminada.");
                      await load();
                    } catch (err) {
                      setError(getApiErrorMessage(err, "No se puede eliminar"));
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel className="p-8">
        <form key={editing?.id ?? "create"} className="space-y-4" onSubmit={onSubmit}>
          <h2 className="font-serif text-3xl italic">{editing ? "Editar" : "Nueva categoría"}</h2>
          <Input name="name" label="Nombre" defaultValue={editing?.name} required />
          <Textarea name="description" label="Descripción" defaultValue={editing?.description ?? ""} />
          <label className="block space-y-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Estado</span>
            <select
              name="status"
              defaultValue={editing?.status ?? "ACTIVE"}
              className="w-full border border-black bg-white px-4 py-3"
            >
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE">Inactiva</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {success && <p className="text-sm text-charcoal">{success}</p>}
          <Button className="w-full bg-charcoal" disabled={saving}>
            {saving ? "Guardando..." : editing ? "Actualizar" : "Crear y guardar"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
