import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type FieldProps = {
  label: string;
  error?: string;
};

export function Input({
  label,
  error,
  className,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      <input
        className={cn(
          "w-full rounded-none border border-black bg-white px-4 py-3 text-ink outline-none transition focus:ring-1 focus:ring-black",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
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
      <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      <textarea
        className={cn(
          "min-h-28 w-full rounded-none border border-black bg-white px-4 py-3 text-ink outline-none transition focus:ring-1 focus:ring-black",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}
