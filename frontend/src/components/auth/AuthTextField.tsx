import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../utils/cn";

type AuthTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function AuthTextField({ label, error, type, className, id, ...props }: AuthTextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={fieldId}>
        {label}
      </label>
      <div className={cn("auth-field__control", error && "auth-field__control--error")}>
        <input
          id={fieldId}
          className={cn("auth-field__input", className)}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-field__toggle"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="auth-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
