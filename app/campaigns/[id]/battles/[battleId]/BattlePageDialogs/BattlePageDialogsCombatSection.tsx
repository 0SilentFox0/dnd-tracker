"use client";

import type { BattlePageDialogsBattleContext } from "./BattlePageDialogs-types";
import type { BattlePageDialogsDialogs } from "./BattlePageDialogs-types";
import type { BattlePageDialogsHandlers } from "./BattlePageDialogs-types";
import type { BattlePageDialogsMoraleOverlay } from "./BattlePageDialogs-types";
import type { BattlePageDialogsMutations } from "./BattlePageDialogs-types";

import { AttackDialog } from "@/components/battle/dialogs/AttackDialog";
import { MoraleCheckDialog } from "@/components/battle/dialogs/MoraleCheckDialog";
import { RollResultOverlay } from "@/components/battle/RollResultOverlay";
import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";

interface BattlePageDialogsCombatSectionProps {
  battleContext: BattlePageDialogsBattleContext;
  dialogs: Pick<BattlePageDialogsDialogs, "attack" | "morale">;
  mutations: Pick<BattlePageDialogsMutations, "moraleCheck">;
  handlers: Pick<BattlePageDialogsHandlers, "handleAttack">;
  moraleOverlay: BattlePageDialogsMoraleOverlay;
}

export function BattlePageDialogsCombatSection({
  battleContext,
  dialogs,
  mutations,
  handlers,
  moraleOverlay,
}: BattlePageDialogsCombatSectionProps) {
  const { battle, isDM, currentParticipant, availableTargets, canSeeEnemyHp, isCurrentPlayerTurn } =
    battleContext;

  return (
    <>
      <AttackDialog
        open={dialogs.attack.open}
        onOpenChange={dialogs.attack.setOpen}
        attacker={null}
        battle={battle}
        availableTargets={availableTargets}
        isDM={isDM}
        canSeeEnemyHp={canSeeEnemyHp}
        onAttack={(data) =>
          handlers.handleAttack(data, () => dialogs.attack.setOpen(false))
        }
      />
      {!isCurrentPlayerTurn && currentParticipant && (
        <MoraleCheckDialog
          open={dialogs.morale.open}
          onOpenChange={dialogs.morale.setOpen}
          participant={currentParticipant}
          onConfirm={(d10Roll) =>
            mutations.moraleCheck.mutate(
              {
                participantId: currentParticipant.basicInfo.id,
                d10Roll,
              },
              {
                onSuccess: (data: { moraleResult?: MoraleCheckResult }) => {
                  moraleOverlay.showMoraleResult(
                    data.moraleResult as MoraleCheckResult,
                  );
                },
              },
            )
          }
        />
      )}
      <RollResultOverlay
        type={moraleOverlay.overlayType}
        customText={moraleOverlay.overlayCustomText}
        onComplete={moraleOverlay.handleOverlayComplete}
      />
    </>
  );
}
