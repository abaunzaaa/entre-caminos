import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Camera, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { AdminChangePasswordDialog } from "../../components/admin/AdminChangePasswordDialog";
import { useAuth } from "../../hooks/useAuth";
import { COLOMBIA_DEPARTMENTS, findDepartment, findMunicipality } from "../../data/colombia-locations";
import { uploadImage } from "../../services/catalog.service";
import {
  getOrganizationProfileByUserId,
  getOwnOrganizationProfile,
  upsertOrganizationProfileByUserId,
  upsertOwnOrganizationProfile,
  type OrganizationProfile,
} from "../../services/organization-profile.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { mediaUrl } from "../../utils/media";
import {
  EMPTY_ORG_PROFILE_DRAFT,
  formatOrgPhoneDisplay,
  getOrganizationProfileMissingFields,
  toOrganizationProfilePayload,
  validateOrganizationProfileDraft,
  type OrganizationProfileDraft,
  type OrganizationProfileFieldErrors,
} from "../../utils/organization-profile";
import "../../styles/admin-profile-edit.css";
import "../../styles/organization-profile.css";

function profileToDraft(profile: OrganizationProfile | null): OrganizationProfileDraft {
  if (!profile) {
    return { ...EMPTY_ORG_PROFILE_DRAFT };
  }
  return {
    tradeName: profile.tradeName ?? "",
    legalName: profile.legalName ?? "",
    description: profile.description ?? "",
    logoUrl: profile.logoUrl ?? "",
    contactPhone: profile.contactPhone ? formatOrgPhoneDisplay(profile.contactPhone) : "",
    contactEmail: profile.contactEmail ?? "",
    website: profile.website ?? "",
    department: profile.department ?? "",
    city: profile.city ?? "",
    address: profile.address ?? "",
  };
}

