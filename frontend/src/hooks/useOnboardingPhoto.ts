import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { deleteOnboardingPhoto, uploadOnboardingPhoto } from "../services/onboarding.service";
import { getApiErrorMessage } from "../utils/api-error";
import { prepareOnboardingPhoto } from "../utils/onboarding-photo";
import { validateOnboardingPhoto, type OnboardingForm } from "../utils/onboarding";

export function useOnboardingPhoto(setForm: Dispatch<SetStateAction<OnboardingForm>>) {
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoProgress, setPhotoProgress] = useState(0);

  const uploadSelectedPhoto = useCallback(
    async (file: File) => {
      try {
        setPhotoLoading(true);
        setPhotoProgress(8);
        setPhotoError("");
        const profile = await uploadOnboardingPhoto(file, setPhotoProgress);
        setForm((current) => ({
          ...current,
          profileImageType: "PHOTO",
          profileImageUrl: profile.profileImageUrl,
        }));
        return true;
      } catch (error) {
        setPhotoError(getApiErrorMessage(error, "No se pudo subir la foto. Puedes reintentar."));
        return false;
      } finally {
        setPhotoLoading(false);
      }
    },
    [setForm],
  );

  const onPick = useCallback(
    async (file?: File) => {
      if (!file) {
        return false;
      }
      const invalid = validateOnboardingPhoto(file);
      if (invalid) {
        setPhotoError(invalid);
        return false;
      }
      pendingFile.current = file;
      const localUrl = URL.createObjectURL(file);
      setForm((current) => {
        if (current.localPhotoUrl) {
          URL.revokeObjectURL(current.localPhotoUrl);
        }
        return { ...current, profileImageType: "PHOTO", localPhotoUrl: localUrl };
      });
      const optimized = await prepareOnboardingPhoto(file);
      pendingFile.current = optimized;
      const uploaded = await uploadSelectedPhoto(optimized);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      return uploaded;
    },
    [setForm, uploadSelectedPhoto],
  );

  const onRetry = useCallback(() => {
    if (pendingFile.current) {
      return uploadSelectedPhoto(pendingFile.current);
    }
    return Promise.resolve(false);
  }, [uploadSelectedPhoto]);

  const onRemove = useCallback(async () => {
    const profile = await deleteOnboardingPhoto();
    setForm((current) => {
      if (current.localPhotoUrl) {
        URL.revokeObjectURL(current.localPhotoUrl);
      }
      return {
        ...current,
        profileImageUrl: profile.profileImageUrl,
        localPhotoUrl: null,
        profileImageType: "AVATAR",
      };
    });
    pendingFile.current = null;
    setPhotoError("");
  }, [setForm]);

  return {
    fileInput,
    photoLoading,
    photoError,
    photoProgress,
    setPhotoError,
    onPick,
    onRetry,
    onRemove,
  };
}
