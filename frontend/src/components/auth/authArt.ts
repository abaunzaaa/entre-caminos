import scenicPhoto from "../../assets/auth-scenic.jpg";

export type AuthMode = "register" | "login";

/** Fotografía editorial del panel visual de autenticación. */
export const authScenicPhoto = scenicPhoto;

export const authArt: Record<AuthMode, string> = {
  register: scenicPhoto,
  login: scenicPhoto,
};
