import { AuthFormBrand } from "./AuthFormBrand";
import type { AuthMode } from "./authArt";

const WAVE_PATH = "M100 0C58 90 14 200 22 360 30 520 86 590 72 740 58 890 40 940 100 1000V0Z";

function AuthWave({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
      <path d={WAVE_PATH} />
    </svg>
  );
}

export function AuthVisualPanel({
  mode,
  photo,
}: {
  mode: AuthMode;
  photo: string;
}) {
  return (
    <div className={`auth-visual auth-visual--${mode}`}>
      <img
        src={photo}
        alt="Pareja recorriendo un lago entre bosques"
        className="auth-visual__photo"
      />
      <div className="auth-visual__veil" aria-hidden="true" />
      <AuthFormBrand variant="visual" hidden={mode === "login"} />
      <AuthWave className="auth-visual__wave auth-visual__wave--end" />
      <AuthWave className="auth-visual__wave auth-visual__wave--start" />
    </div>
  );
}
