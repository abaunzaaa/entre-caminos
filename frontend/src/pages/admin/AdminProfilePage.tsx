import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Camera, Lock, Trash2, UserRound, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { SuccessConfirmDialog } from "../../components/ui/SuccessConfirmDialog";
import { AdminProfileHeroArt } from "../../components/admin/AdminProfileHeroArt";
import { useAuth } from "../../hooks/useAuth";
import type { PublicUser } from "../../types";
import perfilActualizadoIcon from "../../assets/perfil-actualizado-icon.svg";
import {
  ADMIN_AVATAR_EVENT,
  clearAdminAvatar,
  fileToAvatarDataUrl,
  resolveAvatarUrl,
  saveAdminAvatar,
  toAvatarPayload,
} from "../../utils/admin-avatar";
import { getApiErrorMessage } from "../../utils/api-error";
import "../../styles/admin-profile-edit.css";

type PhotoDialog = "choose" | "preview" | "confirm-delete";

type ProfileDraft = {
  name: string;
  phone: string;
};

type FieldErrors = Partial<Record<keyof ProfileDraft, string>>;

const EMPTY_DRAFT: ProfileDraft = { name: "", phone: "" };


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
  return "—";
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
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function compactPhone(value: string) {
  const compact = value.replace(/[\s.-]/g, "");
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\+/g, "")}`;
  }
  return compact.replace(/\+/g, "");
}

function formatPhoneDisplay(value: string) {
  const compact = compactPhone(value);
  if (!compact) {
    return "";
  }
  if (compact === "+" || compact === "+5" || compact === "+57") {
    return compact;
  }
  const hasCountry = compact.startsWith("+57");
  const national = hasCountry ? compact.slice(3) : compact.startsWith("+") ? compact.slice(1) : compact;
  if (/^3\d{0,9}$/.test(national) || /^60\d{0,8}$/.test(national)) {
    const groups = [national.slice(0, 3), national.slice(3, 6), national.slice(6, 10)].filter(Boolean);
    return `${hasCountry ? "+57 " : ""}${groups.join(" ")}`;
  }
  return compact;
}

function countPhoneDigits(value: string) {
  return (value.match(/\d/g) ?? []).length;
}

function placePhoneCaret(formatted: string, digitCount: number) {
  if (digitCount <= 0) {
    return formatted.startsWith("+") ? formatted.length : 0;
  }
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index])) {
      seen += 1;
      if (seen === digitCount) {
        return index + 1;
      }
    }
  }
  return formatted.length;
}

function draftFromUser(user: PublicUser): ProfileDraft {
  return {
    name: user.name ?? "",
    phone: formatPhoneDisplay(user.phone ?? ""),
  };
}

function normalizeDraft(draft: ProfileDraft): ProfileDraft {
  return {
    name: draft.name.trim(),
    phone: compactPhone(draft.phone),
  };
}

function emptyToNull(value: string) {
  const compact = compactPhone(value);
  return compact.length > 0 ? compact : null;
}

function isValidColombianPhone(value: string) {
  const compact = value.replace(/[\s.-]/g, "");
  const national = compact.startsWith("+57") ? compact.slice(3) : compact;
  return /^3\d{9}$/.test(national) || /^60\d{8}$/.test(national);
}

function validateName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "El nombre es obligatorio";
  }
  if (trimmed.length < 2) {
    return "El nombre debe tener al menos 2 caracteres";
  }
  if (trimmed.length > 80) {
    return "El nombre es demasiado largo";
  }
  return "";
}

function validatePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length > 20) {
    return "El teléfono es demasiado largo";
  }
  if (!isValidColombianPhone(trimmed)) {
    return "Ingresa un teléfono colombiano válido. Ejemplo: 300 123 4567";
  }
  return "";
}

function validateDraft(draft: ProfileDraft): FieldErrors {
  const errors: FieldErrors = {};
  const nameError = validateName(draft.name);
  const phoneError = validatePhone(draft.phone);
  if (nameError) errors.name = nameError;
  if (phoneError) errors.phone = phoneError;
  return errors;
}

function apiFieldMessage(err: unknown, field: string) {
  if (!axios.isAxiosError(err)) {
    return "";
  }
  const details = err.response?.data?.error?.details;
  if (!Array.isArray(details)) {
    return "";
  }
  const match = details.find(
    (item: { field?: string; message?: string }) => item.field === field && item.message,
  );
  return typeof match?.message === "string" ? match.message : "";
}

function ProfilePhotoModalAvatar({
  src,
  initials,
  name,
  onPick,
}: {
  src: string | null;
  initials: string;
  name: string;
  onPick: () => void;
}) {
  return (
    <div className="admin-profile-photo__stage">
      <div className="admin-profile-photo__avatar-wrap">
        {src ? (
          <span className="admin-profile-photo__avatar">
            <img src={src} alt={`Foto de ${name}`} />
          </span>
        ) : (
          <span className="admin-profile-photo__avatar" aria-hidden="true">
            {initials}
          </span>
        )}
        {!src ? <span className="sr-only">Iniciales de {name}</span> : null}
        <button
          type="button"
          className="admin-profile-photo__cam"
          aria-label="Cambiar foto de perfil"
          onClick={onPick}
        >
          <Camera size={14} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function AdminProfilePage() {
  const { user, loading, refreshUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProfileDraft>(() => (user ? draftFromUser(user) : EMPTY_DRAFT));
  const [original, setOriginal] = useState<ProfileDraft>(() => (user ? draftFromUser(user) : EMPTY_DRAFT));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ title: string; text: string; tone: "success" | "error" } | null>(
    null,
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(() => resolveAvatarUrl(user));
  const [savedPhoto, setSavedPhoto] = useState<string | null>(() => resolveAvatarUrl(user));
  const [photoError, setPhotoError] = useState("");
  const [photoDialog, setPhotoDialog] = useState<PhotoDialog | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoDialogRef = useRef<HTMLDivElement>(null);
  const photoCloseRef = useRef<HTMLButtonElement>(null);
  const photoTriggerRef = useRef<HTMLButtonElement>(null);
  const saveWrapRef = useRef<HTMLSpanElement>(null);
  const savingRef = useRef(false);
  const draftRef = useRef(draft);
  const originalRef = useRef(original);
  const photoDirtyRef = useRef(false);
  const formDirty = JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(original));
  const photoDirty = photo !== savedPhoto;
  const dirty = formDirty || photoDirty;
  const validation = validateDraft(draft);
  const canSave = dirty && !saving && Object.keys(validation).length === 0;

  draftRef.current = draft;
  originalRef.current = original;
  photoDirtyRef.current = photoDirty;

  useEffect(() => {
    function syncPhoto() {
      const next = resolveAvatarUrl(user);
      setSavedPhoto(next);
      if (!photoDirtyRef.current) {
        setPhoto(next);
      }
    }
    syncPhoto();
    window.addEventListener(ADMIN_AVATAR_EVENT, syncPhoto);
    window.addEventListener("storage", syncPhoto);
    return () => {
      window.removeEventListener(ADMIN_AVATAR_EVENT, syncPhoto);
      window.removeEventListener("storage", syncPhoto);
    };
  }, [user, user?.id, user?.avatarUrl]);

  useEffect(() => {
    let cancelled = false;
    const hasSessionUser = Boolean(user);
    refreshUser()
      .then((profile) => {
        if (cancelled) {
          return;
        }
        setLoadError("");
        const current = normalizeDraft(draftRef.current);
        const saved = normalizeDraft(originalRef.current);
        const isDirty = JSON.stringify(current) !== JSON.stringify(saved);
        if (!isDirty) {
          const next = draftFromUser(profile);
          setDraft(next);
          setOriginal(next);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setLoadError(
          getApiErrorMessage(
            err,
            hasSessionUser
              ? "No se pudo consultar el perfil. Se muestran los datos de tu sesión."
              : "No se pudo cargar tu perfil.",
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!discardOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || successOpen || photoDialog) {
        return;
      }
      setDiscardOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [discardOpen, photoDialog, successOpen]);

  const photoModalOpen = photoDialog !== null;

  useEffect(() => {
    if (!photoModalOpen) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) {
      const currentPadding = Number.parseInt(previousPaddingRight || "0", 10) || 0;
      body.style.paddingRight = `${currentPadding + scrollbar}px`;
    }

    photoCloseRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (successOpen) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        setPhotoDialog(null);
        setPendingPhoto(null);
        setPhotoError("");
        window.setTimeout(() => photoTriggerRef.current?.focus(), 0);
        return;
      }
      if (event.key !== "Tab" || !photoDialogRef.current) {
        return;
      }
      const focusable = [...photoDialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [photoModalOpen, successOpen]);

  function goBack() {
    navigate("/admin");
  }

  function requestLeave() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    goBack();
  }

  function closeSuccess() {
    setSuccessOpen(false);
    window.setTimeout(() => {
      const saveButton = document.getElementById("admin-profile-save");
      if (saveButton instanceof HTMLButtonElement && !saveButton.disabled) {
        saveButton.focus();
        return;
      }
      saveWrapRef.current?.focus();
    }, 0);
  }

  function closePhotoDialog() {
    setPhotoDialog(null);
    setPendingPhoto(null);
    setPhotoError("");
    window.setTimeout(() => photoTriggerRef.current?.focus(), 0);
  }

  function pickPhoto() {
    fileInputRef.current?.click();
  }

  function patchDraft(partial: Partial<ProfileDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setPhotoError("Usa JPG, PNG o WebP.");
      setPhotoDialog("choose");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("La imagen no puede superar 5 MB.");
      setPhotoDialog("choose");
      return;
    }
    try {
      setPhotoError("");
      const dataUrl = await fileToAvatarDataUrl(file);
      setPendingPhoto(dataUrl);
      setPhotoDialog("preview");
    } catch {
      setPhotoError("No se pudo cargar la imagen.");
      setPhotoDialog("choose");
    }
  }

  function persistPhoto(nextPhoto: string | null) {
    if (!user?.id) {
      return;
    }
    if (nextPhoto) {
      saveAdminAvatar(user.id, nextPhoto);
    } else {
      clearAdminAvatar(user.id);
    }
    setSavedPhoto(nextPhoto);
  }

  function savePendingPhoto() {
    if (!pendingPhoto) {
      return;
    }
    setPhoto(pendingPhoto);
    closePhotoDialog();
  }

  function removePhoto() {
    setPhoto(null);
    closePhotoDialog();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || saving) {
      return;
    }
    const nextErrors = validateDraft(draft);
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0 || !dirty) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const profile = await updateProfile({
        name: draft.name.trim(),
        phone: emptyToNull(draft.phone),
        ...(photoDirty ? { avatarUrl: toAvatarPayload(photo) } : {}),
      });
      setFieldErrors({});
      const next = draftFromUser(profile);
      setDraft(next);
      setOriginal(next);
      const stored = resolveAvatarUrl(profile);
      persistPhoto(stored);
      setPhoto(stored);
      setSuccessOpen(true);
    } catch (err) {
      const nextErrors: FieldErrors = {};
      (["name", "phone"] as const).forEach((field) => {
        const message = apiFieldMessage(err, field);
        if (message) {
          nextErrors[field] = message;
        }
      });
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
      }
      setFormError(
        getApiErrorMessage(err, "No pudimos actualizar tu perfil. Verifica la información e inténtalo nuevamente."),
      );
      setToast({
        title: "No se pudo guardar",
        text: getApiErrorMessage(
          err,
          "No pudimos actualizar tu perfil. Verifica la información e inténtalo nuevamente.",
        ),
        tone: "error",
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (loading && !user) {
    return <Spinner />;
  }

  if (!user) {
    return (
      <div className="admin-profile-edit">
        <p className="admin-profile-edit__banner" role="alert">
          {loadError || "No se pudo cargar tu perfil."}
        </p>
        <Button type="button" variant="secondary" onClick={() => void refreshUser()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const fullName = user.name.trim() || "Administrador";
  const initials = initialsFromName(fullName);

  return (
    <div className="admin-profile-edit">
      {toast ? (
        <p
          className={`dash-team-toast admin-profile-edit__toast${toast.tone === "error" ? " is-error" : ""}`}
          role="status"
        >
          <strong className="admin-profile-edit__toast-title">{toast.title}</strong>
          <span className="admin-profile-edit__toast-text">{toast.text}</span>
        </p>
      ) : null}

      <header className="admin-profile-edit__hero">
        <div className="admin-profile-edit__hero-copy">
          <div className="admin-profile-edit__hero-heading">
            <Link
              to="/admin"
              className="admin-profile-edit__back"
              aria-label="Volver al panel"
              onClick={(event) => {
                if (!dirty) {
                  return;
                }
                event.preventDefault();
                setDiscardOpen(true);
              }}
            >
              <ArrowLeft size={16} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <h1 className="admin-profile-edit__title">Editar perfil</h1>
          </div>
          <p className="admin-profile-edit__lead">
            Actualiza la información básica de tu cuenta.
          </p>
        </div>
        <AdminProfileHeroArt />
      </header>

      {loadError ? (
        <p className="admin-profile-edit__banner" role="status">
          {loadError}
        </p>
      ) : null}

      <div className="admin-profile-edit__shell">
        <aside className="admin-profile-edit__summary">
          <div className="admin-profile-edit__identity">
            <div className="admin-profile-edit__avatar-wrap">
              <input
                ref={fileInputRef}
                className="admin-profile-edit__file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                tabIndex={-1}
                aria-hidden="true"
                onChange={onPhotoChange}
              />
              {photo ? (
                <span className="admin-profile-edit__avatar">
                  <img src={photo} alt={`Foto de ${fullName}`} />
                </span>
              ) : (
                <span className="admin-profile-edit__avatar" aria-hidden="true">
                  {initials}
                </span>
              )}
              <button
                ref={photoTriggerRef}
                type="button"
                className="admin-profile-edit__camera"
                aria-label="Cambiar foto de perfil"
                title="Cambiar foto de perfil"
                onClick={() => {
                  setPhotoError("");
                  setPendingPhoto(null);
                  setPhotoDialog("choose");
                }}
              >
                <Camera size={13} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            {!photo ? <span className="sr-only">Iniciales de {fullName}</span> : null}
            <p className="admin-profile-edit__name">{fullName}</p>
            <p className="admin-profile-edit__email">{user.email}</p>
            <p className="admin-profile-edit__role">{roleLabel(user.role)}</p>
          </div>
          <div className="admin-profile-edit__facts">
            <div className="admin-profile-edit__fact">
              <span className="admin-profile-edit__fact-label">Estado</span>
              <span
                className={`admin-profile-edit__status${user.status === "ACTIVE" ? " is-active" : ""}`}
              >
                <span className="admin-profile-edit__status-dot" aria-hidden="true" />
                {statusLabel(user.status)}
              </span>
            </div>
            <div className="admin-profile-edit__fact">
              <span className="admin-profile-edit__fact-label">Cuenta creada</span>
              <span className="admin-profile-edit__fact-value">{formatAccountDate(user.createdAt)}</span>
            </div>
          </div>
        </aside>

        <section className="admin-profile-edit__form-panel">
          <form className="admin-profile-edit__form" onSubmit={onSubmit} noValidate aria-busy={saving}>
            {formError ? (
              <p className="admin-profile-edit__banner" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="admin-profile-edit__section-head">
              <UserRound className="admin-profile-edit__section-icon" size={18} strokeWidth={1.7} aria-hidden="true" />
              <h2 className="admin-profile-edit__section">Información personal</h2>
            </div>

            <div className="admin-profile-edit__grid">
              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="admin-profile-name">
                  Nombre completo
                  <span className="admin-profile-edit__required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                </label>
                <input
                  id="admin-profile-name"
                  className="admin-profile-edit__control"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={draft.name}
                  maxLength={80}
                  required
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "admin-profile-name-error" : undefined}
                  disabled={saving}
                  onChange={(event) => {
                    patchDraft({ name: event.target.value });
                    if (fieldErrors.name) {
                      setFieldErrors((current) => ({ ...current, name: validateName(event.target.value) || undefined }));
                    }
                  }}
                />
                {fieldErrors.name ? (
                  <p id="admin-profile-name-error" className="admin-profile-edit__error" role="alert">
                    {fieldErrors.name}
                  </p>
                ) : (
                  <p className="admin-profile-edit__hint admin-profile-edit__hint--spacer" aria-hidden="true">
                    {"\u00a0"}
                  </p>
                )}
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="admin-profile-email">
                  Correo electrónico
                </label>
                <div className="admin-profile-edit__control-wrap">
                  <input
                    id="admin-profile-email"
                    className="admin-profile-edit__control"
                    type="email"
                    value={user.email}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="admin-profile-email-hint"
                  />
                  <Lock className="admin-profile-edit__lock" size={14} strokeWidth={1.7} aria-hidden="true" />
                </div>
                <p id="admin-profile-email-hint" className="admin-profile-edit__hint">
                  El correo requiere verificación y no puede modificarse aquí.
                </p>
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="admin-profile-phone">
                  Teléfono
                </label>
                <input
                  id="admin-profile-phone"
                  className="admin-profile-edit__control"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={draft.phone}
                  placeholder="300 123 4567"
                  maxLength={16}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? "admin-profile-phone-error" : "admin-profile-phone-hint"}
                  disabled={saving}
                  onChange={(event) => {
                    const input = event.target;
                    const digitsBefore = countPhoneDigits(input.value.slice(0, input.selectionStart ?? input.value.length));
                    const next = formatPhoneDisplay(input.value);
                    patchDraft({ phone: next });
                    if (fieldErrors.phone) {
                      setFieldErrors((current) => ({ ...current, phone: validatePhone(next) || undefined }));
                    }
                    requestAnimationFrame(() => {
                      const caret = placePhoneCaret(next, digitsBefore);
                      input.setSelectionRange(caret, caret);
                    });
                  }}
                />
                {fieldErrors.phone ? (
                  <p id="admin-profile-phone-error" className="admin-profile-edit__error" role="alert">
                    {fieldErrors.phone}
                  </p>
                ) : (
                  <p id="admin-profile-phone-hint" className="admin-profile-edit__hint">
                    Ejemplo: 300 123 4567
                  </p>
                )}
              </div>

              <div className="admin-profile-edit__field">
                <label className="admin-profile-edit__label" htmlFor="admin-profile-role">
                  Rol
                </label>
                <div className="admin-profile-edit__control-wrap">
                  <input
                    id="admin-profile-role"
                    className="admin-profile-edit__control"
                    type="text"
                    value={roleLabel(user.role)}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="admin-profile-role-hint"
                  />
                  <Lock className="admin-profile-edit__lock" size={14} strokeWidth={1.7} aria-hidden="true" />
                </div>
                <p id="admin-profile-role-hint" className="admin-profile-edit__hint">
                  El rol se administra desde Gestión de accesos.
                </p>
              </div>
            </div>

            <div className="admin-profile-edit__actions">
              <Button type="button" variant="secondary" className="admin-profile-edit__cancel" onClick={requestLeave}>
                Cancelar
              </Button>
              <span ref={saveWrapRef} className="admin-profile-edit__save-wrap" tabIndex={-1}>
                <Button
                  id="admin-profile-save"
                  type="submit"
                  className="admin-profile-edit__save"
                  disabled={!canSave}
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </span>
            </div>
          </form>
        </section>
      </div>

      {discardOpen ? (
        <div
          className="dash-team-confirm"
          role="presentation"
          onClick={() => setDiscardOpen(false)}
        >
          <div
            className="dash-team-confirm__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-profile-discard-title"
            aria-describedby="admin-profile-discard-copy"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="admin-profile-discard-title" className="dash-team-confirm__title">
              ¿Descartar los cambios?
            </h2>
            <p id="admin-profile-discard-copy" className="dash-team-confirm__lead">
              Hay información sin guardar. Si sales ahora, se perderán los cambios.
            </p>
            <div className="dash-team-confirm__actions">
              <Button type="button" variant="secondary" onClick={() => setDiscardOpen(false)}>
                Seguir editando
              </Button>
              <Button type="button" onClick={goBack}>
                Descartar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {photoDialog && typeof document !== "undefined"
        ? createPortal(
            <div className="admin-profile-photo" role="presentation" onClick={closePhotoDialog}>
              <div
                ref={photoDialogRef}
                className="admin-profile-photo__card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-profile-photo-title"
                aria-describedby={
                  [
                    photoDialog === "choose" ? "admin-profile-photo-lead" : null,
                    photoDialog === "preview" ? "admin-profile-photo-preview-copy" : null,
                    photoDialog === "confirm-delete" ? "admin-profile-photo-copy" : null,
                    photoError ? "admin-profile-photo-error" : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="admin-profile-photo__top">
                  <div className="admin-profile-photo__copy">
                    <h2 id="admin-profile-photo-title" className="admin-profile-photo__title">
                      {photoDialog === "confirm-delete"
                        ? "¿Eliminar tu foto de perfil?"
                        : photoDialog === "preview"
                          ? "Vista previa"
                          : "Tu foto de perfil"}
                    </h2>
                    {photoDialog === "choose" ? (
                      <p id="admin-profile-photo-lead" className="admin-profile-photo__lead">
                        Elige cómo quieres verte en tu cuenta.
                      </p>
                    ) : null}
                    {photoDialog === "preview" ? (
                      <p id="admin-profile-photo-preview-copy" className="admin-profile-photo__lead">
                        Así se verá tu foto de perfil.
                      </p>
                    ) : null}
                    {photoDialog === "confirm-delete" ? (
                      <p id="admin-profile-photo-copy" className="admin-profile-photo__lead">
                        Volverás a ver el avatar con tus iniciales.
                      </p>
                    ) : null}
                  </div>
                  <button
                    ref={photoCloseRef}
                    type="button"
                    className="admin-profile-photo__close"
                    aria-label="Cerrar"
                    onClick={closePhotoDialog}
                  >
                    <X size={18} strokeWidth={1.6} aria-hidden="true" />
                  </button>
                </div>

                {photoDialog === "choose" ? (
                  <>
                    <ProfilePhotoModalAvatar src={photo} initials={initials} name={fullName} onPick={pickPhoto} />
                    {photoError ? (
                      <p id="admin-profile-photo-error" className="admin-profile-photo__error" role="alert">
                        {photoError}
                      </p>
                    ) : null}
                    <Button type="button" className="admin-profile-photo__pick" onClick={pickPhoto}>
                      <Camera size={18} strokeWidth={1.7} aria-hidden="true" />
                      Elegir nueva foto
                    </Button>
                    <div className="admin-profile-photo__row">
                      <button type="button" className="admin-profile-photo__cancel" onClick={closePhotoDialog}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="admin-profile-photo__remove"
                        disabled={!photo}
                        onClick={() => setPhotoDialog("confirm-delete")}
                      >
                        <Trash2 size={15} strokeWidth={1.7} aria-hidden="true" />
                        Quitar foto
                      </button>
                    </div>
                  </>
                ) : null}

                {photoDialog === "preview" ? (
                  <>
                    <ProfilePhotoModalAvatar
                      src={pendingPhoto}
                      initials={initials}
                      name={fullName}
                      onPick={pickPhoto}
                    />
                    {photoError ? (
                      <p id="admin-profile-photo-error" className="admin-profile-photo__error" role="alert">
                        {photoError}
                      </p>
                    ) : null}
                    <Button type="button" className="admin-profile-photo__pick" onClick={savePendingPhoto}>
                      Usar esta foto
                    </Button>
                    <div className="admin-profile-photo__row">
                      <button type="button" className="admin-profile-photo__cancel" onClick={closePhotoDialog}>
                        Cancelar
                      </button>
                      <button type="button" className="admin-profile-photo__cancel" onClick={pickPhoto}>
                        Elegir otra
                      </button>
                    </div>
                  </>
                ) : null}

                {photoDialog === "confirm-delete" ? (
                  <div className="admin-profile-photo__row admin-profile-photo__row--confirm">
                    <button
                      type="button"
                      className="admin-profile-photo__cancel"
                      onClick={() => setPhotoDialog("choose")}
                    >
                      Cancelar
                    </button>
                    <button type="button" className="admin-profile-photo__remove" onClick={removePhoto}>
                      <Trash2 size={15} strokeWidth={1.7} aria-hidden="true" />
                      Eliminar foto
                    </button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

      <SuccessConfirmDialog
        open={successOpen}
        onClose={closeSuccess}
        className="contact-success--subtle"
        title="¡Perfil actualizado!"
        description="Tus cambios se guardaron correctamente."
        actionLabel="Entendido"
        closeLabel="Cerrar confirmación"
        initialFocus="action"
        icon={
          <img
            src={perfilActualizadoIcon}
            alt=""
            className="contact-success__icon contact-success__icon--profile"
          />
        }
      />
    </div>
  );
}
