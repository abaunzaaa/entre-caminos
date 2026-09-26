import { describe, expect, it } from "vitest";
import { nameInitial, resolveAvatarUrl } from "./admin-avatar";

describe("resolveAvatarUrl", () => {
  it("usa User.avatarUrl cuando existe", () => {
    expect(
      resolveAvatarUrl({
        id: "u1",
        avatarUrl: "/uploads/avatars/u1.jpg",
        profile: { profileImageUrl: "/uploads/old.png", profileImageType: "PHOTO" },
      }),
    ).toBe("/uploads/avatars/u1.jpg");
  });

  it("usa la foto de onboarding si no hay avatarUrl", () => {
    expect(
      resolveAvatarUrl({
        id: "u1",
        avatarUrl: null,
        profile: { profileImageUrl: "/uploads/perfil.png", profileImageType: "PHOTO" },
      }),
    ).toBe("/uploads/perfil.png");
  });

  it("no usa la foto residual cuando el perfil es un avatar ilustrado", () => {
    expect(
      resolveAvatarUrl({
        id: "u1",
        avatarUrl: null,
        profile: { profileImageUrl: "/uploads/old.png", profileImageType: "AVATAR" },
      }),
    ).toBeNull();
  });
});

describe("nameInitial", () => {
  it("toma la primera letra del nombre", () => {
    expect(nameInitial("Juliana Restrepo")).toBe("J");
    expect(nameInitial("  ana")).toBe("A");
    expect(nameInitial("", "U")).toBe("U");
  });
});
