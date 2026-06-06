import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-apple",
  secondary:
    "border border-brand-600 bg-transparent text-brand-600 hover:bg-brand-50 focus-apple",
  ghost:
    "bg-transparent text-apple-text hover:bg-apple-section focus-apple",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-apple",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-apple",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill font-normal transition-colors disabled:opacity-50",
        size === "sm"
          ? "px-4 py-1.5 text-nav-link"
          : "px-[22px] py-2 text-body",
        variants[variant],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
