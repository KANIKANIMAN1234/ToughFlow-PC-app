import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-caption font-medium text-apple-text">{label}</span>
      )}
      <input
        className={cn(
          "w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-body text-apple-text focus-apple",
          className
        )}
        {...props}
      />
    </label>
  );
}
