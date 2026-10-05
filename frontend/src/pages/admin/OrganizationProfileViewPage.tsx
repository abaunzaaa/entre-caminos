import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Store,
  Type,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import encabezado from "../../assets/encabezado.png";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import {
  getOrganizationProfileByUserId,
  getOwnOrganizationProfile,
  type OrganizationProfile,
} from "../../services/organization-profile.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import { formatOrgPhoneDisplay } from "../../utils/organization-profile";
import "../../styles/experience-editorial-dossier.css";
import "../../styles/profile-view.css";
import "../../styles/organization-profile.css";

type OrgRow = {
  label: string;
  icon: LucideIcon;
  text: string;
  href?: string;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "E";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function websiteHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function OrganizationProfileViewPage() {
  const { userId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isSuperAdminTarget = Boolean(userId);
  const editPath = isSuperAdminTarget ? `/admin/empresas/${userId}/editar` : "/admin/empresa/editar";
  const backPath = isSuperAdminTarget ? "/admin/administradores" : "/admin";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const request = isSuperAdminTarget ? getOrganizationProfileByUserId(userId!) : getOwnOrganizationProfile();
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
      <div className="profile-view profile-view--empresa">
        <section className="profile-view__shell profile-view__shell--note">
          <h1 className="profile-hero__name">Perfil de empresa</h1>
          <p className="org-profile__note">
            Las cuentas super administradoras no tienen perfil empresarial. Gestiona el de cada ADMIN desde el equipo.
          </p>
          <div className="profile-info-actions">
            <button type="button" className="org-profile__back" onClick={() => navigate("/admin")}>
              <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
              Volver
            </button>
            <button type="button" className="tourist-hero__cta" onClick={() => navigate("/admin/administradores")}>
              Ir al equipo
            </button>
          </div>
        </section>
      </div>
    );
  }

  const storedName = profile?.tradeName?.trim() ?? "";
  const tradeName = storedName || "Tu empresa";
  const logo = profile?.logoUrl ? mediaUrl(profile.logoUrl, 200) : "";
  const complete = Boolean(profile?.complete);
  const missing = profile?.missingFields ?? [
    "Nombre comercial",
    "Descripción de la empresa",
    "Teléfono público de contacto o sitio web / canal oficial de atención",
    "Departamento",
    "Municipio",
  ];
  const phone = formatOrgPhoneDisplay(profile?.contactPhone ?? "");
  const website = profile?.website?.trim() ?? "";

  const companyRows: OrgRow[] = [
    { label: "Nombre comercial", icon: Store, text: storedName },
    { label: "Razón social", icon: FileText, text: profile?.legalName?.trim() ?? "" },
    { label: "Descripción", icon: Type, text: profile?.description?.trim() ?? "" },
  ];
  const contactRows: OrgRow[] = [
    { label: "Teléfono público", icon: Phone, text: phone },
    { label: "Correo público", icon: Mail, text: profile?.contactEmail?.trim() ?? "" },
    { label: "Sitio web", icon: Globe, text: website, href: website ? websiteHref(website) : undefined },
  ];
  const locationRows: OrgRow[] = [
    { label: "Departamento", icon: MapPin, text: profile?.department?.trim() ?? "" },
    { label: "Municipio", icon: MapPin, text: profile?.city?.trim() ?? "" },
    { label: "Dirección", icon: MapPin, text: profile?.address?.trim() ?? "" },
  ];

  const groups = [
    { id: "org-company-title", title: "Información de la empresa", rows: companyRows },
    { id: "org-contact-title", title: "Información de contacto", rows: contactRows },
    { id: "org-location-title", title: "Ubicación", rows: locationRows },
  ] as const;

  return (
    <div className="profile-view profile-view--empresa">
      <header className="profile-hero">
        <div className="profile-hero__banner" style={{ backgroundImage: `url(${encabezado})` }} aria-hidden="true" />
        <div className="profile-view__shell">
          <div className="profile-hero__sheet">
            <div className="profile-hero__photo-hit">
              <span className="profile-hero__photo">
                {logo ? (
                  <img src={logo} alt={`Logo de ${tradeName}`} />
                ) : (
                  <span className="profile-hero__initials" aria-hidden="true">
                    {initialsFromName(storedName)}
                  </span>
                )}
              </span>
            </div>
            <div className="profile-hero__identity">
              <div className="profile-hero__copy">
                <h1 id="org-profile-title" className="profile-hero__name">
                  {tradeName}
                </h1>
                <p className="profile-hero__role">Empresa</p>
                <p className={`profile-hero__status${complete ? " is-active" : ""}`}>
                  <span className="profile-hero__status-dot" aria-hidden="true" />
                  {complete ? "Perfil completo" : "Perfil incompleto"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="profile-view__shell" aria-labelledby="org-profile-title">
        <div className="profile-tabs" role="tablist" aria-label="Secciones del perfil empresarial">
          <button
            type="button"
            role="tab"
            id="org-profile-tab-informacion"
            className="profile-tab is-active"
            aria-selected="true"
            aria-controls="org-profile-panel-informacion"
          >
            <UserRound size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>Información</span>
          </button>
        </div>

        <div
          className="profile-panel"
          role="tabpanel"
          id="org-profile-panel-informacion"
          aria-labelledby="org-profile-tab-informacion"
        >
          <div className="profile-info-layout">
            <div className="profile-info-actions">
              <button type="button" className="org-profile__back" onClick={() => navigate(backPath)}>
                <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
                Volver
              </button>
              <button type="button" className="tourist-hero__cta" onClick={() => navigate(editPath)}>
                Editar perfil
              </button>
            </div>

            {error ? (
              <p className="org-profile__error" role="alert">
                {error}
              </p>
            ) : null}

            {!complete ? (
              <section className="org-profile__notice" role="status" aria-label="Perfil incompleto">
                <div className="org-profile__notice-copy">
                  <h2>Perfil incompleto</h2>
                  <p>
                    Completa los siguientes datos para poder enviar experiencias a revisión: {missing.join(" · ")}
                  </p>
                </div>
                <button type="button" className="tourist-hero__cta" onClick={() => navigate(editPath)}>
                  Completar perfil
                </button>
              </section>
            ) : null}

            <div className="profile-info-groups">
              {groups.map((group) => (
                <section key={group.id} className="profile-info-card" aria-labelledby={group.id}>
                  <h2 id={group.id} className="dash-exps-dossier__kicker">
                    {group.title}
                  </h2>
                  <dl className="dash-exps-dossier__facts">
                    {group.rows.map((row) => {
                      const Icon = row.icon;
                      const empty = !row.text;
                      return (
                        <div key={row.label} className="dash-exps-dossier__row">
                          <div className="dash-exps-dossier__copy">
                            <dt className="dash-exps-dossier__label">
                              <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                              {row.label}
                            </dt>
                            <dd className={`dash-exps-dossier__value${empty ? " is-empty" : ""}`}>
                              {empty ? (
                                "Sin completar"
                              ) : row.href ? (
                                <a className="dash-exps-dossier__link" href={row.href} target="_blank" rel="noreferrer">
                                  {row.text}
                                </a>
                              ) : (
                                row.text
                              )}
                            </dd>
                          </div>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              ))}
            </div>

            {!isSuperAdminTarget ? (
              <section className="profile-info-card" aria-labelledby="org-security-title">
                <h2 id="org-security-title" className="dash-exps-dossier__kicker">
                  Seguridad
                </h2>
                <dl className="dash-exps-dossier__facts">
                  <div className="dash-exps-dossier__row">
                    <div className="dash-exps-dossier__copy">
                      <dt className="dash-exps-dossier__label">Contraseña</dt>
                      <dd className="dash-exps-dossier__value">
                        <button
                          type="button"
                          className="dash-exps-editorial__favorite"
                          onClick={() => navigate("/cambiar-contrasena")}
                        >
                          <KeyRound size={14} strokeWidth={1.8} aria-hidden="true" />
                          <span>Cambiar contraseña</span>
                        </button>
                      </dd>
                    </div>
                  </div>
                </dl>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
