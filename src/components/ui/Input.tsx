import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label;
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-caption font-medium text-apple-text">{label}</span>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body text-apple-text focus-apple",
          className
        )}
        {...props}
      />
      {hint && (
        <span className="text-nav-link text-apple-glyph">{hint}</span>
      )}
    </label>
  );
}
