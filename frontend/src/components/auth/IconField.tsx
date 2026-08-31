import type { InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../utils/cn";

type IconFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode;
  error?: string;
};

export function IconField({ icon, error, type, className, ...props }: IconFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-[#E0E0E0] bg-white px-4 py-3.5",
          error && "border-red-400",
          className,
        )}
      >
        <span className="text-neutral-400">{icon}</span>
        <input
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-neutral-400"
          type={isPassword && visible ? "text" : type}
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setVisible((value) => !value)} className="text-neutral-400" tabIndex={-1}>
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
