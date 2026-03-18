"use client";

import type { BattlePageDialogsBattleContext } from "./BattlePageDialogs-types";
import type { BattlePageDialogsDmSpell } from "./BattlePageDialogs-types";
import type { BattlePageDialogsDialogs } from "./BattlePageDialogs-types";
import type { BattlePageDialogsHandlers } from "./BattlePageDialogs-types";
import type { BattlePageDialogsMutations } from "./BattlePageDialogs-types";
import type { BattlePageDialogsSpellResult } from "./BattlePageDialogs-types";

import { DmCasterPickerDialog } from "@/components/battle/dialogs/DmCasterPickerDialog";
import { SpellDialog } from "@/components/battle/dialogs/SpellDialog";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

interface BattlePageDialogsSpellSectionProps {
  battleContext: BattlePageDialogsBattleContext;
  dmSpell: BattlePageDialogsDmSpell;
  dialogs: Pick<BattlePageDialogsDialogs, "spell">;
  mutations: Pick<BattlePageDialogsMutations, "spell">;
  handlers: Pick<BattlePageDialogsHandlers, "triggerGlobalDamageFromBattle">;
  spellResult: BattlePageDialogsSpellResult;
}

export function BattlePageDialogsSpellSection({
  battleContext,
  dmSpell,
  dialogs,
  mutations,
  handlers,
  spellResult,
}: BattlePageDialogsSpellSectionProps) {
  const { battle, campaignId, isDM, availableTargets, canSeeEnemyHp } =
    battleContext;

  const { setSpellResultAction, setSpellResultModalOpen } = spellResult;

  return (
    <>
      {dialogs.spell.open && isDM && !dmSpell.dmSpellCasterId && (
        <DmCasterPickerDialog
          open={dialogs.spell.open}
          onOpenChange={(open) => {
            if (!open) {
              dialogs.spell.setOpen(false);
              dmSpell.setDmSpellCasterId(null);
            }
          }}
          participants={battle.initiativeOrder ?? []}
          onSelectCaster={(p) => dmSpell.setDmSpellCasterId(p.basicInfo.id)}
        />
      )}
      {dialogs.spell.open && (!isDM || dmSpell.dmSpellCasterId) && (
        <SpellDialog
          open={dialogs.spell.open}
          onOpenChange={(open) => {
            if (!open && isDM) dmSpell.setDmSpellCasterId(null);

            dialogs.spell.setOpen(open);
          }}
          caster={
            isDM && dmSpell.dmSpellCasterId
              ? ((battle.initiativeOrder ?? []).find(
                  (p: { basicInfo: { id: string } }) =>
                    p.basicInfo.id === dmSpell.dmSpellCasterId,
                ) ?? null)
              : null
          }
          battle={battle}
          campaignId={campaignId}
          availableTargets={availableTargets}
          isDM={isDM}
          canSeeEnemyHp={canSeeEnemyHp}
          allowAllSpellsForDM={Boolean(isDM && dmSpell.dmSpellCasterId)}
          onPreview={async (data) => {
            dialogs.spell.setOpen(false);
            await spellResult.handleSpellPreview(data);
          }}
          onCast={(data) =>
            mutations.spell.mutate(data, {
              onSuccess: (updatedBattle: BattleScene | undefined) => {
                dialogs.spell.setOpen(false);

                if (isDM) dmSpell.setDmSpellCasterId(null);

                if (updatedBattle) {
                  handlers.triggerGlobalDamageFromBattle(updatedBattle);

                  const log = updatedBattle.battleLog;

                  if (log?.length) {
                    const last = log[log.length - 1] as BattleAction;

                    if (last.actionType === "spell") {
                      setSpellResultAction(last);
                      setSpellResultModalOpen(true);
                    }
                  }
                }
              },
            })
          }
        />
      )}
    </>
  );
}
