import { cn } from "@/lib/utils";

export function LoadingState({ rows = 3, label = "Завантаження…", className }: { rows?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn("space-y-2", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} data-slot="skeleton-row" className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
