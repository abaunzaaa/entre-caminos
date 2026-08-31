import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Panel } from "../../components/admin/Panel";
import { createPermission, getPermissions } from "../../services/catalog.service";
import type { Permission } from "../../types";

export function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setPermissions(await getPermissions());
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await createPermission(String(form.get("name")));
      event.currentTarget.reset();
      await load();
    } catch {
      setError("No se pudo crear el permiso.");
    }
  }

  return (
    <div className="grid gap-px bg-black lg:grid-cols-[1fr_340px]">
      <Panel className="p-8">
        <h2 className="font-serif text-3xl italic">Claves del sistema</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Identificadores que se asignan a cada rol. Los cambios se ven al instante en Roles.
        </p>
        <ul className="mt-8 divide-y divide-black">
          {permissions.length === 0 && (
            <li className="py-8 text-sm text-neutral-500">Aún no hay permisos.</li>
          )}
          {permissions.map((permission) => (
            <li key={permission.id} className="py-4 font-mono text-sm">
              {permission.name}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel className="p-8">
        <form className="space-y-4" onSubmit={onSubmit}>
          <h2 className="font-serif text-3xl italic">Nuevo permiso</h2>
          <Input name="name" label="Identificador" placeholder="reports.view" required />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <Button className="w-full bg-charcoal">Crear</Button>
        </form>
      </Panel>
    </div>
  );
}
