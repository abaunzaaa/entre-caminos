const STORAGE_PREFIX = "ec_admin_avatar_";
const AVATAR_SIZE = 256;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readAdminAvatar(userId: string | undefined | null) {
  if (!userId) {
    return null;
  }
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export const ADMIN_AVATAR_EVENT = "ec-admin-avatar-change";

export function saveAdminAvatar(userId: string, dataUrl: string) {
  try {
    window.localStorage.setItem(storageKey(userId), dataUrl);
    window.dispatchEvent(new Event(ADMIN_AVATAR_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAdminAvatar(userId: string) {
  try {
    window.localStorage.removeItem(storageKey(userId));
    window.dispatchEvent(new Event(ADMIN_AVATAR_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

export function fileToAvatarDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("No se pudo procesar la imagen"));
          return;
        }
        const scale = Math.max(AVATAR_SIZE / image.width, AVATAR_SIZE / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (AVATAR_SIZE - width) / 2, (AVATAR_SIZE - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.onerror = () => reject(new Error("La imagen no es válida"));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
