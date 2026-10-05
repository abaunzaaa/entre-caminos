import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Camera, KeyRound, LogOut, Building2, UserRound } from "lucide-react";
import { AuthKeyIcon } from "../auth/AuthKeyIcon";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useOrganizationLogo } from "../../hooks/useOrganizationLogo";
import { roleCopy } from "../../utils/access-copy";
import { formatPersonName } from "../../utils/person-name";
import type { PublicUser } from "../../types";
import { UserAvatar } from "../user/UserAvatar";
import {
  ADMIN_AVATAR_EVENT,
  clearAdminAvatar,
  fileToAvatarDataUrl,
  nameInitial,
  resolveAvatarUrl,
  saveAdminAvatar,
  toAvatarPayload,
} from "../../utils/admin-avatar";
import { cn } from "../../utils/cn";

type PhotoDialog = "choose" | "preview" | "confirm-delete";

function roleLabel(role: PublicUser["role"] | undefined) {
  if (!role) {
    return "Administración";
  }
  return roleCopy(role).title;
}

export function AdminUserMenu({
  user,
  showName = false,
}: {
  user: PublicUser | null;
  showName?: boolean;
}) {
  const { logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(() => resolveAvatarUrl(user));
  const [photoError, setPhotoError] = useState("");
  const [photoDialog, setPhotoDialog] = useState<PhotoDialog | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingRef = useRef(false);
  const storedName = user?.name?.trim() ?? "";
  const visibleName = storedName ? (user?.role === "USER" ? formatPersonName(storedName) : storedName) : "";
  const fullName = visibleName || (user?.role === "USER" ? "Explorador" : "Administrador");
  const firstName = fullName.split(/\s+/)[0] || "Admin";
  const initial = nameInitial(firstName, "A");
  const isExplorerUser = user?.role === "USER";
  const isOrgAdmin = user?.role === "ADMIN";
  const orgLogo = useOrganizationLogo(isOrgAdmin);
  const menuPhoto = orgLogo || photo;
  const profilePath = isExplorerUser ? "/perfil" : isOrgAdmin ? "/admin/empresa" : "/admin/perfil";
  const profileLabel = isOrgAdmin ? "Perfil de empresa" : "Perfil";

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
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (pickingRef.current || photoDialog) {
        return;
      }
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !photoDialog) {
        setOpen(false);
      }
    }
    function onWindowFocus() {
      window.setTimeout(() => {
        pickingRef.current = false;
      }, 200);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [open, photoDialog]);

  useEffect(() => {
    if (!photoDialog) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pickingRef.current) {
        closePhotoDialog();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [photoDialog]);

  function closePhotoDialog() {
    setPhotoDialog(null);
    setPendingPhoto(null);
    setPhotoError("");
  }

  function openPhotoDialog() {
    setOpen(false);
    setPhotoError("");
    setPendingPhoto(null);
    setPhotoDialog("choose");
  }

  function pickPhoto() {
    pickingRef.current = true;
    fileInputRef.current?.click();
  }

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    pickingRef.current = false;
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

  async function savePendingPhoto() {
    if (!pendingPhoto || !user) {
      return;
    }
    setPhotoSaving(true);
    setPhotoError("");
    try {
      const profile = await updateProfile({
        name: user.name,
        avatarUrl: toAvatarPayload(pendingPhoto),
      });
      const stored = resolveAvatarUrl(profile);
      if (stored) {
        saveAdminAvatar(user.id, stored);
      }
      setPhoto(stored);
      closePhotoDialog();
    } catch {
      setPhotoError("No se pudo guardar la foto. Inténtalo de nuevo.");
      setPhotoDialog("preview");
    } finally {
      setPhotoSaving(false);
    }
  }

  async function removePhoto() {
    if (!user) {
      return;
    }
    setPhotoSaving(true);
    setPhotoError("");
    try {
      await updateProfile({
        name: user.name,
        avatarUrl: null,
      });
      clearAdminAvatar(user.id);
      setPhoto(null);
      closePhotoDialog();
    } catch {
      setPhotoError("No se pudo eliminar la foto. Inténtalo de nuevo.");
      setPhotoDialog("choose");
    } finally {
      setPhotoSaving(false);
    }
  }

  const dialog =
    photoDialog && typeof document !== "undefined"
      ? createPortal(
          <div
            className="dash-team-confirm admin-usermenu__overlay"
            role="presentation"
            onClick={() => {
              if (!pickingRef.current) {
                closePhotoDialog();
              }
            }}
          >
            <div
              className="dash-team-confirm__card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-photo-title"
              aria-describedby={photoError ? "admin-photo-error" : photoDialog === "confirm-delete" ? "admin-photo-copy" : undefined}
              onClick={(event) => event.stopPropagation()}
            >
              {photoDialog === "choose" ? (
                <>
                  <h2 id="admin-photo-title" className="dash-team-confirm__title admin-usermenu__dialog-title">
                    Foto de perfil
                  </h2>
                  <div className="admin-usermenu__dialog-preview" aria-hidden="true">
                    <UserAvatar user={user} src={photo} initial={initial} size={96} className="admin-usermenu__dialog-avatar" />
                  </div>
                  {photoError ? (
                    <p id="admin-photo-error" className="admin-usermenu__photo-error">
                      {photoError}
                    </p>
                  ) : null}
                  <div className="admin-usermenu__choices">
                    <Button type="button" onClick={pickPhoto}>
                      Cambiar foto
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!photo}
                      onClick={() => setPhotoDialog("confirm-delete")}
                    >
                      Eliminar foto
                    </Button>
                  </div>
                  <div className="dash-team-confirm__actions">
                    <Button type="button" variant="ghost" onClick={closePhotoDialog}>
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : null}

              {photoDialog === "preview" ? (
                <>
                  <h2 id="admin-photo-title" className="dash-team-confirm__title">
                    Vista previa
                  </h2>
                  <p className="dash-team-confirm__lead">Así se verá tu foto de perfil.</p>
                  <div className="admin-usermenu__dialog-preview" aria-hidden="true">
                    <UserAvatar user={user} src={pendingPhoto} initial={initial} size={96} className="admin-usermenu__dialog-avatar" />
                  </div>
                  {photoError ? (
                    <p id="admin-photo-error" className="admin-usermenu__photo-error">
                      {photoError}
                    </p>
                  ) : null}
                  <div className="dash-team-confirm__actions">
                    <Button type="button" variant="secondary" onClick={pickPhoto} disabled={photoSaving}>
                      Elegir otra
                    </Button>
                    <Button type="button" variant="ghost" onClick={closePhotoDialog} disabled={photoSaving}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={() => void savePendingPhoto()} disabled={photoSaving}>
                      {photoSaving ? "Guardando…" : "Guardar"}
                    </Button>
                  </div>
                </>
              ) : null}

              {photoDialog === "confirm-delete" ? (
                <>
                  <AuthKeyIcon className="auth-recovery-icon" />
                  <h2 id="admin-photo-title" className="dash-team-confirm__title">
                    ¿Estás seguro de que deseas eliminar tu foto de perfil?
                  </h2>
                  <p id="admin-photo-copy" className="dash-team-confirm__lead">
                    Volverás a ver el avatar por defecto con tu inicial.
                  </p>
                  <div className="dash-team-confirm__actions">
                    <Button type="button" variant="secondary" onClick={() => setPhotoDialog("choose")} disabled={photoSaving}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={() => void removePhoto()} disabled={photoSaving}>
                      {photoSaving ? "Eliminando…" : "Eliminar foto"}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="admin-usermenu" ref={rootRef}>
      <button
        type="button"
        className="admin-usermenu__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menú de ${fullName}`}
        onClick={() => setOpen((value) => !value)}
      >
        <UserAvatar
          user={user}
          src={menuPhoto}
          initial={initial}
          size={40}
          className={`admin-topbar__avatar${orgLogo ? " is-logo" : ""}`}
          alt={orgLogo ? "Logo de la empresa" : ""}
        />
        {showName ? (
          <p className="admin-topbar__hello">
            <span>{fullName}</span>
          </p>
        ) : null}
      </button>

      <div
        className={cn("admin-usermenu__panel", open && "is-open")}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="admin-usermenu__profile">
          <input
            ref={fileInputRef}
            className="admin-usermenu__file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => {
              pickingRef.current = true;
            }}
            onChange={onPhotoChange}
          />
          <button
            type="button"
            className="admin-usermenu__photo-wrap"
            aria-label="Ver perfil"
            onClick={() => {
              setOpen(false);
              navigate(profilePath);
            }}
          >
            <span className="admin-usermenu__photo-ring">
              <UserAvatar user={user} src={photo} initial={initial} size={72} className="admin-usermenu__photo" />
            </span>
          </button>
          <p className="admin-usermenu__name">{fullName}</p>
          <p className="admin-usermenu__role">{roleLabel(user?.role)}</p>
        </div>

        <div className="admin-usermenu__list" role="menu">
          <button
            type="button"
            className="admin-usermenu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate(profilePath);
            }}
          >
            {isOrgAdmin ? <Building2 size={18} strokeWidth={1.7} /> : <UserRound size={18} strokeWidth={1.7} />}
            {profileLabel}
          </button>
          {isExplorerUser || isOrgAdmin ? (
            <button
              type="button"
              className="admin-usermenu__item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate("/cambiar-contrasena");
              }}
            >
              <KeyRound size={18} strokeWidth={1.7} />
              Cambiar contraseña
            </button>
          ) : null}
          <button
            type="button"
            className="admin-usermenu__item admin-usermenu__item--logout"
            role="menuitem"
            onClick={() => void logout()}
          >
            <LogOut size={18} strokeWidth={1.7} />
            Cerrar sesión
          </button>
        </div>
      </div>
      {dialog}
    </div>
  );
}
