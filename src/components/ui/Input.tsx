import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <input
        className={cn(
          "w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500",
          className
        )}
        {...props}
      />
    </label>
  );
}
