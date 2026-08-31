import { FormEvent, useEffect, useState } from "react";
import {
  createAdministrator,
  getAdministrators,
  updateAdministrator,
} from "../../services/catalog.service";
import type { PublicUser } from "../../types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Panel, StatusDot } from "../../components/admin/Panel";
import { getApiErrorMessage } from "../../utils/api-error";

export function AdministratorsPage() {
  const [admins, setAdmins] = useState<PublicUser[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setAdmins(await getAdministrators());
  }

  useEffect(() => {
    load().catch(() => setAdmins([]));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      await createAdministrator({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        role: String(form.get("role")) as "ADMIN" | "SUPER_ADMIN",
      });
      event.currentTarget.reset();
      setSuccess("Administrador creado.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo crear"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <form className="grid gap-4 border border-black bg-white p-8 md:grid-cols-2" onSubmit={onSubmit}>
        <h2 className="font-serif text-3xl italic md:col-span-2">Invitar al atelier</h2>
        <Input name="name" label="Nombre" required />
        <Input name="email" type="email" label="Correo" required />
        <Input name="password" type="password" label="Contraseña" required />
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Rol</span>
          <select name="role" className="w-full border border-black bg-white px-4 py-3" defaultValue="ADMIN">
            <option value="ADMIN">Administración</option>
            <option value="SUPER_ADMIN">Super administración</option>
          </select>
        </label>
        <p className="text-xs text-neutral-500 md:col-span-2">
          La contraseña necesita mayúscula, minúscula, número y símbolo. Ejemplo: Caminos#2026
        </p>
        {error && <p className="text-sm text-red-700 md:col-span-2">{error}</p>}
        {success && <p className="text-sm text-charcoal md:col-span-2">{success}</p>}
        <div className="md:col-span-2">
          <Button className="bg-charcoal" disabled={saving}>
            {saving ? "Guardando..." : "Invitar administrador"}
          </Button>
        </div>
      </form>

      <div className="grid gap-px bg-black md:grid-cols-2">
        {admins.map((admin) => (
          <Panel key={admin.id} className="flex items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-black font-serif text-xl italic">
                {admin.name.slice(0, 1)}
              </span>
              <div>
                <p className="font-serif text-2xl">{admin.name}</p>
                <p className="text-sm text-neutral-500">{admin.email}</p>
                <div className="mt-2 flex gap-2">
                  <StatusDot active>{admin.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}</StatusDot>
                  <StatusDot active={admin.status === "ACTIVE"}>
                    {admin.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  </StatusDot>
                </div>
              </div>
            </div>
            {admin.status === "ACTIVE" ? (
              <button
                type="button"
                className="text-[11px] uppercase tracking-[0.16em] underline underline-offset-4"
                onClick={() => updateAdministrator(admin.id, { status: "INACTIVE" }).then(load)}
              >
                Desactivar
              </button>
            ) : (
              <button
                type="button"
                className="text-[11px] uppercase tracking-[0.16em] underline underline-offset-4"
                onClick={() => updateAdministrator(admin.id, { status: "ACTIVE" }).then(load)}
              >
                Activar
              </button>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
