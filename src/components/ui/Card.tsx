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
        "rounded-xl border border-surface-border bg-white shadow-sm",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b px-5 py-4">
          {title && <h2 className="font-bold text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
