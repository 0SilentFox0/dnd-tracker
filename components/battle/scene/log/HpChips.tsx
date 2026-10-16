import { cn } from "@/lib/utils";
import type { LogEntryView } from "@/lib/utils/battle/view";

export function HpChips({ hp }: { hp: LogEntryView["hp"] }) {
  if (hp.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {hp.map((h) => (
        <span key={h.id} className={cn("rounded-sm px-1.5 text-[12px] leading-[18px]", h.delta < 0 ? "bg-hud-danger/15 text-hud-bad" : "bg-hud-good-dim/15 text-hud-good")}>
          {h.name} {h.delta > 0 ? `+${h.delta}` : `−${-h.delta}`}
        </span>
      ))}
    </div>
  );
}
