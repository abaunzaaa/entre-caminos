import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  createAdministrator,
  deleteAdministrator,
  getAdministrators,
  updateAdministrator,
} from "../../services/catalog.service";
import type { PublicUser } from "../../types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CountUp } from "../../components/admin/CountUp";
import { Panel, StatusDot } from "../../components/admin/Panel";
import { TeamInviteCarousel } from "../../components/admin/TeamInviteCarousel";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/api-error";
import { readAdminAvatar } from "../../utils/admin-avatar";
import adminIlus from "../../assets/admin-ilus.png";
import superadmIlus from "../../assets/superadm-ilus.png";

function readRole(value: unknown): PublicUser["role"] | "" {
  if (typeof value === "string") {
    return value as PublicUser["role"];
  }
  if (value && typeof value === "object" && "name" in value && typeof (value as { name: unknown }).name === "string") {
    return (value as { name: PublicUser["role"] }).name;
  }
  return "";
}

function roleLabel(role: PublicUser["role"]) {
  if (role === "SUPER_ADMIN") {
    return "Super administrador";
  }
  if (role === "ADMIN") {
    return "Administrador";
  }
  return "Administración";
}

function countActiveByRole(users: PublicUser[], role: PublicUser["role"]) {
  return users.filter((user) => user.status === "ACTIVE" && readRole(user.role) === role).length;
}

type FilterMenuOption<T extends string> = { value: T; label: string };

