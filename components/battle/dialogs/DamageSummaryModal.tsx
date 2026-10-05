"use client";

import {
  DamageSummaryContent,
  requestKey,
} from "./DamageSummaryContent";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

interface DamageSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attacker: BattleParticipant;
  target: BattleParticipant;
  /** При кількох цілях передати масив; тоді API викликається з targetIds і показується блок на ціль */
  targets?: BattleParticipant[];
  attack: BattleAttack;
  damageRolls: number[];
  /** @deprecated API fetches battle from DB; kept for backward compat with callers */
  allParticipants?: BattleParticipant[];
  isCritical?: boolean;
  campaignId: string;
  battleId: string;
  onApply: () => void;
}

export function DamageSummaryModal({
  open,
  onOpenChange,
  attacker,
  target,
  targets: targetsProp,
  attack,
  damageRolls,
  isCritical = false,
  campaignId,
  battleId,
  onApply,
}: DamageSummaryModalProps) {
  const targets = targetsProp && targetsProp.length > 0 ? targetsProp : [target];

  const targetIds = targets.map((t) => t.basicInfo.id);

  const contentKey =
    open && damageRolls.length > 0
      ? requestKey(
          attacker.basicInfo.id,
          targetIds,
          attack.id ?? undefined,
          attack.name ?? "",
          isCritical,
          damageRolls,
        )
      : "closed";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="💥 Підсумок урону" description={`${attacker.basicInfo.name} → ${targets.map((t) => t.basicInfo.name).join(", ")}${isCritical ? " (крит!)" : ""}`} size="sm">
        {open && damageRolls.length > 0 ? (
          <DamageSummaryContent
            key={contentKey}
            campaignId={campaignId}
            battleId={battleId}
            attacker={attacker}
            target={target}
            targets={targets.length > 1 ? targets : undefined}
            attack={attack}
            damageRolls={damageRolls}
            isCritical={isCritical}
            onApply={onApply}
            onOpenChange={onOpenChange}
          />
        ) : (
          <>
            <div className="min-h-[120px] py-2" />
            <div className="flex gap-2 pt-2 [&>*]:flex-1 sm:justify-end sm:[&>*]:flex-none">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Скасувати
              </Button>
            </div>
          </>
        )}
      
    </ResponsiveDialog>
  );
}
