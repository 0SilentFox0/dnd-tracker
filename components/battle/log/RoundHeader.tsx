import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function RoundHeader({ round, count, collapsed, onToggle }: { round: number; count: number; collapsed: boolean; onToggle: (round: number) => void }) {
  const t = useTranslations("battle.log");

  return (
    <button type="button" aria-expanded={!collapsed} onClick={() => onToggle(round)} className="hud-sc sticky top-0 z-[1] flex w-full items-center gap-2 bg-[#120e0b]/95 py-1.5 text-xs tracking-[.08em] text-[var(--hud-muted)] hover:text-[var(--ink)]">
      <span className="h-px flex-1 bg-white/10" />
      <ChevronDown className={cn("size-3.5 transition-transform", collapsed && "-rotate-90")} />
      {t("round", { round })}
      {collapsed && <span className="font-sans text-[11px] tracking-normal">· {count}</span>}
      <span className="h-px flex-1 bg-white/10" />
    </button>
  );
}
