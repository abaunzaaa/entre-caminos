import type { AuthMode } from "./authArt";

const copy = {
  title: "Cada camino guarda una historia",
  description:
    "Descubre experiencias que te conectan con nuevos lugares, personas y recuerdos.",
  artAlt: "Colinas verdes de Antioquia, un paisaje para recorrer",
  actions: {
    login: "Crear cuenta",
    register: "Iniciar sesión",
  },
} as const;

export function AuthVisualPanel({
  mode,
  photo,
  onAction,
}: {
  mode: AuthMode;
  photo: string;
  onAction?: () => void;
}) {
  return (
    <div className={`auth-visual auth-visual--${mode}`}>
      <img src={photo} alt={copy.artAlt} className="auth-visual__photo" />
      <div className="auth-visual__veil" aria-hidden="true" />
      <svg className="auth-visual__wave" viewBox="0 0 180 900" preserveAspectRatio="none" aria-hidden="true">
        <path d="M180 0C70 70 10 160 90 280c80 120-20 170-70 280-52 114 48 210 10 340h150V0Z" />
      </svg>
      <div className="auth-visual__content">
        <div className="auth-visual__copy">
          <h2 className="auth-visual__title">{copy.title}</h2>
          <p className="auth-visual__text">{copy.description}</p>
          {onAction ? (
            <button type="button" className="auth-panel-btn" onClick={onAction}>
              {copy.actions[mode]}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
