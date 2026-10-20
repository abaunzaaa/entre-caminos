import type { AvatarConfig, ProfileImageType } from "../types";

export type ReviewAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  profile: {
    profileImageUrl: string | null;
    profileImageType: ProfileImageType | null;
    avatarConfig: AvatarConfig | null;
  } | null;
};

/** Foto real: la del perfil si eligió foto, o el espejo en User.avatarUrl. */
export function reviewAuthorPhotoUrl(author: ReviewAuthor) {
  if (author.profile?.profileImageType === "AVATAR") {
    return "";
  }
  return author.profile?.profileImageUrl?.trim() || author.avatarUrl?.trim() || "";
}

/** Muñeca configurada. También sirve si la foto no carga. */
export function reviewAuthorAvatarConfig(author: ReviewAuthor, photoFailed: boolean) {
  const config = author.profile?.avatarConfig ?? null;
  if (!config) {
    return null;
  }
  if (author.profile?.profileImageType === "AVATAR" || photoFailed || !reviewAuthorPhotoUrl(author)) {
    return config;
  }
  return null;
}
