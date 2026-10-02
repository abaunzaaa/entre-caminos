import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import {
  getOrganizationProfileByUserId,
  getOwnOrganizationProfile,
  type OrganizationProfile,
} from "../../services/organization-profile.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import "../../styles/admin-profile-edit.css";
import "../../styles/admin-profile-view.css";
import "../../styles/organization-profile.css";

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

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "EC";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function OrganizationProfileViewPage() {
  const { userId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isSuperAdminTarget = Boolean(userId);
  const editPath = isSuperAdminTarget
    ? `/admin/empresas/${userId}/editar`
    : "/admin/empresa/editar";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const request = isSuperAdminTarget
      ? getOrganizationProfileByUserId(userId!)
      : getOwnOrganizationProfile();
    request
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "No se pudo consultar el perfil de empresa."));
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdminTarget, userId]);

  if ((authLoading && !user) || loading) {
    return <Spinner />;
  }

  if (!user) {
    return null;
  }

  if (user.role === "SUPER_ADMIN" && !isSuperAdminTarget) {
    return (
      <div className="admin-profile-edit admin-profile-view org-profile">
        <header className="admin-profile-view__top">
          <Button type="button" variant="secondary" className="admin-profile-view__back" onClick={() => navigate("/admin")}>
            <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            Volver
          </Button>
        </header>
        <div className="admin-profile-view__heading">
          <h1 className="admin-profile-view__title">Perfil de empresa</h1>
          <p className="admin-profile-view__lead">
            Las cuentas super administradoras no tienen perfil empresarial. Gestiona el de cada ADMIN desde el equipo.
          </p>
        </div>
        <Button type="button" onClick={() => navigate("/admin/administradores")}>
          Ir al equipo
        </Button>
      </div>
    );
  }

  const tradeName = profile?.tradeName?.trim() || "Empresa sin nombre comercial";
  const logo = profile?.logoUrl ? mediaUrl(profile.logoUrl, 200) : null;
  const missing = profile?.missingFields ?? [
    "Nombre comercial",
    "Descripción de la empresa",
    "Teléfono público de contacto",
    "Departamento",
    "Municipio",
  ];

  return (
    <div className="admin-profile-edit admin-profile-view org-profile">
      <header className="admin-profile-view__top">
        <Button
          type="button"
          variant="secondary"
          className="admin-profile-view__back"
          onClick={() => navigate(isSuperAdminTarget ? "/admin/administradores" : "/admin")}
        >
          <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          Volver
        </Button>
        <div className="org-profile__actions">
          {!isSuperAdminTarget ? (
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/perfil")}>
              Ajustes personales
            </Button>
          ) : null}
          <Button type="button" onClick={() => navigate(editPath)}>
            Editar perfil
          </Button>
        </div>
      </header>

      <div className="admin-profile-view__heading">
        <h1 className="admin-profile-view__title">Perfil de empresa</h1>
        <p className="admin-profile-view__lead">
          {isSuperAdminTarget
            ? "Consulta y actualiza el perfil empresarial de esta cuenta ADMIN."
            : "Esta información aparece como proveedor en tus experiencias publicadas."}
        </p>
      </div>

      {error ? (
        <p className="admin-profile-edit__banner" role="alert">
          {error}
        </p>
      ) : null}

      {!profile?.complete ? (
        <div className="org-profile__missing" role="status">
          <p className="org-profile__missing-title">Perfil incompleto</p>
          <p className="org-profile__missing-text">
            Puedes guardarlo por partes, pero debes completar estos campos antes de enviar experiencias a revisión:
          </p>
          <ul>
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link className="org-profile__missing-link" to={editPath}>
            Completar perfil
          </Link>
        </div>
      ) : (
        <p className="org-profile__complete" role="status">
          Perfil completo. Ya puedes enviar experiencias a revisión.
        </p>
      )}

      <div className="admin-profile-view__shell">
        <aside className="admin-profile-view__identity org-profile__identity">
          {logo ? (
            <img className="org-profile__logo" src={logo} alt={`Logo de ${tradeName}`} />
          ) : (
            <span className="org-profile__logo-fallback" aria-hidden="true">
              <Building2 size={28} strokeWidth={1.6} />
              <span>{initialsFromName(tradeName)}</span>
            </span>
          )}
          <p className="admin-profile-view__badge">Empresa</p>
          <h2 className="admin-profile-view__name">{tradeName}</h2>
          <p className="admin-profile-view__role">
            {profile?.complete ? "Listo para publicar" : "Pendiente de completar"}
          </p>
        </aside>

        <section className="admin-profile-view__details" aria-label="Datos de la empresa">
          <ViewField label="Nombre comercial" value={displayOrFallback(profile?.tradeName)} />
          <ViewField label="Razón social" value={displayOrFallback(profile?.legalName)} />
          <ViewField label="Descripción" value={displayOrFallback(profile?.description)} />
          <ViewField label="Teléfono público" value={displayOrFallback(profile?.contactPhone)} />
          <ViewField label="Correo público" value={displayOrFallback(profile?.contactEmail)} />
          <ViewField label="Sitio web" value={displayOrFallback(profile?.website)} />
          <ViewField label="Departamento" value={displayOrFallback(profile?.department)} />
          <ViewField label="Municipio" value={displayOrFallback(profile?.city)} />
          <ViewField label="Dirección" value={displayOrFallback(profile?.address)} />
        </section>
      </div>
    </div>
  );
}
