"use client";

import { BattleDialog } from "./shared";

import { Button } from "@/components/ui/button";
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
    (p) => p.combatStats?.status === "active",
  );

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Накласти заклинання"
      description="Оберіть учасника, від імені якого буде накладено заклинання"
      contentClassName="bg-slate-900 border-slate-700 text-white max-w-sm"
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
              className="w-full justify-start border-white/20 text-white hover:bg-white/10"
              onClick={() => {
                onSelectCaster(p);
              }}
            >
              <span className="font-medium">{p.basicInfo.name}</span>
              {p.basicInfo.side && (
                <span className="text-muted-foreground ml-2 text-xs">
                  {p.basicInfo.side === "ally" ? "союзник" : "ворог"}
                </span>
              )}
            </Button>
          ))
        )}
      </div>
    </BattleDialog>
  );
}
