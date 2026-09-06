import { FormEvent, useEffect, useState } from "react";
import { Users } from "lucide-react";
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
import { readAdminAvatar } from "../../utils/admin-avatar";

function roleLabel(role: PublicUser["role"]) {
  if (role === "SUPER_ADMIN") {
    return "Super administrador";
  }
  if (role === "ADMIN") {
    return "Administrador";
  }
  return "Administración";
}

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
    <div className="dash">
      <article className="dash-profile dash-profile--welcome">
        <div className="dash-profile__top">
          <span className="dash-profile__photo" aria-hidden="true">
            <Users strokeWidth={1.6} />
          </span>
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">Equipo administrativo</h1>
            <p className="dash-section__lead">
              Gestiona las personas autorizadas para administrar y mantener Entre Caminos.
            </p>
            <p className="dash-section__lead">
              Administra los accesos del equipo, asigna roles y controla quién puede gestionar la plataforma.
            </p>
          </div>
        </div>
      </article>

      <section className="dash-split__panel" aria-label="Invitar administrador">
        <div>
          <h2 className="dash-section__title">Invitar administrador</h2>
          <p className="dash-section__lead">Suma a una persona con acceso al panel.</p>
        </div>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
          <Input name="name" label="Nombre" required />
          <Input name="email" type="email" label="Correo" required />
          <Input name="password" type="password" label="Contraseña" required />
          <label className="block space-y-2">
            <span className="font-poppins text-[13px] font-medium tracking-normal text-neutral-500">Rol</span>
            <select
              name="role"
              className="w-full rounded-xl border border-forest/10 bg-white px-4 py-3 font-poppins text-[15px] font-normal text-ink outline-none transition focus:ring-2 focus:ring-forest/15"
              defaultValue="ADMIN"
            >
              <option value="ADMIN">Administración</option>
              <option value="SUPER_ADMIN">Super administración</option>
            </select>
          </label>
          <p className="dash-section__lead md:col-span-2">
            La contraseña necesita mayúscula, minúscula, número y símbolo. Ejemplo: Caminos#2026
          </p>
          {error ? <p className="text-sm text-red-700 md:col-span-2">{error}</p> : null}
          {success ? <p className="text-sm text-charcoal md:col-span-2">{success}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Invitar administrador"}
            </Button>
          </div>
        </form>
      </section>

      <section aria-label="Administradores registrados">
        <header className="dash-section__head">
          <div>
            <h2 className="dash-section__title">Administradores registrados</h2>
            <p className="dash-section__lead">Personas con acceso para administrar la plataforma.</p>
          </div>
        </header>
        {admins.length === 0 ? (
          <Panel className="dash-empty">
            <p>No hay administradores registrados.</p>
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {admins.map((admin) => {
              const avatar = readAdminAvatar(admin.id);
              const initial = admin.name.trim().charAt(0).toUpperCase() || "A";
              return (
                <article key={admin.id} className="dash-team-card">
                  <span className="dash-team-card__avatar">
                    {avatar ? <img src={avatar} alt="" /> : initial}
                  </span>
                  <div className="dash-team-card__info">
                    <h3>{admin.name}</h3>
                    <p className="dash-team-card__email">{admin.email}</p>
                    <div className="dash-team-card__facts">
                      <StatusDot active>{roleLabel(admin.role)}</StatusDot>
                      <StatusDot active={admin.status === "ACTIVE"}>
                        {admin.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </StatusDot>
                    </div>
                  </div>
                  {admin.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto shrink-0"
                      onClick={() => updateAdministrator(admin.id, { status: "INACTIVE" }).then(load)}
                    >
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto shrink-0"
                      onClick={() => updateAdministrator(admin.id, { status: "ACTIVE" }).then(load)}
                    >
                      Activar
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
