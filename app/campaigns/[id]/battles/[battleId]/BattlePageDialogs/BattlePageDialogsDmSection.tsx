"use client";

import type { BattlePageDialogsDmDialogs } from "./BattlePageDialogs-types";
import type { BattlePageDialogsMutations } from "./BattlePageDialogs-types";

import { AddParticipantDialog } from "@/components/battle/dialogs/AddParticipantDialog";
import { ChangeHpDialog } from "@/components/battle/dialogs/ChangeHpDialog";

interface BattlePageDialogsDmSectionProps {
  campaignId: string;
  dmDialogs: BattlePageDialogsDmDialogs;
  mutations: Pick<BattlePageDialogsMutations, "addParticipant" | "updateParticipant">;
}

export function BattlePageDialogsDmSection({
  campaignId,
  dmDialogs,
  mutations,
}: BattlePageDialogsDmSectionProps) {
  return (
    <>
      <AddParticipantDialog
        open={dmDialogs.addParticipantDialogOpen}
        onOpenChange={dmDialogs.setAddParticipantDialogOpen}
        campaignId={campaignId}
        onAdd={(data) =>
          mutations.addParticipant.mutate(data, {
            onSuccess: () => dmDialogs.setAddParticipantDialogOpen(false),
          })
        }
        isPending={mutations.addParticipant.isPending}
      />
      <ChangeHpDialog
        open={dmDialogs.hpDialogParticipant !== null}
        onOpenChange={(open) => !open && dmDialogs.closeHpDialog()}
        participant={dmDialogs.hpDialogParticipant}
        onConfirm={(participantId, newHp) => {
          mutations.updateParticipant.mutate({
            participantId,
            data: { currentHp: newHp },
          });
          dmDialogs.closeHpDialog();
        }}
        isPending={mutations.updateParticipant.isPending}
      />
    </>
  );
}
