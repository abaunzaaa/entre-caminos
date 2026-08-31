import type { AuthMode } from "./authArt";

const copy: Record<
  AuthMode,
  {
    title: string;
    description: string;
    action: string;
    artAlt: string;
  }
> = {
  register: {
    title: "¿Ya tienes una cuenta?",
    description: "Continúa tu camino con nosotros.",
    action: "Iniciar sesión",
    artAlt: "Ilustración de una viajera planificando experiencias",
  },
  login: {
    title: "¿Primera vez por aquí?",
    description: "Crea tu cuenta y empieza a descubrir experiencias para ti.",
    action: "Crear cuenta",
    artAlt: "Ilustración de inicio de sesión",
  },
};

export function AuthVisualPanel({
  mode,
  illustration,
  onAction,
}: {
  mode: AuthMode;
  illustration: string | null;
  onAction: () => void;
}) {
  const content = copy[mode];

  return (
    <div className={`auth-visual auth-visual--${mode}`}>
      <div className="auth-visual__content">
        <div className="auth-visual__art-slot" data-has-art={illustration ? "true" : "false"}>
          {illustration ? (
            <img src={illustration} alt={content.artAlt} className="auth-visual__art" />
          ) : null}
        </div>
        <div className="auth-visual__copy">
          <h2 className="auth-visual__title">{content.title}</h2>
          <p className="auth-visual__text">{content.description}</p>
          <button type="button" className="auth-panel-btn" onClick={onAction}>
            {content.action}
          </button>
        </div>
      </div>
    </div>
  );
}
