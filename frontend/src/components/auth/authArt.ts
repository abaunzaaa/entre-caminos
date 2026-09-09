import scenicPhoto from "../../assets/encabezado.png";

export type AuthMode = "register" | "login";

/** Paisaje local reutilizado en el panel visual de autenticación. */
export const authScenicPhoto = scenicPhoto;

/**
 * Fotografía del panel visual.
 * La misma imagen se usa en login y registro para que el panel
 * se desplace como una sola pieza, sin cruzar ilustraciones.
 */
export const authArt: Record<AuthMode, string> = {
  register: scenicPhoto,
  login: scenicPhoto,
};
