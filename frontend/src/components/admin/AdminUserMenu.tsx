import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Camera, LogOut, UserRoundPen } from "lucide-react";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import type { PublicUser } from "../../types";
import {
  ADMIN_AVATAR_EVENT,
  clearAdminAvatar,
  fileToAvatarDataUrl,
  readAdminAvatar,
  saveAdminAvatar,
} from "../../utils/admin-avatar";
import { cn } from "../../utils/cn";

type PhotoDialog = "choose" | "preview" | "confirm-delete";

function roleLabel(role: PublicUser["role"] | undefined) {
  if (role === "SUPER_ADMIN") {
    return "Super administrador";
  }
  if (role === "ADMIN") {
    return "Administrador";
  }
  return "Administración";
}

function AvatarMark({
  src,
  initial,
  className,
}: {
  src: string | null;
  initial: string;
  className: string;
}) {
  return (
    <span className={className}>
      {src ? <img src={src} alt="" /> : initial}
    </span>
  );
}

export function AdminUserMenu({ user }: { user: PublicUser | null }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(() => readAdminAvatar(user?.id));
  const [photoError, setPhotoError] = useState("");
  const [photoDialog, setPhotoDialog] = useState<PhotoDialog | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingRef = useRef(false);
  const fullName = user?.name?.trim() || "Administrador";
  const firstName = fullName.split(/\s+/)[0] || "Admin";
  const initial = firstName.charAt(0).toUpperCase();

  useEffect(() => {
    function syncPhoto() {
      setPhoto(readAdminAvatar(user?.id));
    }
    syncPhoto();
    window.addEventListener(ADMIN_AVATAR_EVENT, syncPhoto);
    window.addEventListener("storage", syncPhoto);
    return () => {
      window.removeEventListener(ADMIN_AVATAR_EVENT, syncPhoto);
      window.removeEventListener("storage", syncPhoto);
    };
  }, [user?.id]);

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

  function savePendingPhoto() {
    if (!pendingPhoto) {
      return;
    }
    if (user?.id) {
      saveAdminAvatar(user.id, pendingPhoto);
    }
    setPhoto(pendingPhoto);
    closePhotoDialog();
  }

  function removePhoto() {
    if (user?.id) {
      clearAdminAvatar(user.id);
    }
    setPhoto(null);
    closePhotoDialog();
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
                    <AvatarMark src={photo} initial={initial} className="admin-usermenu__dialog-avatar" />
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
                    <AvatarMark src={pendingPhoto} initial={initial} className="admin-usermenu__dialog-avatar" />
                  </div>
                  <div className="dash-team-confirm__actions">
                    <Button type="button" variant="secondary" onClick={pickPhoto}>
                      Elegir otra
                    </Button>
                    <Button type="button" variant="ghost" onClick={closePhotoDialog}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={savePendingPhoto}>
                      Guardar
                    </Button>
                  </div>
                </>
              ) : null}

              {photoDialog === "confirm-delete" ? (
                <>
                  <h2 id="admin-photo-title" className="dash-team-confirm__title">
                    ¿Estás seguro de que deseas eliminar tu foto de perfil?
                  </h2>
                  <p id="admin-photo-copy" className="dash-team-confirm__lead">
                    Volverás a ver el avatar por defecto con tu inicial.
                  </p>
                  <div className="dash-team-confirm__actions">
                    <Button type="button" variant="secondary" onClick={() => setPhotoDialog("choose")}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={removePhoto}>
                      Eliminar foto
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
        <AvatarMark src={photo} initial={initial} className="admin-topbar__avatar" />
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
            aria-label="Gestionar foto de perfil"
            onClick={openPhotoDialog}
          >
            <span className="admin-usermenu__photo-ring">
              <AvatarMark src={photo} initial={initial} className="admin-usermenu__photo" />
              <span className="admin-usermenu__photo-badge" aria-hidden="true">
                <Camera size={10} strokeWidth={1.8} />
              </span>
            </span>
          </button>
          <p className="admin-usermenu__name">{fullName}</p>
          <p className="admin-usermenu__role">{roleLabel(user?.role)}</p>
        </div>

        <div className="admin-usermenu__list" role="menu">
          <button type="button" className="admin-usermenu__item" role="menuitem" onClick={() => setOpen(false)}>
            <UserRoundPen size={18} strokeWidth={1.7} />
            Editar perfil
          </button>
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
