import { cn } from "@/lib/utils";

export function DataTable({
  columns,
  rows,
  onRowClick,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: Record<string, React.ReactNode>[];
  onRowClick?: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-surface-border">
      <table className="min-w-full divide-y divide-surface-border text-body">
        <thead className="bg-apple-section">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-caption font-semibold text-apple-glyph",
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border bg-white">
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-caption text-apple-glyph"
              >
                データがありません
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                onRowClick && "cursor-pointer transition-colors hover:bg-apple-section/60"
              )}
              onClick={() => onRowClick?.(i)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("px-4 py-3 text-apple-text", col.className)}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
