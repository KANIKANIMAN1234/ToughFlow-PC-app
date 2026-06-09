"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-card border border-surface-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left focus-apple"
      >
        <div>
          <p className="text-body font-medium text-apple-text">{title}</p>
          {description && (
            <p className="mt-0.5 text-caption text-apple-glyph">{description}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-apple-glyph transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>
      {open && <div className="border-t border-surface-border px-4 py-4">{children}</div>}
    </div>
  );
}
