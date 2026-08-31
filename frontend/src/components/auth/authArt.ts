import crearCuentaArt from "../../assets/crear_cuenta.png";

export type AuthMode = "register" | "login";

/**
 * Ilustraciones del panel visual.
 * `login` queda en null a propósito: otra integrante añadirá iniciar_sesion.png
 * sin reconstruir la animación ni este contenedor.
 */
export const authArt: Record<AuthMode, string | null> = {
  register: crearCuentaArt,
  login: null,
};
