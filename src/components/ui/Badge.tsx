import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    default: "bg-apple-section text-apple-text",
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-900",
    danger: "bg-red-50 text-red-800",
    info: "bg-brand-50 text-brand-700",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-pill px-2.5 py-0.5 text-nav-link font-normal",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}
