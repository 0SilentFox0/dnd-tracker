import { cn } from "@/lib/utils";

export function ArtifactDeltaBadge({
  value,
  isPercentage,
  className,
}: {
  value: number;
  /** Додає «%» після числа (зелений/червоний як для плоского бонусу). */
  isPercentage?: boolean;
  className?: string;
}) {
  if (!value) return null;

  const text = value > 0 ? `+${value}` : String(value);

  return (
    <span
      className={cn(
        "tabular-nums text-sm font-semibold",
        value > 0 && "text-green-600 dark:text-green-500",
        value < 0 && "text-red-600 dark:text-red-500",
        className,
      )}
      title="Зміна від екіпірованих артефактів (лише носій)"
    >
      {text}
      {isPercentage ? "%" : ""}
    </span>
  );
}
