"use client";

import { useTranslations } from "next-intl";
import { Swords, Zap } from "lucide-react";

import { useAbilityText } from "@/components/abilities/use-ability-text";
import { HealthLabel } from "@/components/battle/hud";
import { AbilityAimPanel } from "@/components/battle/wizards/AbilityAimPanel";
import { TargetButton } from "@/components/battle/wizards/TargetButton";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { useAbilityPicker } from "@/lib/hooks/battle";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import { abilityLabel } from "@/lib/utils/abilities/build/resolve";
import { canOffHandAttack } from "@/lib/utils/battle/attack/attacks-left";
import type { BattleParticipant } from "@/types/battle";

export function BonusActionPicker({ participant, open, onOpenChange, onDone, trigger = "bonusAction", onOffHand }: { participant: BattleParticipant; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void; trigger?: "bonusAction" | "action"; onOffHand?: () => void }) {
  const t = useTranslations("battleWizards");

  const text = useText();

  const { abilities, isPending, aiming, mapAim, pick, reset } = useAbilityPicker(participant, trigger, { onOpenChange, onDone });

  const abilityText = useAbilityText();

  const { ability, side, max, candidates, picked } = aiming;

  const changeOpen = (o: boolean) => {
    if (!o) reset();

    onOpenChange(o);
  };

  return (
    <>
      {mapAim.ability && <AbilityAimPanel name={text(abilityLabel(mapAim.ability))} onCancel={mapAim.cancel} />}
      <ResponsiveDialog open={open} onOpenChange={changeOpen} title={ability ? t("bonus.target", { name: text(abilityLabel(ability)) }) : trigger === "action" ? t("bonus.ability") : t("bonus.title")} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        <div className="space-y-2">
          {!ability && trigger === "bonusAction" && onOffHand && canOffHandAttack(participant) && (
            <button type="button" disabled={isPending} onClick={() => { onOpenChange(false); onOffHand(); }} className="flex min-h-14 w-full items-center gap-3 border border-white/15 px-3 py-2.5 text-left disabled:opacity-50">
              <Swords className="size-10 p-2 text-[var(--gold)]" />
              <span className="hud-sc block font-bold">{t("bonus.offHand")}</span>
            </button>
          )}
          {!ability && abilities.map(({ ability: a, cooldownLeft, pool }) => {
            const icon = a.icon ?? a.source.icon;

            return (
            <button key={a.key} type="button" disabled={cooldownLeft > 0 || isPending} onClick={() => pick(a)} className="flex min-h-14 w-full items-center gap-3 border border-white/15 px-3 py-2.5 text-left disabled:opacity-50">
              {icon ? <OptimizedImage src={icon} alt="" width={40} height={40} className="size-10 shrink-0 rounded object-cover" /> : <Zap className="size-10 shrink-0 p-2 text-[var(--gold)]" />}
              <span className="min-w-0">
                <span className="hud-sc block font-bold">{text(abilityLabel(a))}{cooldownLeft > 0 && <span className="ml-2 text-xs font-normal text-[#a89c88]">{t("bonus.cooldown", { rounds: cooldownLeft })}</span>}{pool && <span className="ml-2 text-xs font-normal text-[#a89c88]">{pool.label} {pool.left}/{pool.max} · −{pool.cost}</span>}</span>
                <span className="line-clamp-2 text-xs text-[#a89c88]">{a.details ? text(a.details) : (a.description ?? a.effects.map(abilityText.effect).join(", "))}</span>
              </span>
            </button>
            );
          })}
          {ability && candidates.map((t) => (
            <TargetButton
              key={t.basicInfo.id}
              participant={t}
              tone="gold"
              selected={picked.includes(t.basicInfo.id)}
              disabled={isPending}
              onClick={() => aiming.choose(t.basicInfo.id)}
              trailing={side === ParticipantSide.ENEMY ? <HealthLabel participant={t} /> : <span className="ml-auto text-sm text-[#d6cbb7]">{t.combatStats.currentHp} / {t.combatStats.maxHp}</span>}
            />
          ))}
          {ability && max > 1 && (
            <button type="button" disabled={picked.length === 0 || isPending} onClick={aiming.confirm} className="hud-sc flex h-12 w-full items-center justify-center border border-[var(--gold)] disabled:opacity-40">
              {t("bonus.confirm", { picked: picked.length, max })}
            </button>
          )}
        </div>
      </ResponsiveDialog>
    </>
  );
}
