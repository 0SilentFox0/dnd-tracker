"use client";

import { SideDot } from "@/components/battle/hud";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
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
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      hud
      title="Накласти заклинання"
      description="Оберіть учасника, від імені якого буде накладено заклинання"
      className="max-w-sm"
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
              <SideDot side={p.basicInfo.side} />
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
    </ResponsiveDialog>
  );
}
