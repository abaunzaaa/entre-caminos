import { describe, expect, it } from "vitest";
import type { AvatarConfig } from "../types";
import { reviewAuthorAvatarConfig, reviewAuthorPhotoUrl, type ReviewAuthor } from "./review-author";

const doll = { skinTone: "sand", face: "round" } as AvatarConfig;

function author(partial: Partial<ReviewAuthor> & { profile?: ReviewAuthor["profile"] }): ReviewAuthor {
  return {
    id: "user-1",
    name: "Ana Ruiz",
    avatarUrl: null,
    profile: null,
    ...partial,
  };
}

describe("avatar de reseñas", () => {
  it("usa la foto de perfil cuando eligió foto", () => {
    const user = author({
      avatarUrl: "https://cdn.example/espejo.jpg",
      profile: { profileImageUrl: "https://cdn.example/foto.jpg", profileImageType: "PHOTO", avatarConfig: doll },
    });
    expect(reviewAuthorPhotoUrl(user)).toBe("https://cdn.example/foto.jpg");
    expect(reviewAuthorAvatarConfig(user, false)).toBeNull();
  });

  it("usa el espejo de User.avatarUrl si no hay foto en el perfil", () => {
    const user = author({ avatarUrl: "https://cdn.example/espejo.jpg" });
    expect(reviewAuthorPhotoUrl(user)).toBe("https://cdn.example/espejo.jpg");
    expect(reviewAuthorAvatarConfig(user, false)).toBeNull();
  });

  it("usa la muñeca si eligió avatar, aunque exista una url vieja", () => {
    const user = author({
      avatarUrl: "https://cdn.example/vieja.jpg",
      profile: { profileImageUrl: "https://cdn.example/vieja.jpg", profileImageType: "AVATAR", avatarConfig: doll },
    });
    expect(reviewAuthorPhotoUrl(user)).toBe("");
    expect(reviewAuthorAvatarConfig(user, false)).toBe(doll);
  });

  it("si la foto falla, pasa a la muñeca", () => {
    const user = author({
      profile: { profileImageUrl: "https://cdn.example/rota.jpg", profileImageType: "PHOTO", avatarConfig: doll },
    });
    expect(reviewAuthorPhotoUrl(user)).toBe("https://cdn.example/rota.jpg");
    expect(reviewAuthorAvatarConfig(user, true)).toBe(doll);
  });

  it("sin foto ni muñeca no hay imagen", () => {
    const user = author({ profile: { profileImageUrl: null, profileImageType: "PHOTO", avatarConfig: null } });
    expect(reviewAuthorPhotoUrl(user)).toBe("");
    expect(reviewAuthorAvatarConfig(user, false)).toBeNull();
    expect(reviewAuthorAvatarConfig(user, true)).toBeNull();
  });
});
