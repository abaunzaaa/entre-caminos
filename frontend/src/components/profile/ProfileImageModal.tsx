import { useEffect, useRef, useState } from "react";
import { AuthForgotModalLayout } from "../auth/AuthForgotModalLayout";
import { ProfileStep } from "../onboarding/ProfileStep";
import { useAuth } from "../../hooks/useAuth";
import { deleteOnboardingPhoto, saveOnboardingProfile, uploadOnboardingPhoto } from "../../services/onboarding.service";
import { getApiErrorMessage } from "../../utils/api-error";
import { prepareOnboardingPhoto } from "../../utils/onboarding-photo";
import { profileToForm, validateOnboardingPhoto, type OnboardingForm } from "../../utils/onboarding";
import "../../styles/onboarding.css";

type AvatarTab = "face" | "hair" | "outfit" | "accessories";

function revokeLocal(url: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function ProfileImageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refresh } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const [form, setForm] = useState<OnboardingForm>(() => profileToForm(user?.profile));
  const formRef = useRef(form);
  formRef.current = form;
  const [avatarTab, setAvatarTab] = useState<AvatarTab>("face");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photoError, setPhotoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const savedPhotoUrl = useRef<string | null>(null);
  const removeSavedPhoto = useRef(false);
  const baseline = useRef(form);
  const wasOpen = useRef(false);
  const session = useRef(0);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      setSaving(false);
      setPhotoLoading(false);
      return;
    }
    if (wasOpen.current) {
      return;
    }
    wasOpen.current = true;
    session.current += 1;
    revokeLocal(formRef.current.localPhotoUrl);
    const next = profileToForm(userRef.current?.profile);
    baseline.current = next;
    savedPhotoUrl.current = next.profileImageUrl;
    pendingFile.current = null;
    removeSavedPhoto.current = false;
    setForm(next);
    setAvatarTab("face");
    setSaveError("");
    setPhotoError("");
    setPhotoLoading(false);
    setPhotoProgress(0);
    setSaving(false);
  }, [open]);

  function discard() {
    if (saving) {
      return;
    }
    session.current += 1;
    revokeLocal(formRef.current.localPhotoUrl);
    pendingFile.current = null;
    removeSavedPhoto.current = false;
    onClose();
  }

  async function onPick(file?: File) {
    if (!file || saving) {
      return;
    }
    const invalid = validateOnboardingPhoto(file);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
    if (invalid) {
      setPhotoError(invalid);
      return;
    }
    const ticket = session.current;
    setPhotoError("");
    const optimized = await prepareOnboardingPhoto(file);
    if (ticket !== session.current) {
      return;
    }
    pendingFile.current = optimized;
    removeSavedPhoto.current = false;
    const localUrl = URL.createObjectURL(optimized);
    setForm((current) => {
      revokeLocal(current.localPhotoUrl);
      return { ...current, profileImageType: "PHOTO", localPhotoUrl: localUrl };
    });
  }

  function onRemove() {
    if (saving) {
      return;
    }
    pendingFile.current = null;
    removeSavedPhoto.current = Boolean(savedPhotoUrl.current);
    setPhotoError("");
    setForm((current) => {
      revokeLocal(current.localPhotoUrl);
      return {
        ...current,
        profileImageUrl: null,
        localPhotoUrl: null,
        profileImageType: "AVATAR",
      };
    });
  }

  async function onSave() {
    if (saving) {
      return;
    }
    const draft = formRef.current;
    const base = baseline.current;
    const avatarChanged = JSON.stringify(draft.avatarConfig) !== JSON.stringify(base.avatarConfig);
    const typeChanged = draft.profileImageType !== base.profileImageType;
    const photoChanged = Boolean(pendingFile.current) || removeSavedPhoto.current;
    if (!avatarChanged && !typeChanged && !photoChanged) {
      discard();
      return;
    }

    setSaving(true);
    setSaveError("");
    setPhotoError("");
    let uploaded = false;
    try {
      let next = draft;
      if (draft.profileImageType === "PHOTO" && pendingFile.current) {
        setPhotoLoading(true);
        setPhotoProgress(8);
        const profile = await uploadOnboardingPhoto(pendingFile.current, setPhotoProgress);
        pendingFile.current = null;
        removeSavedPhoto.current = false;
        savedPhotoUrl.current = profile.profileImageUrl;
        uploaded = true;
        next = {
          ...draft,
          profileImageType: "PHOTO",
          profileImageUrl: profile.profileImageUrl,
          localPhotoUrl: null,
        };
        setForm((current) => ({
          ...current,
          profileImageType: "PHOTO",
          profileImageUrl: profile.profileImageUrl,
        }));
      } else if (removeSavedPhoto.current) {
        await deleteOnboardingPhoto();
        removeSavedPhoto.current = false;
        savedPhotoUrl.current = null;
        uploaded = true;
      }
      await saveOnboardingProfile({ ...next, localPhotoUrl: null }, false);
      revokeLocal(draft.localPhotoUrl);
      await refresh();
      onClose();
    } catch (error) {
      if (uploaded) {
        await refresh().catch(() => undefined);
      }
      const message = getApiErrorMessage(error, "No pudimos guardar tu imagen. Inténtalo de nuevo.");
      if (formRef.current.profileImageType === "PHOTO" && pendingFile.current) {
        setPhotoError(message);
      } else {
        setSaveError(message);
      }
      setSaving(false);
      setPhotoLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <AuthForgotModalLayout titleId="profile-image-title" className="profile-image-modal" onClose={discard}>
      <header className="profile-image-modal__header">
        <h1 id="profile-image-title" className="dash-profile__name">
          Tu imagen
        </h1>
        <p className="profile-image-modal__lead">Elige cómo quieres presentarte en Entre Caminos.</p>
      </header>
      <div className="profile-image-modal__body">
        <ProfileStep
          form={form}
          tab={avatarTab}
          photoLoading={photoLoading}
          photoProgress={photoProgress}
          photoError={photoError}
          fileInput={fileInput}
          primaryActionClassName="dash-exps-editorial__favorite"
          secondaryActionClassName="dash-exps-editorial__favorite"
          onMode={(profileImageType) => setForm((current) => ({ ...current, profileImageType }))}
          onForm={setForm}
          onPick={(file) => {
            void onPick(file);
          }}
          onRetry={() => {
            void onSave();
          }}
          onRemovePhoto={onRemove}
          onTab={setAvatarTab}
        />
        {saveError ? (
          <p className="onboarding-error" role="alert">
            {saveError}
          </p>
        ) : null}
        <div className="profile-image-modal__save">
          <button type="button" className="profile-image-modal__secondary" disabled={saving} onClick={discard}>
            Cancelar
          </button>
          <button type="button" className="tourist-hero__cta" disabled={saving} onClick={() => void onSave()}>
            Guardar
          </button>
        </div>
      </div>
    </AuthForgotModalLayout>
  );
}
