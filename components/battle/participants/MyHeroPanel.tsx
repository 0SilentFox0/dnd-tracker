"use client";

import { memo } from "react";
import { Heart, Shield } from "lucide-react";

import { HitFrame, PortraitFx } from "@/components/battle/fx/PortraitFx";
import { EffectLine, HealthBar, SlotGrid, ZoomablePortrait } from "@/components/battle/hud";
import { BattleStatus } from "@/lib/constants/battle";
import { useBattleSceneData, useFxImpact, useHitFx } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { abilityCharges, NO_EFFECTS, turnsUntil } from "@/lib/utils/battle/view";
import { signed } from "@/lib/utils/common/format";
import type { BattleParticipant } from "@/types/battle";

export const MyHeroPanel = memo(function MyHeroPanel({ hero, compact = false }: { hero: BattleParticipant; compact?: boolean }) {
  const { battle, queue, isMyTurn, effects } = useBattleSceneData();

  const heroEffects = effects.get(hero.basicInfo.id) ?? NO_EFFECTS;

  const { change, shakeRef, delayStyle } = useHitFx<HTMLDivElement>(hero.combatStats.currentHp, useFxImpact(hero.basicInfo.id));

  const until = turnsUntil(queue, [hero.basicInfo.id]);

  const charges = abilityCharges(hero);

  const morale = effectiveMorale(hero, battle.initiativeOrder).value;

  return (
    <div ref={shakeRef} className="relative">
      <HitFrame change={change} />
      {change && change.delta < 0 && <div key={change.id} style={delayStyle} className="pointer-events-none fixed inset-0 z-40 animate-[hud-vignette_1s]" />}
      <div className="flex items-center gap-3">
        <PortraitFx effects={heroEffects} size={compact ? 48 : 64}>
          <ZoomablePortrait participant={hero} fx="main" size={compact ? 48 : 64} me />
        </PortraitFx>
        <div className="min-w-0 flex-1">
          <div className="hud-sc flex h-6 items-center justify-between text-[19px] font-bold text-[var(--ink)]">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate">{hero.basicInfo.name}</span>
              {morale !== 0 && <span className={cn("shrink-0 font-sans text-sm font-medium tracking-normal", morale > 0 ? "text-hud-good" : "text-hud-danger")}>Мораль {signed(morale)}</span>}
            </span>
            <span className="shrink-0 whitespace-nowrap pl-2 font-sans text-sm font-normal italic tracking-normal text-[#b8ab95]">
              {compact ? `${hero.combatStats.currentHp} / ${hero.combatStats.maxHp} · AC ${getEffectiveArmorClass(hero, battle.initiativeOrder)}` : battle.status !== BattleStatus.ACTIVE ? "" : isMyTurn ? "твій хід" : until === 0 ? "ходить" : until !== null ? `хід через ${until}` : ""}
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
      {!compact && charges.length > 0 && (
        <div className="mt-2.5 flex h-6 items-center gap-4 text-sm text-[#d6cbb7]">
          {charges.map((c) => <span key={c.key}>{c.name} {c.left}/{c.limit}</span>)}
        </div>
      )}
      {!compact && <EffectLine effects={heroEffects} />}
    </div>
  );
});
