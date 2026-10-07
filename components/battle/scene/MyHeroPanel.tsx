"use client";

import { memo } from "react";
import { Heart, Shield } from "lucide-react";

import { EffectLine, HealthBar, Portrait, SlotGrid } from "@/components/battle/hud";
import { useBattleSceneData, useHpChange } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { abilityCharges, turnsUntil } from "@/lib/utils/battle/view";
import { signed } from "@/lib/utils/format";
import type { BattleParticipant } from "@/types/battle";

export const MyHeroPanel = memo(function MyHeroPanel({ hero, compact = false }: { hero: BattleParticipant; compact?: boolean }) {
  const { battle, queue, isMyTurn } = useBattleSceneData();

  const change = useHpChange(hero.combatStats.currentHp);

  const until = turnsUntil(queue, [hero.basicInfo.id]);

  const charges = abilityCharges(hero);

  const morale = hero.combatStats.morale;

  return (
    <div key={change?.id} className={cn("relative", change && change.delta < 0 && "animate-[hud-shake_.35s]")}>
      {change && change.delta < 0 && <div className="pointer-events-none fixed inset-0 z-40 animate-[hud-vignette_1s]" />}
      <div className="flex items-center gap-3">
        <Portrait participant={hero} size={compact ? 48 : 64} me />
        <div className="min-w-0 flex-1">
          <div className="hud-sc flex h-6 items-center justify-between text-[19px] font-bold text-[var(--ink)]">
            <span className="truncate">{hero.basicInfo.name}</span>
            <span className="shrink-0 whitespace-nowrap pl-2 font-sans text-sm font-normal italic tracking-normal text-[#b8ab95]">
              {compact ? `${hero.combatStats.currentHp} / ${hero.combatStats.maxHp} · AC ${getEffectiveArmorClass(hero, battle.initiativeOrder)}` : battle.status !== "active" ? "" : isMyTurn ? "твій хід" : until === 0 ? "ходить" : until !== null ? `хід через ${until}` : ""}
            </span>
          </div>
          <HealthBar participant={hero} exact className="h-1.5" />
          {!compact && (
            <div className="mt-1.5 flex h-6 items-center gap-4 text-[15px] text-[#d6cbb7]">
              <span className="flex items-center gap-1.5"><Heart className="size-4 text-[var(--enemy)]" />{hero.combatStats.currentHp} / {hero.combatStats.maxHp}</span>
              <span className="flex items-center gap-1.5"><Shield className="size-4 text-[#b8ab95]" />{getEffectiveArmorClass(hero, battle.initiativeOrder)}</span>
            </div>
          )}
        </div>
      </div>
      {!compact && <SlotGrid participant={hero} />}
      {!compact && (morale !== 0 || charges.length > 0) && (
        <div className="mt-2.5 flex h-6 items-center gap-4 text-sm text-[#d6cbb7]">
          {morale !== 0 && <span>Мораль <span className={morale > 0 ? "text-[#9fc48a]" : "text-[#d0705c]"}>{signed(morale)}</span></span>}
          {charges.map((c) => <span key={c.key}>{c.name} {c.left}/{c.limit}</span>)}
        </div>
      )}
      {!compact && <EffectLine effects={hero.battleData.activeEffects} />}
    </div>
  );
});
