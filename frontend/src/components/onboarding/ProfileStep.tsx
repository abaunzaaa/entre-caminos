import { Camera } from "lucide-react";
import type { RefObject } from "react";
import { mediaUrl } from "../../utils/media";
import type { OnboardingForm } from "../../utils/onboarding";
import { AvatarConfigurator } from "./AvatarConfigurator";

type ProfileStepProps = {
  form: OnboardingForm;
  tab: "face" | "hair" | "outfit" | "accessories";
  photoLoading: boolean;
  photoError: string;
  fileInput: RefObject<HTMLInputElement | null>;
  onMode: (mode: "PHOTO" | "AVATAR") => void;
  onForm: (form: OnboardingForm) => void;
  onPick: (file?: File) => void;
  onRetry: () => void;
  onRemovePhoto: () => void;
  onTab: (tab: "face" | "hair" | "outfit" | "accessories") => void;
};

export function ProfileStep({
  form,
  tab,
  photoLoading,
  photoError,
  fileInput,
  onMode,
  onForm,
  onPick,
  onRetry,
  onRemovePhoto,
  onTab,
}: ProfileStepProps) {
  const preview = form.localPhotoUrl || (form.profileImageUrl ? mediaUrl(form.profileImageUrl) : "");

  return (
    <div className="onboarding-profile">
      <div className="onboarding-segment" role="group" aria-label="Tipo de imagen de perfil">
        <button
          type="button"
          className={`onboarding-segment__btn${form.profileImageType === "PHOTO" ? " is-active" : ""}`}
          aria-pressed={form.profileImageType === "PHOTO"}
          onClick={() => onMode("PHOTO")}
        >
          Subir una foto
        </button>
        <button
          type="button"
          className={`onboarding-segment__btn${form.profileImageType === "AVATAR" ? " is-active" : ""}`}
          aria-pressed={form.profileImageType === "AVATAR"}
          onClick={() => onMode("AVATAR")}
        >
          Crear mi avatar
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="onboarding-file"
        onChange={(event) => void onPick(event.target.files?.[0])}
      />
      {form.profileImageType === "PHOTO" ? (
        preview ? (
          <div className="onboarding-photo-preview">
            <div className="onboarding-photo-frame">
              <img src={preview} alt="Foto de perfil seleccionada" />
              <button
                type="button"
                className="onboarding-photo-camera"
                aria-label="Cambiar foto"
                onClick={() => fileInput.current?.click()}
              >
                <Camera size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="onboarding-photo-preview__actions">
              <button type="button" className="onboarding-text-btn" onClick={() => fileInput.current?.click()}>
                Cambiar foto
              </button>
              <button type="button" className="onboarding-text-btn" onClick={onRemovePhoto}>
                Eliminar
              </button>
              {photoError ? (
                <button type="button" className="onboarding-text-btn" onClick={onRetry}>
                  Reintentar
                </button>
              ) : null}
            </div>
            {photoLoading ? (
              <p className="onboarding-hint" aria-live="polite">
                Subiendo fotografía…
              </p>
            ) : null}
          </div>
        ) : (
          <button type="button" className="onboarding-dropzone" onClick={() => fileInput.current?.click()} disabled={photoLoading}>
            <span className="onboarding-dropzone__icon" aria-hidden="true">
              <Camera size={22} strokeWidth={1.7} />
            </span>
            <strong>{photoLoading ? "Subiendo foto…" : "Selecciona una foto"}</strong>
            <span>JPG, PNG o WebP · máximo 5 MB</span>
          </button>
        )
      ) : (
        <AvatarConfigurator
          config={form.avatarConfig}
          tab={tab}
          onTabChange={onTab}
          onChange={(avatarConfig) => onForm({ ...form, avatarConfig, profileImageType: "AVATAR" })}
        />
      )}
      {photoError ? (
        <p className="onboarding-error" role="alert">
          {photoError}
        </p>
      ) : null}
    </div>
  );
}
