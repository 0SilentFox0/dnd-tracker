"use client";

import {
  DamageSummaryContent,
  requestKey,
} from "./DamageSummaryContent";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[110]">
        <DialogHeader>
          <DialogTitle>💥 Підсумок урону</DialogTitle>
          <DialogDescription>
            {attacker.basicInfo.name} → {targets.map((t) => t.basicInfo.name).join(", ")}
            {isCritical && " (крит!)"}
          </DialogDescription>
        </DialogHeader>

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
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Скасувати
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
