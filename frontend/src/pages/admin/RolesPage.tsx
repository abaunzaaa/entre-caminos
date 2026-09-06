import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assignRolePermissions, getPermissions, getRoles } from "../../services/catalog.service";
import type { Permission, Role } from "../../types";
import { Panel } from "../../components/admin/Panel";

const ROLE_COPY: Record<string, string> = {
  SUPER_ADMIN: "Acceso total al atelier.",
  ADMIN: "Catálogo y operación diaria.",
  USER: "Viajero registrado. Sin panel.",
};

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [nextRoles, nextPermissions] = await Promise.all([getRoles(), getPermissions()]);
    setRoles(nextRoles);
    setPermissions(nextPermissions);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function toggle(role: Role, permissionId: string) {
    setError("");
    const current = role.permissions.map((item) => item.permission.id);
    const permissionIds = current.includes(permissionId)
      ? current.filter((id) => id !== permissionId)
      : [...current, permissionId];
    if (permissionIds.length === 0) {
      setError("Un rol administrativo necesita al menos un permiso.");
      return;
    }
    const updated = await assignRolePermissions(role.id, permissionIds);
    setRoles((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <section className="space-y-6">
      <p className="text-sm text-neutral-600">
        SUPER_ADMIN, ADMIN y USER. Los cambios se guardan al instante.{" "}
        <Link to="/admin/permissions" className="underline underline-offset-4">
          Gestionar identificadores
        </Link>
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="space-y-4">
        {roles.map((role) => (
          <Panel key={role.id} className="p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-poppins text-3xl font-semibold tracking-[-0.02em] text-forest">{role.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{ROLE_COPY[role.name] ?? "Rol personalizado."}</p>
              </div>
              <span className="text-[13px] font-medium text-neutral-400">
                {role._count?.users ?? 0} personas
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {permissions.map((permission) => {
                const active = role.permissions.some((item) => item.permission.id === permission.id);
                return (
                  <button
                    key={permission.id}
                    type="button"
                    disabled={role.name === "USER"}
                    onClick={() => toggle(role, permission.id)}
                    className={`admin-chip px-3 py-1.5 text-[13px] font-medium ${
                      active ? "is-active" : ""
                    }`}
                  >
                    {permission.name}
                  </button>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}
