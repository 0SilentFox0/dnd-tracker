"use client";

import { useState } from "react";

import { AddParticipantDialog } from "@/components/battle/dialogs/AddParticipantDialog";
import { ChangeHpDialog } from "@/components/battle/dialogs/ChangeHpDialog";
import { DmCasterPickerDialog } from "@/components/battle/dialogs/DmCasterPickerDialog";
import { DmQuickActionsPanel } from "@/components/battle/panels";
import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { useBattlePageDialogs, useBattleScene, useSpellBook } from "@/lib/hooks/battle";
import type { BattleParticipant } from "@/types/battle";

export function DmPanel() {
  const { battle, campaignId, dmControlledId, setDmControlledId, actions } = useBattleScene();

  const dialogs = useBattlePageDialogs();

  const [pickCaster, setPickCaster] = useState(false);

  const [caster, setCaster] = useState<BattleParticipant | null>(null);

  const book = useSpellBook(caster, { allSpells: true });

  return (
    <>
      <DmQuickActionsPanel
        battle={battle}
        isDM
        onOpenLog={dialogs.openLog}
        onAddParticipant={dialogs.openAddParticipant}
        onIncreaseHp={dialogs.openHpDialog}
        onRemoveFromBattle={(p) => void actions.updateParticipant.mutateAsync({ participantId: p.basicInfo.id, data: { removeFromBattle: true } })}
        onCompleteBattle={(result) => void actions.complete.mutateAsync({ result })}
        onTakeControl={(p) => setDmControlledId(p?.basicInfo.id ?? null)}
        dmControlledParticipantId={dmControlledId}
        logPanelOpen={dialogs.logPanelOpen}
        setLogPanelOpen={dialogs.setLogPanelOpen}
        onRollback={(actionIndex) => void actions.rollback.mutateAsync({ actionIndex })}
        onOpenCastSpell={() => setPickCaster(true)}
      />
      <AddParticipantDialog open={dialogs.addParticipantDialogOpen} onOpenChange={dialogs.setAddParticipantDialogOpen} campaignId={campaignId} isPending={actions.addParticipant.isPending}
        onAdd={(data) => void actions.addParticipant.mutateAsync(data).then(() => dialogs.setAddParticipantDialogOpen(false))} />
      <ChangeHpDialog open={dialogs.hpDialogParticipant !== null} onOpenChange={(o) => !o && dialogs.closeHpDialog()} participant={dialogs.hpDialogParticipant} isPending={actions.updateParticipant.isPending}
        onConfirm={(participantId, newHp) => { void actions.updateParticipant.mutateAsync({ participantId, data: { currentHp: newHp } }); dialogs.closeHpDialog(); }} />
      <DmCasterPickerDialog open={pickCaster} onOpenChange={setPickCaster} participants={battle.initiativeOrder}
        onSelectCaster={(p) => { setCaster(p); setPickCaster(false); book.open(undefined, p); }} />
      <SpellBook book={book} />
    </>
  );
}