export function OrganizationProfileEditPage() {
  const { userId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSuperAdminTarget = Boolean(userId);
  const viewPath = isSuperAdminTarget ? `/admin/empresas/${userId}` : "/admin/empresa";

  const [draft, setDraft] = useState<OrganizationProfileDraft>({ ...EMPTY_ORG_PROFILE_DRAFT });
  const [fieldErrors, setFieldErrors] = useState<OrganizationProfileFieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ title: string; text: string; tone?: "error" } | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const cityOptions = useMemo(() => findDepartment(draft.department)?.cities ?? [], [draft.department]);
  const missingFields = useMemo(() => getOrganizationProfileMissingFields(draft), [draft]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    const request = isSuperAdminTarget
      ? getOrganizationProfileByUserId(userId!)
      : getOwnOrganizationProfile();
    request
      .then((profile) => {
        if (!cancelled) {
          setDraft(profileToDraft(profile));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(err, "No se pudo cargar el perfil de empresa."));
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

  function patchDraft(patch: Partial<OrganizationProfileDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setUploading(true);
    setFormError("");
    try {
      const url = await uploadImage(file);
      patchDraft({ logoUrl: url });
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo subir el logo."));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || uploading) {
      return;
    }
    const errors = validateOrganizationProfileDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormError("Revisa los campos marcados antes de guardar.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = toOrganizationProfilePayload(draft);
      const saved = isSuperAdminTarget
        ? await upsertOrganizationProfileByUserId(userId!, payload)
        : await upsertOwnOrganizationProfile(payload);
      setDraft(profileToDraft(saved));
      setToast({
        title: "Perfil guardado",
        text: saved.complete
          ? "El perfil de empresa quedó completo."
          : `Guardado. Aún faltan: ${saved.missingFields.join(", ")}.`,
      });
      window.setTimeout(() => navigate(viewPath), 700);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo guardar el perfil de empresa."));
      setToast({
        title: "No se pudo guardar",
        text: getApiErrorMessage(err, "Revisa los datos e inténtalo de nuevo."),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if ((authLoading && !user) || loading) {
    return <Spinner />;
  }

  if (!user) {
    return null;
  }

  if (user.role === "SUPER_ADMIN" && !isSuperAdminTarget) {
    return (
      <div className="admin-profile-edit org-profile">
        <p className="admin-profile-edit__banner" role="status">
          Las cuentas super administradoras no editan un perfil empresarial propio.
        </p>
        <Button type="button" onClick={() => navigate("/admin/administradores")}>
          Ir al equipo
        </Button>
      </div>
    );
  }

  const previewName = draft.tradeName.trim() || "Tu empresa";
  const logoPreview = draft.logoUrl ? mediaUrl(draft.logoUrl, 200) : null;

  return (
    <div className="admin-profile-edit org-profile">
      {toast ? (
        <div
          className={`dash-team-toast admin-profile-edit__toast${toast.tone === "error" ? " is-error" : ""}`}
          role="status"
        >
          <strong className="admin-profile-edit__toast-title">{toast.title}</strong>
          <span className="admin-profile-edit__toast-text">{toast.text}</span>
        </div>
      ) : null}

      <header className="admin-profile-edit__hero">
        <div className="admin-profile-edit__hero-copy">
          <div className="admin-profile-edit__hero-heading">
            <Link to={viewPath} className="admin-profile-edit__back" aria-label="Volver al perfil de empresa">
              <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <h1 className="admin-profile-edit__title">Editar perfil de empresa</h1>
          </div>
          <p className="admin-profile-edit__lead">
            Completa los datos públicos del proveedor. Puedes guardar avances; los campos obligatorios se exigen
            antes de enviar experiencias a revisión.
          </p>
        </div>
      </header>

      {loadError ? (
        <p className="admin-profile-edit__banner" role="alert">
          {loadError}
        </p>
      ) : null}

      {missingFields.length ? (
        <div className="org-profile__missing" role="status">
          <p className="org-profile__missing-title">Campos pendientes para completar el perfil</p>
          <ul>
            {missingFields.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="admin-profile-edit__shell">
        <aside className="admin-profile-edit__summary">
          <div className="admin-profile-edit__identity">
            <div className="admin-profile-edit__avatar-wrap org-profile__logo-wrap">
              <input
                ref={fileInputRef}
                className="admin-profile-edit__file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                tabIndex={-1}
                aria-hidden="true"
                onChange={onLogoChange}
              />
              {logoPreview ? (
                <img className="org-profile__logo org-profile__logo--edit" src={logoPreview} alt="" />
              ) : (
                <span className="org-profile__logo-fallback org-profile__logo-fallback--edit" aria-hidden="true">
                  <Building2 size={24} strokeWidth={1.6} />
                </span>
              )}
              <button
                type="button"
                className="admin-profile-edit__camera"
                aria-label="Subir logo"
                title="Subir logo"
                disabled={saving || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={13} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <p className="admin-profile-edit__name">{previewName}</p>
            <p className="admin-profile-edit__role">{uploading ? "Subiendo logo…" : "Logo de la empresa"}</p>
            {draft.logoUrl ? (
              <button
                type="button"
                className="org-profile__remove-logo"
                disabled={saving || uploading}
                onClick={() => patchDraft({ logoUrl: "" })}
              >
                <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
                Quitar logo
              </button>
            ) : null}
          </div>
          {!isSuperAdminTarget ? (
            <div className="org-profile__side-links">
              <button type="button" className="org-profile__side-link" onClick={() => setPasswordOpen(true)}>
                Cambiar contraseña
              </button>
            </div>
          ) : null}
        </aside>

        <section className="admin-profile-edit__form-panel">
          <form className="admin-profile-edit__form" onSubmit={onSubmit} noValidate aria-busy={saving}>
            {formError ? (
              <p className="admin-profile-edit__banner" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="admin-profile-edit__section-head">
              <Building2 className="admin-profile-edit__section-icon" size={18} strokeWidth={1.7} aria-hidden="true" />
              <h2 className="admin-profile-edit__section">Datos de la empresa</h2>
            </div>

            <div className="admin-profile-edit__grid">
              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="org-trade-name">
                  Nombre comercial <span className="admin-profile-edit__required">*</span>
                </label>
                <input
                  id="org-trade-name"
                  className="admin-profile-edit__control"
                  value={draft.tradeName}
                  maxLength={120}
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.tradeName)}
                  onChange={(event) => patchDraft({ tradeName: event.target.value })}
                />
                {fieldErrors.tradeName ? (
                  <p className="admin-profile-edit__error" role="alert">
                    {fieldErrors.tradeName}
                  </p>
                ) : null}
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="org-legal-name">
                  Razón social
                </label>
                <input
                  id="org-legal-name"
                  className="admin-profile-edit__control"
                  value={draft.legalName}
                  maxLength={160}
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.legalName)}
                  onChange={(event) => patchDraft({ legalName: event.target.value })}
                />
                {fieldErrors.legalName ? (
                  <p className="admin-profile-edit__error" role="alert">
                    {fieldErrors.legalName}
                  </p>
                ) : null}
              </div>

              <div className="admin-profile-edit__field admin-profile-edit__field--full">
                <label className="admin-profile-edit__label" htmlFor="org-description">
                  Descripción de la empresa <span className="admin-profile-edit__required">*</span>
                </label>
                <textarea
                  id="org-description"
                  className="admin-profile-edit__control org-profile__textarea"
                  value={draft.description}
                  maxLength={2000}
                  rows={5}
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.description)}
                  onChange={(event) => patchDraft({ description: event.target.value })}
                />
                {fieldErrors.description ? (
                  <p className="admin-profile-edit__error" role="alert">
                    {fieldErrors.description}
                  </p>
                ) : null}
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="org-phone">
                  Teléfono público <span className="admin-profile-edit__required">*</span>
                </label>
                <input
                  id="org-phone"
                  className="admin-profile-edit__control"
                  type="tel"
                  inputMode="tel"
                  value={draft.contactPhone}
                  placeholder="300 123 4567"
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.contactPhone)}
                  onChange={(event) => patchDraft({ contactPhone: formatOrgPhoneDisplay(event.target.value) })}
                />
                {fieldErrors.contactPhone ? (
                  <p className="admin-profile-edit__error" role="alert">
                    {fieldErrors.contactPhone}
                  </p>
                ) : (
                  <p className="admin-profile-edit__hint">Visible en el detalle de tus experiencias.</p>
                )}
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="org-email">
                  Correo público
                </label>
                <input
                  id="org-email"
                  className="admin-profile-edit__control"
                  type="email"
                  value={draft.contactEmail}
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.contactEmail)}
                  onChange={(event) => patchDraft({ contactEmail: event.target.value })}
                />
                {fieldErrors.contactEmail ? (
                  <p className="admin-profile-edit__error" role="alert">
                    {fieldErrors.contactEmail}
                  </p>
                ) : (
                  <p className="admin-profile-edit__hint">Opcional y distinto del correo de acceso.</p>
                )}
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="org-website">
                  Sitio web
                </label>
                <input
                  id="org-website"
                  className="admin-profile-edit__control"
                  value={draft.website}
                  placeholder="https://"
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.website)}
                  onChange={(event) => patchDraft({ website: event.target.value })}
                />
                {fieldErrors.website ? (
                  <p className="admin-profile-edit__error" role="alert">
                    {fieldErrors.website}
                  </p>
                ) : null}
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="org-department">
                  Departamento <span className="admin-profile-edit__required">*</span>
                </label>
                <select
                  id="org-department"
                  className="admin-profile-edit__control"
                  value={draft.department}
                  disabled={saving}
                  onChange={(event) => {
                    const department = findDepartment(event.target.value)?.name ?? event.target.value;
                    const nextCities = findDepartment(department)?.cities ?? [];
                    patchDraft({
                      department,
                      city: nextCities.includes(draft.city) ? draft.city : "",
                    });
                  }}
                >
                  <option value="">Selecciona</option>
                  {COLOMBIA_DEPARTMENTS.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="org-city">
                  Municipio <span className="admin-profile-edit__required">*</span>
                </label>
                <select
                  id="org-city"
                  className="admin-profile-edit__control"
                  value={draft.city}
                  disabled={saving || !draft.department}
                  onChange={(event) => {
                    const city = draft.department
                      ? findMunicipality(draft.department, event.target.value) || event.target.value
                      : event.target.value;
                    patchDraft({ city });
                  }}
                >
                  <option value="">Selecciona</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-profile-edit__field admin-profile-edit__field--full">
                <label className="admin-profile-edit__label" htmlFor="org-address">
                  Dirección
                </label>
                <input
                  id="org-address"
                  className="admin-profile-edit__control"
                  value={draft.address}
                  maxLength={200}
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.address)}
                  onChange={(event) => patchDraft({ address: event.target.value })}
                />
                {fieldErrors.address ? (
                  <p className="admin-profile-edit__error" role="alert">
                    {fieldErrors.address}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="admin-profile-edit__actions org-profile__form-actions">
              {!isSuperAdminTarget ? (
                <Button type="button" variant="secondary" disabled={saving || uploading} onClick={() => setPasswordOpen(true)}>
                  Cambiar contraseña
                </Button>
              ) : null}
              <Button type="button" variant="secondary" disabled={saving || uploading} onClick={() => navigate(viewPath)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? "Guardando…" : "Guardar perfil"}
              </Button>
            </div>
          </form>
        </section>
      </div>
      {!isSuperAdminTarget ? (
        <AdminChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      ) : null}
    </div>
  );
}
