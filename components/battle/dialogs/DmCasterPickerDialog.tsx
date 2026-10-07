"use client";

import { BattleDialog } from "./shared";

import { Button } from "@/components/ui/button";
import { ParticipantSide } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/participants";
import type { BattleParticipant } from "@/types/battle";

export interface DmCasterPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: BattleParticipant[];
  onSelectCaster: (participant: BattleParticipant) => void;
}

export function DmCasterPickerDialog({
  open,
  onOpenChange,
  participants,
  onSelectCaster,
}: DmCasterPickerDialogProps) {
  const activeParticipants = participants.filter(
    isActive,
  );

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Накласти заклинання"
      description="Оберіть учасника, від імені якого буде накладено заклинання"
      contentClassName="max-w-sm"
    >
      <div className="space-y-2 pt-2">
        {activeParticipants.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Немає активних учасників
          </p>
        ) : (
          activeParticipants.map((p) => (
            <Button
              key={p.basicInfo.id}
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                onSelectCaster(p);
              }}
            >
              <i className="size-2 shrink-0 rounded-full" style={{ background: p.basicInfo.side === ParticipantSide.ALLY ? "var(--ally)" : "var(--enemy)" }} />
              <span className="font-medium">{p.basicInfo.name}</span>
              {p.basicInfo.side && (
                <span className="text-muted-foreground text-xs">
                  {p.basicInfo.side === ParticipantSide.ALLY ? "союзник" : "ворог"}
                </span>
              )}
            </Button>
          ))
        )}
      </div>
    </BattleDialog>
  );
}
