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
    <div className="overflow-x-auto rounded-lg border border-surface-border">
      <table className="min-w-full divide-y divide-surface-border text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left font-semibold text-slate-600",
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
                className="px-4 py-8 text-center text-slate-400"
              >
                データがありません
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(onRowClick && "cursor-pointer hover:bg-brand-50/50")}
              onClick={() => onRowClick?.(i)}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3", col.className)}>
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
