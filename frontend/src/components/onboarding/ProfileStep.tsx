import { Camera } from "lucide-react";
import type { RefObject } from "react";
import { mediaUrl } from "../../utils/media";
import type { OnboardingForm } from "../../utils/onboarding";
import { AvatarConfigurator } from "./AvatarConfigurator";

type ProfileStepProps = {
  form: OnboardingForm;
  tab: "face" | "hair" | "outfit" | "accessories";
  photoLoading: boolean;
  photoProgress: number;
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
  photoProgress,
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
      <div className="onboarding-segment onboarding-segment--profile" role="group" aria-label="Tipo de imagen de perfil">
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
        <div className="onboarding-photo-layout">
          <div className="onboarding-photo-preview">
            {preview ? (
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
            ) : (
              <button
                type="button"
                className="onboarding-photo-empty"
                onClick={() => fileInput.current?.click()}
                disabled={photoLoading}
              >
                <Camera size={28} strokeWidth={1.6} aria-hidden="true" />
                <span>Selecciona una foto</span>
              </button>
            )}
          </div>
          <div className="onboarding-photo-copy">
            <p>JPG, PNG o WebP</p>
            <p>Máximo 5 MB. La imagen se recorta en círculo sin deformarse.</p>
            <div className="onboarding-photo-preview__actions">
              <button type="button" className="onboarding-nav__btn onboarding-nav__btn--primary" onClick={() => fileInput.current?.click()}>
                Seleccionar foto
              </button>
              {preview ? (
                <button type="button" className="onboarding-text-btn" onClick={onRemovePhoto}>
                  Eliminar
                </button>
              ) : null}
              {photoError ? (
                <button type="button" className="onboarding-text-btn" onClick={onRetry}>
                  Reintentar
                </button>
              ) : null}
            </div>
            {photoLoading ? (
              <div className="onboarding-progress" aria-live="polite">
                <span>Subiendo fotografía… {photoProgress}%</span>
                <progress max={100} value={photoProgress} />
              </div>
            ) : null}
            {photoError ? (
              <p className="onboarding-error" role="alert">
                {photoError}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <AvatarConfigurator
          config={form.avatarConfig}
          tab={tab}
          onTabChange={onTab}
          onChange={(avatarConfig) => onForm({ ...form, avatarConfig, profileImageType: "AVATAR" })}
        />
      )}
    </div>
  );
}
