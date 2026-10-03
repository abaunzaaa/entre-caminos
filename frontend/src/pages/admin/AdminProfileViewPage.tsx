import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { UserAvatar } from "../../components/user/UserAvatar";
import { useAuth } from "../../hooks/useAuth";
import type { PublicUser } from "../../types";
import {
  ADMIN_AVATAR_EVENT,
  resolveAvatarUrl,
} from "../../utils/admin-avatar";
import { getApiErrorMessage } from "../../utils/api-error";
import "../../styles/admin-profile-edit.css";
import "../../styles/admin-profile-view.css";
import "../../styles/organization-profile.css";

function roleLabel(role: PublicUser["role"] | undefined) {
  if (role === "SUPER_ADMIN") {
    return "Super administrador";
  }
  if (role === "ADMIN") {
    return "Administrador";
  }
  return "Administración";
}

function statusLabel(status: PublicUser["status"] | undefined) {
  if (status === "ACTIVE") {
    return "Activa";
  }
  if (status === "INACTIVE") {
    return "Inactiva";
  }
  if (status === "SUSPENDED") {
    return "Suspendida";
  }
  return "Sin especificar";
}

const SHORT_MONTHS = [
  "ene.",
  "feb.",
  "mar.",
  "abr.",
  "may.",
  "jun.",
  "jul.",
  "ago.",
  "sept.",
  "oct.",
  "nov.",
  "dic.",
];

function formatAccountDate(value: string | undefined) {
  if (!value) {
    return "Sin especificar";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin especificar";
  }
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "A";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function displayOrFallback(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || "Sin especificar";
}

function ViewField({ label, value }: { label: string; value: string }) {
  const empty = value === "Sin especificar";
  return (
    <div className="admin-profile-view__field">
      <span className="admin-profile-view__label">{label}</span>
      <span className={`admin-profile-view__value${empty ? " is-empty" : ""}`}>{value}</span>
    </div>
  );
}

export function AdminProfileViewPage() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<string | null>(() => resolveAvatarUrl(user));
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    function syncPhoto() {
      setPhoto(resolveAvatarUrl(user));
    }
    syncPhoto();
    window.addEventListener(ADMIN_AVATAR_EVENT, syncPhoto);
    window.addEventListener("storage", syncPhoto);
    return () => {
      window.removeEventListener(ADMIN_AVATAR_EVENT, syncPhoto);
      window.removeEventListener("storage", syncPhoto);
    };
  }, [user, user?.id, user?.avatarUrl, user?.profile?.profileImageUrl]);

  useEffect(() => {
    let cancelled = false;
    refreshUser()
      .then(() => {
        if (!cancelled) {
          setLoadError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            getApiErrorMessage(err, "No se pudo consultar el perfil. Se muestran los datos de tu sesión."),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  if (loading && !user) {
    return <Spinner />;
  }

  if (!user) {
    return null;
  }

  const fullName = displayOrFallback(user.name);
  const initials = initialsFromName(user.name || "A");

  return (
    <div className="admin-profile-edit admin-profile-view">
      <header className="admin-profile-view__top">
        <Button
          type="button"
          variant="secondary"
          className="admin-profile-view__back"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          Volver
        </Button>
        <Button type="button" onClick={() => navigate("/admin/perfil/editar")}>
          Editar perfil
        </Button>
      </header>

      <div className="admin-profile-view__heading">
        <h1 className="admin-profile-view__title">Tu perfil</h1>
        <p className="admin-profile-view__lead">Consulta la información de tu cuenta de administración.</p>
      </div>

      {user.role === "ADMIN" ? (
        <div className="org-profile__missing" role="status">
          <p className="org-profile__missing-title">Perfil de empresa</p>
          <p className="org-profile__missing-text">
            Completa el perfil empresarial para aparecer como proveedor de tus experiencias y poder enviarlas a
            revisión.
          </p>
          <Button type="button" onClick={() => navigate("/admin/empresa")}>
            Ir al perfil de empresa
          </Button>
        </div>
      ) : null}

      {loadError ? (
        <p className="admin-profile-edit__banner" role="status">
          {loadError}
        </p>
      ) : null}

      <div className="admin-profile-view__shell">
        <aside className="admin-profile-view__identity">
          <UserAvatar
            user={user}
            src={photo}
            initial={initials}
            size={96}
            className="admin-profile-view__avatar"
            alt={`Foto de ${fullName}`}
          />
          <p className="admin-profile-view__badge">Tu perfil</p>
          <h2 className="admin-profile-view__name">{fullName}</h2>
          <p className="admin-profile-view__role">{roleLabel(user.role)}</p>
        </aside>

        <section className="admin-profile-view__details" aria-label="Datos del perfil">
          <ViewField label="Nombre completo" value={fullName} />
          <ViewField label="Correo electrónico" value={displayOrFallback(user.email)} />
          <ViewField label="Teléfono" value={displayOrFallback(user.phone)} />
          <ViewField label="Rol" value={roleLabel(user.role)} />
          <ViewField label="Estado" value={statusLabel(user.status)} />
          <ViewField label="Cuenta creada" value={formatAccountDate(user.createdAt)} />
        </section>
      </div>
    </div>
  );
}
