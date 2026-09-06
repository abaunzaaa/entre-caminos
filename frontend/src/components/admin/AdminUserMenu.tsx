import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Camera, LogOut, Settings, UserRoundPen } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import type { PublicUser } from "../../types";
import { fileToAvatarDataUrl, readAdminAvatar, saveAdminAvatar } from "../../utils/admin-avatar";
import { cn } from "../../utils/cn";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingRef = useRef(false);
  const fullName = user?.name?.trim() || "Administrador";
  const firstName = fullName.split(/\s+/)[0] || "Admin";
  const initial = firstName.charAt(0).toUpperCase();

  useEffect(() => {
    setPhoto(readAdminAvatar(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (pickingRef.current) {
        return;
      }
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
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
  }, [open]);

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    pickingRef.current = false;
    if (!file) {
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setPhotoError("Usa JPG, PNG o WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("La imagen no puede superar 5 MB.");
      return;
    }
    try {
      setPhotoError("");
      const dataUrl = await fileToAvatarDataUrl(file);
      if (user?.id) {
        saveAdminAvatar(user.id, dataUrl);
      }
      setPhoto(dataUrl);
    } catch {
      setPhotoError("No se pudo cargar la imagen.");
    }
  }

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
            aria-label="Cambiar foto de perfil"
            onClick={() => {
              pickingRef.current = true;
              fileInputRef.current?.click();
            }}
          >
            <span className="admin-usermenu__photo-ring">
              <AvatarMark src={photo} initial={initial} className="admin-usermenu__photo" />
              <span className="admin-usermenu__photo-badge" aria-hidden="true">
                <Camera size={10} strokeWidth={1.8} />
              </span>
            </span>
          </button>
          {photoError ? <p className="admin-usermenu__photo-error">{photoError}</p> : null}
          <p className="admin-usermenu__name">{fullName}</p>
          <p className="admin-usermenu__role">{roleLabel(user?.role)}</p>
        </div>

        <div className="admin-usermenu__list" role="menu">
          <button type="button" className="admin-usermenu__item" role="menuitem" onClick={() => setOpen(false)}>
            <UserRoundPen size={18} strokeWidth={1.7} />
            Editar datos
          </button>
          <Link
            to="/admin/roles"
            className="admin-usermenu__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Settings size={18} strokeWidth={1.7} />
            Configuración del sitio
          </Link>
          <button
            type="button"
            className="admin-usermenu__item admin-usermenu__item--logout"
            role="menuitem"
            onClick={() => logout().then(() => window.location.replace("/login"))}
          >
            <LogOut size={18} strokeWidth={1.7} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
