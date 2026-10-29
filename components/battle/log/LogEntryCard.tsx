import { memo, type ReactNode, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Flame, Frown, Hourglass, type LucideIcon, ScrollText, Shield, Sparkles, Star, Swords, Zap } from "lucide-react";

import { HpChips } from "./HpChips";

import { Portrait } from "@/components/battle/hud";
import { LogEntryDetails } from "@/components/battle/log/LogEntryDetails";
import { ParticipantSide } from "@/lib/constants/battle";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { logEntryView } from "@/lib/utils/battle/view";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const ICON: Record<BattleAction["actionType"], LucideIcon> = {
  attack: Swords,
  spell: Sparkles,
  bonus_action: Zap,
  ability: Star,
  end_turn: Hourglass,
  skip_turn: Hourglass,
  morale_skip: Frown,
  retaliation: Shield,
};

export const LogEntryCard = memo(function LogEntryCard({ entry, actor, open, onToggle, actions }: {
  entry: BattleAction;
  actor: BattleParticipant | undefined;
  open: boolean;
  onToggle: (actionIndex: number) => void;
  actions?: ReactNode;
}) {
  const t = useTranslations("battle.log");

  const text = useText();

  const view = useMemo(() => logEntryView(entry), [entry]);

  const Icon = view.kind === "hazard" ? Flame : (ICON[entry.actionType] ?? Sparkles);

  const enemy = entry.actorSide === ParticipantSide.ENEMY;

  return (
    <div className={cn("my-1.5 flex gap-2.5 rounded-sm border-l-2 bg-white/[.03] px-2.5 py-2", enemy ? "border-hud-danger/70" : "border-hud-good-dim/70", entry.isCancelled && "opacity-40 line-through")}>
      <span className="relative mt-0.5 shrink-0">
        {actor ? <Portrait participant={actor} size={28} /> : <span className="flex size-7 items-center justify-center rounded-full bg-white/5 text-[var(--hud-muted)] ring-1 ring-white/10"><ScrollText className="size-3.5" /></span>}
        <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#1a140f] text-[var(--gold)] ring-1 ring-white/15">
          <Icon className="size-2.5" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline gap-1.5 text-[11.5px] leading-4">
          <span className={cn("hud-sc font-bold", enemy ? "text-hud-bad" : "text-hud-good")}>{actor?.basicInfo.name ?? (entry.actorName || t("battle"))}</span>
          <span className="text-[var(--hud-muted)]">· {actor && !view.isTrigger ? text(view.kindLabel) : t("triggers")}</span>
        </div>
        <div className="text-[13.5px] font-medium leading-[18px] text-[var(--ink)]">{text(view.headline)}</div>
        {view.lines.map((line, n) => (
          <div key={n} className="mt-0.5 text-[12.5px] leading-[17px] text-[#b3a791]">{text(line)}</div>
        ))}
        <HpChips hp={view.hp} />
        {view.hasDetails && (
          <button type="button" aria-expanded={open} onClick={() => onToggle(entry.actionIndex)} className="mt-1 flex items-center gap-1 text-[12px] text-[var(--hud-muted)] hover:text-[var(--ink)]">
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            {open ? t("hideDetails") : t("details")}
          </button>
        )}
        {open && <LogEntryDetails action={entry} />}
      </div>
      {actions && <div className="shrink-0 self-start">{actions}</div>}
    </div>
  );
});
