import { cn } from "@/lib/utils";

interface HudStatChipProps {
  short: string;
  value: string | number;
  label?: string;
  size?: "md" | "lg";
}

export function HudStatChip({ short, value, label, size = "md" }: HudStatChipProps) {
  return (
    <div aria-label={label} className="min-w-0 flex-1 rounded-lg border border-hud-line bg-[#1c1610] px-1 py-1 text-center">
      <b className={cn("block truncate text-hud-ink", size === "lg" ? "text-lg leading-6" : "text-base leading-5")}>{value}</b>
      <span className="text-[10px] uppercase text-hud-muted">{short}</span>
    </div>
  );
}
