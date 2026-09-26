import { useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../utils/cn";

type FieldProps = {
  label: string;
  error?: string;
  passwordToggle?: boolean;
};

export function Input({
  label,
  error,
  passwordToggle = false,
  className,
  type,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const canToggle = passwordToggle && type === "password";

  return (
    <label className="block space-y-2">
      <span className="font-poppins text-[13px] font-medium tracking-normal text-neutral-500">{label}</span>
      <span className={canToggle ? "admin-field__control" : "block"}>
        <input
          type={canToggle && visible ? "text" : type}
          className={cn(
            "w-full rounded-xl border border-forest/10 bg-white px-4 py-3 font-poppins text-[15px] font-normal text-ink outline-none transition focus:ring-2 focus:ring-forest/15",
            canToggle && "pr-11",
            error && "border-red-400",
            className,
          )}
          {...props}
        />
        {canToggle ? (
          <button
            type="button"
            className="admin-field__toggle"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOff size={18} strokeWidth={1.7} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.7} aria-hidden="true" />}
          </button>
        ) : null}
      </span>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}

export function Textarea({
  label,
  error,
  className,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-2">
      <span className="font-poppins text-[13px] font-medium tracking-normal text-neutral-500">{label}</span>
      <textarea
        className={cn(
          "min-h-28 w-full rounded-xl border border-forest/10 bg-white px-4 py-3 font-poppins text-[15px] font-normal text-ink outline-none transition focus:ring-2 focus:ring-forest/15",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}
