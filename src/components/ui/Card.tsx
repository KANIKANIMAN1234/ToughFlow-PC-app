import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-surface-border bg-surface-card",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          {title && (
            <h2 className="apple-heading text-body font-semibold">{title}</h2>
          )}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}
