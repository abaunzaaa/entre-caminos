import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { assignRolePermissions, getPermissions, getRoles } from "../../services/catalog.service";
import type { Permission, Role } from "../../types";
import { Button } from "../../components/ui/Button";
import { AccessPermissionCard } from "../../components/admin/AccessPermissionCard";
import { AccessRoleCard } from "../../components/admin/AccessRoleCard";
import { getApiErrorMessage } from "../../utils/api-error";
import { useAuth } from "../../hooks/useAuth";
import {
  CRITICAL_PERMISSIONS,
  EXPLORER_CAPABILITIES,
  isExplorerRole,
  permissionCopy,
  permissionNameById,
  roleCopy,
  sortPermissions,
  sortRoles,
} from "../../utils/access-copy";
import accesosIlus from "../../assets/accesos-ilus.png";
import tourist2 from "../../assets/tourist2.jpg";
import "../../styles/admin-access.css";

export function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingOff, setPendingOff] = useState<{ roleId: string; permissionId: string } | null>(null);

  const orderedRoles = useMemo(() => sortRoles(roles), [roles]);
  const orderedPermissions = useMemo(() => sortPermissions(permissions), [permissions]);
  const selectedRole = orderedRoles.find((role) => role.id === selectedId) ?? orderedRoles[0] ?? null;
  const explorer = selectedRole ? isExplorerRole(selectedRole.name) : false;

  async function load() {
    const [nextRoles, nextPermissions] = await Promise.all([getRoles(), getPermissions()]);
    setRoles(nextRoles);
    setPermissions(nextPermissions);
    setSelectedId((current) => {
      if (current && nextRoles.some((role) => role.id === current)) {
        return current;
      }
      const sorted = sortRoles(nextRoles);
      return sorted[0]?.id ?? "";
    });
  }

  useEffect(() => {
    load().catch(() => setError("No se pudieron cargar los accesos."));
  }, []);

  useEffect(() => {
    if (!pendingOff) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyId) {
        setPendingOff(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingOff, busyId]);

  async function applyPermissionChange(role: Role, permissionId: string) {
    setError("");
    const current = role.permissions.map((item) => item.permission.id);
    const permissionIds = current.includes(permissionId)
      ? current.filter((id) => id !== permissionId)
      : [...current, permissionId];
    if (permissionIds.length === 0) {
      setError("Un rol administrativo necesita al menos un permiso.");
      return;
    }
    try {
      setBusyId(permissionId);
      const updated = await assignRolePermissions(role.id, permissionIds);
      if (!updated) {
        setError("No se pudo actualizar el permiso.");
        return;
      }
      setRoles((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setPendingOff(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar el permiso."));
    } finally {
      setBusyId(null);
    }
  }

  function requestToggle(role: Role, permissionId: string) {
    const current = role.permissions.map((item) => item.permission.id);
    const turningOff = current.includes(permissionId);
    const permissionName = permissionNameById(permissions, permissionId);
    if (turningOff && CRITICAL_PERMISSIONS.has(permissionName)) {
      setPendingOff({ roleId: role.id, permissionId });
      return;
    }
    void applyPermissionChange(role, permissionId);
  }

  const pendingRole = pendingOff ? roles.find((role) => role.id === pendingOff.roleId) : null;

  if (user?.role !== "SUPER_ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="dash dash--access">
      <article className="dash-profile">
        <div className="dash-profile__top">
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">Gestión de accesos</h1>
            <p className="dash-profile__row">
              <span>Controla qué puede hacer cada tipo de usuario.</span>
            </p>
            <p className="dash-profile__row">
              <span>Si modificas un rol, el cambio aplica a todas sus personas.</span>
            </p>
          </div>
        </div>
        <div className="dash-access-hero" aria-hidden="true">
          <div className="dash-profile__stat dash-access-hero__frame">
            <img src={accesosIlus} alt="" className="dash-profile__stat-art dash-access-hero__art dash-float-art" />
          </div>
        </div>
      </article>

      <section className="dash-access-section" aria-label="Roles del sistema">
        <div>
          <h2 className="dash-section__title">Roles del sistema</h2>
          <p className="dash-section__lead">Selecciona un rol para ver y ajustar sus permisos.</p>
        </div>
        {error ? <p className="dash-access-error">{error}</p> : null}
        {orderedRoles.length === 0 ? (
          <p className="dash-section__lead">Cargando accesos...</p>
        ) : (
          <div className="dash-access-roles">
            {orderedRoles.map((role) => (
              <AccessRoleCard
                key={role.id}
                role={role}
                selected={selectedRole?.id === role.id}
                onSelect={() => setSelectedId(role.id)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedRole ? (
        <section
          className="dash-access-section dash-access-section--detail"
          aria-label={`Permisos de ${roleCopy(selectedRole.name).title}`}
        >
          <div className="dash-access-detail" key={selectedRole.id}>
            <div className="dash-access-detail__main">
              <div className="dash-access-detail__intro">
                <h2 className="dash-section__title">Permisos de {roleCopy(selectedRole.name).title}</h2>
                <p className="dash-section__lead">
                  {explorer
                    ? "Este rol usa la plataforma pública y no tiene acceso al panel administrativo."
                    : "Activa o desactiva lo que las personas con este rol pueden hacer."}
                </p>
              </div>
              {explorer ? (
                <div className="dash-access-perms">
                  {EXPLORER_CAPABILITIES.map((copy) => (
                    <AccessPermissionCard key={copy.title} copy={copy} active disabled />
                  ))}
                </div>
              ) : (
                <div className="dash-access-perms">
                  {orderedPermissions.map((permission) => {
                    const active = selectedRole.permissions.some((item) => item.permission.id === permission.id);
                    return (
                      <AccessPermissionCard
                        key={permission.id}
                        copy={permissionCopy(permission.name)}
                        active={active}
                        busy={busyId === permission.id}
                        onToggle={() => requestToggle(selectedRole, permission.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <aside className="dash-access-detail__art" aria-hidden="true">
              <img src={tourist2} alt="" />
            </aside>
          </div>
        </section>
      ) : null}

      {pendingOff && pendingRole ? (
        <div
          className="dash-access-confirm"
          role="presentation"
          onClick={() => {
            if (!busyId) {
              setPendingOff(null);
            }
          }}
        >
          <div
            className="dash-access-confirm__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-off-title"
            aria-describedby="access-off-copy"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="access-off-title" className="dash-access-confirm__title">
              ¿Desactivar este permiso?
            </h2>
            <p id="access-off-copy" className="dash-access-confirm__lead">
              Los usuarios con este rol perderán acceso a esta funcionalidad.
            </p>
            <div className="dash-access-confirm__actions">
              <Button type="button" variant="secondary" disabled={Boolean(busyId)} onClick={() => setPendingOff(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => applyPermissionChange(pendingRole, pendingOff.permissionId)}
              >
                {busyId ? "Actualizando..." : "Desactivar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