function FilterMenu<T extends string>({
  label,
  active,
  open,
  options,
  onToggle,
  onSelect,
}: {
  label: string;
  active: boolean;
  open: boolean;
  options: FilterMenuOption<T>[];
  onToggle: () => void;
  onSelect: (value: T) => void;
}) {
  return (
    <div className={`dash-team-filters__menuwrap${active || open ? " is-active" : ""}`}>
      <button
        type="button"
        className="dash-team-filters__chip dash-team-filters__trigger"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{label}</span>
        <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div className={`dash-team-filters__menu${open ? " is-open" : ""}`} role="listbox">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="dash-team-filters__option"
            role="option"
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AdministratorsPage() {
  const { user, hasPermission } = useAuth();
  const canManageAdmins = hasPermission("admins.manage");
  const [admins, setAdmins] = useState<PublicUser[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "INACTIVE">("all");
  const [roleFilter, setRoleFilter] = useState<"" | "ADMIN" | "SUPER_ADMIN">("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");

  const [inviteRole, setInviteRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [inviteRoleOpen, setInviteRoleOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"role" | "sort" | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<PublicUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PublicUser | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const inviteRoleRef = useRef<HTMLDivElement>(null);

  async function load() {
    setAdmins(await getAdministrators());
  }

  useEffect(() => {
    load().catch(() => setAdmins([]));
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!filtersRef.current?.contains(target)) {
        setOpenMenu(null);
      }
      if (!inviteRoleRef.current?.contains(target)) {
        setInviteRoleOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!pendingDeactivate && !pendingDelete) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !statusBusyId && !deleteBusy) {
        setPendingDeactivate(null);
        setPendingDelete(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingDeactivate, pendingDelete, statusBusyId, deleteBusy]);

  async function changeAdminStatus(admin: PublicUser, status: "ACTIVE" | "INACTIVE") {
    setStatusBusyId(admin.id);
    try {
      const updated = await updateAdministrator(admin.id, { status });
      const nextStatus = updated?.status ?? status;
      setAdmins((current) =>
        current.map((item) =>
          item.id === admin.id ? { ...item, ...(updated ?? {}), status: nextStatus } : item,
        ),
      );
      setPendingDeactivate(null);
      setToast({
        tone: "success",
        text:
          status === "ACTIVE" ? "Usuario activado correctamente." : "Usuario desactivado correctamente.",
      });
    } catch (err) {
      setToast({
        tone: "error",
        text: getApiErrorMessage(err, "No se pudo actualizar el usuario"),
      });
    } finally {
      setStatusBusyId(null);
    }
  }

  async function confirmDeleteAdministrator() {
    if (!pendingDelete) {
      return;
    }
    const target = pendingDelete;
    setDeleteBusy(true);
    try {
      await deleteAdministrator(target.id);
      setAdmins((current) => current.filter((item) => item.id !== target.id));
      setPendingDelete(null);
      setToast({
        tone: "success",
        text: "Administrador eliminado correctamente.",
      });
    } catch (err) {
      setToast({
        tone: "error",
        text: getApiErrorMessage(err, "No se pudo eliminar el administrador"),
      });
    } finally {
      setDeleteBusy(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setSuccess("");
    try {
      setSaving(true);
      await createAdministrator({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        role: String(form.get("role")) as "ADMIN" | "SUPER_ADMIN",
      });
      formElement.reset();
      setInviteRole("ADMIN");
      setInviteRoleOpen(false);
      setSuccess("Administrador creado correctamente.");
      try {
        await load();
      } catch {
        /* El usuario ya se creó; la lista se actualizará al recargar. */
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo crear el administrador"));
    } finally {
      setSaving(false);
    }
  }

  const activeAdmins = countActiveByRole(admins, "ADMIN");
  const activeSuperAdmins = countActiveByRole(admins, "SUPER_ADMIN");
  const visibleAdmins = useMemo(() => {
    const term = query.trim().toLowerCase();
    const next = admins.filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) {
        return false;
      }
      if (roleFilter && readRole(user.role) !== roleFilter) {
        return false;
      }
      if (term && !user.name.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
    return [...next].sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return dateSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [admins, dateSort, query, roleFilter, statusFilter]);

  return (
    <div className="dash dash--team">
      {toast ? (
        <p className={`dash-team-toast${toast.tone === "error" ? " is-error" : ""}`} role="status">
          {toast.text}
        </p>
      ) : null}
      <article className="dash-profile">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">Equipo administrativo</h1>
            <p className="dash-profile__row">
              <span>Gestiona los usuarios autorizados y sus permisos.</span>
            </p>
          </div>
        </div>
        <div className="dash-profile__stats">
          <div className="dash-profile__stat">
            <img src={adminIlus} alt="" className="dash-profile__stat-art dash-float-art" />
            <p className="dash-profile__stat-label">Administradores registrados</p>
            <p className="dash-profile__stat-value">
              <CountUp value={activeAdmins} />
            </p>
          </div>
          <div className="dash-profile__stat">
            <img src={superadmIlus} alt="" className="dash-profile__stat-art dash-float-art" />
            <p className="dash-profile__stat-label">Super administradores registrados</p>
            <p className="dash-profile__stat-value">
              <CountUp value={activeSuperAdmins} />
            </p>
          </div>
        </div>
      </article>

      <section className="dash-team-board" aria-label="Gestión del equipo">
        <div className="dash-team-compose">
          <section className="dash-split__panel" aria-label="Añadir usuario al equipo">
            <div>
              <h2 className="dash-section__title">Añadir usuario al equipo</h2>
              <p className="dash-section__lead">
                Crea nuevos usuarios con permisos de administración dentro de la plataforma.
              </p>
            </div>
            <form className="dash-team-invite" onSubmit={onSubmit}>
              <Input name="name" label="Nombre" required />
              <Input name="email" type="email" label="Correo" required />
              <Input name="password" type="password" label="Contraseña" required />
              <div className="dash-team-role" ref={inviteRoleRef}>
                <span className="dash-team-role__label">Rol</span>
                <input type="hidden" name="role" value={inviteRole} />
                <button
                  type="button"
                  className={`dash-team-role__trigger${inviteRoleOpen ? " is-open" : ""}`}
                  aria-haspopup="listbox"
                  aria-expanded={inviteRoleOpen}
                  onClick={() => setInviteRoleOpen((open) => !open)}
                >
                  <span>{inviteRole === "SUPER_ADMIN" ? "Super administrador" : "Administrador"}</span>
                  <ChevronDown size={18} strokeWidth={1.7} aria-hidden="true" />
                </button>
                <div className={`dash-team-role__menu${inviteRoleOpen ? " is-open" : ""}`} role="listbox">
                  <button
                    type="button"
                    role="option"
                    aria-selected={inviteRole === "ADMIN"}
                    className={`dash-team-role__option${inviteRole === "ADMIN" ? " is-active" : ""}`}
                    onClick={() => {
                      setInviteRole("ADMIN");
                      setInviteRoleOpen(false);
                    }}
                  >
                    Administrador
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={inviteRole === "SUPER_ADMIN"}
                    className={`dash-team-role__option${inviteRole === "SUPER_ADMIN" ? " is-active" : ""}`}
                    onClick={() => {
                      setInviteRole("SUPER_ADMIN");
                      setInviteRoleOpen(false);
                    }}
                  >
                    Super administrador
                  </button>
                </div>
              </div>
              <p className="dash-section__lead dash-team-invite__full">
                La contraseña necesita mayúscula, minúscula, número y símbolo.
              </p>
              {error ? <p className="text-sm text-red-700 dash-team-invite__full">{error}</p> : null}
              {success ? <p className="text-sm text-charcoal dash-team-invite__full">{success}</p> : null}
              <div className="dash-team-invite__full">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Añadir usuario"}
                </Button>
              </div>
            </form>
          </section>
          <TeamInviteCarousel />
        </div>

        <section className="dash-split__panel" aria-label="Equipo registrado">
          <div>
            <h2 className="dash-section__title">Equipo registrado</h2>
            <p className="dash-section__lead">Personas con acceso para administrar la plataforma.</p>
          </div>
          <div className="dash-team-filters" role="toolbar" aria-label="Filtros del equipo" ref={filtersRef}>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "all" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Ver todos
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "ACTIVE" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Activos
            </button>
            <button
              type="button"
              className={`dash-team-filters__chip${statusFilter === "INACTIVE" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("INACTIVE")}
            >
              Inactivos
            </button>
            <FilterMenu
              label={roleFilter === "ADMIN" ? "Administración" : roleFilter === "SUPER_ADMIN" ? "Super administración" : "Rol"}
              active={Boolean(roleFilter) || openMenu === "role"}
              open={openMenu === "role"}
              options={[
                { value: "", label: "Todos los roles" },
                { value: "ADMIN", label: "Administración" },
                { value: "SUPER_ADMIN", label: "Super administración" },
              ]}
              onToggle={() => setOpenMenu((current) => (current === "role" ? null : "role"))}
              onSelect={(value) => {
                setRoleFilter(value as "" | "ADMIN" | "SUPER_ADMIN");
                setOpenMenu(null);
              }}
            />
            <FilterMenu
              label={dateSort === "oldest" ? "Más antiguos" : "Más recientes"}
              active={dateSort === "oldest" || openMenu === "sort"}
              open={openMenu === "sort"}
              options={[
                { value: "newest", label: "Más recientes" },
                { value: "oldest", label: "Más antiguos" },
              ]}
              onToggle={() => setOpenMenu((current) => (current === "sort" ? null : "sort"))}
              onSelect={(value) => {
                setDateSort(value as "newest" | "oldest");
                setOpenMenu(null);
              }}
            />
            <div className="dash-team-filters__search">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nombre"
              />
              <button
                type="button"
                className="dash-team-filters__search-btn"
                aria-label="Buscar nombre"
                onClick={() => searchRef.current?.focus()}
              >
                <Search size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>
          {admins.length === 0 ? (
            <Panel className="dash-empty">
              <p>No hay administradores registrados.</p>
            </Panel>
          ) : visibleAdmins.length === 0 ? (
            <Panel className="dash-empty">
              <p>No hay coincidencias con estos filtros.</p>
            </Panel>
          ) : (
            <div className="dash-team-board__people">
              {visibleAdmins.map((admin) => {
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
                      <div className="dash-team-card__actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={statusBusyId === admin.id || deleteBusy}
                          onClick={() => setPendingDeactivate(admin)}
                        >
                          {statusBusyId === admin.id ? "Actualizando..." : "Desactivar"}
                        </Button>
                        {canManageAdmins && admin.id !== user?.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="dash-team-card__delete"
                            disabled={statusBusyId === admin.id || deleteBusy}
                            onClick={() => setPendingDelete(admin)}
                          >
                            Eliminar
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="dash-team-card__actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={statusBusyId === admin.id || deleteBusy}
                          onClick={() => changeAdminStatus(admin, "ACTIVE")}
                        >
                          {statusBusyId === admin.id ? "Actualizando..." : "Activar"}
                        </Button>
                        {canManageAdmins && admin.id !== user?.id ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="dash-team-card__delete"
                            disabled={statusBusyId === admin.id || deleteBusy}
                            onClick={() => setPendingDelete(admin)}
                          >
                            Eliminar
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      {pendingDeactivate ? (
        <div
          className="dash-team-confirm"
          role="presentation"
          onClick={() => {
            if (!statusBusyId) {
              setPendingDeactivate(null);
            }
          }}
        >
          <div
            className="dash-team-confirm__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-deactivate-title"
            aria-describedby="team-deactivate-copy"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="team-deactivate-title" className="dash-team-confirm__title">
              ¿Estás seguro de que quieres desactivar este usuario?
            </h2>
            <p id="team-deactivate-copy" className="dash-team-confirm__lead">
              Este usuario perderá el acceso al panel administrativo hasta que sea activado nuevamente.
            </p>
            <div className="dash-team-confirm__actions">
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(statusBusyId)}
                onClick={() => setPendingDeactivate(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={Boolean(statusBusyId)}
                onClick={() => changeAdminStatus(pendingDeactivate, "INACTIVE")}
              >
                {statusBusyId ? "Actualizando..." : "Desactivar usuario"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          className="dash-team-confirm"
          role="presentation"
          onClick={() => {
            if (!deleteBusy) {
              setPendingDelete(null);
            }
          }}
        >
          <div
            className="dash-team-confirm__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-delete-title"
            aria-describedby="team-delete-copy"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="team-delete-title" className="dash-team-confirm__title">
              ¿Eliminar administrador?
            </h2>
            <p id="team-delete-copy" className="dash-team-confirm__lead">
              Esta acción eliminará el acceso de este administrador a Entre Caminos.
            </p>
            <p className="dash-team-confirm__name">{pendingDelete.name}</p>
            <div className="dash-team-confirm__actions">
              <Button
                type="button"
                variant="secondary"
                disabled={deleteBusy}
                onClick={() => setPendingDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="dash-team-confirm__danger"
                disabled={deleteBusy}
                onClick={() => void confirmDeleteAdministrator()}
              >
                {deleteBusy ? "Eliminando..." : "Eliminar administrador"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
