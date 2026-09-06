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
      <span className="font-poppins text-[13px] font-medium tracking-normal text-neutral-500">{label}</span>
      <input
        className={cn(
          "w-full rounded-xl border border-forest/10 bg-white px-4 py-3 font-poppins text-[15px] font-normal text-ink outline-none transition focus:ring-2 focus:ring-forest/15",
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
