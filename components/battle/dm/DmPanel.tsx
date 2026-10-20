"use client";

import { useState } from "react";

import { AddParticipantDialog } from "@/components/battle/dm/dialogs/AddParticipantDialog";
import { AwaitingDmDialog } from "@/components/battle/dm/dialogs/AwaitingDmDialog";
import { ChangeHpDialog } from "@/components/battle/dm/dialogs/ChangeHpDialog";
import { DmCasterPickerDialog } from "@/components/battle/dm/dialogs/DmCasterPickerDialog";
import { DmQuickActionsPanel } from "@/components/battle/dm/DmQuickActionsPanel";
import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { useBattlePageDialogs, useBattleScene, useDmCaster, useModeDmPlace, useSpellBook } from "@/lib/hooks/battle";

export function DmPanel({ panel }: { panel?: { open: boolean; onOpenChange: (open: boolean) => void } }) {
  const { battle, campaignId, actions } = useBattleScene();

  const dialogs = useBattlePageDialogs();

  const [pickCaster, setPickCaster] = useState(false);

  const { caster, select } = useDmCaster();

  const book = useSpellBook(caster, { allSpells: true });

  const onPlace = useModeDmPlace(battle.map);

  return (
    <>
      <DmQuickActionsPanel dialogs={dialogs} panel={panel} onOpenCastSpell={() => setPickCaster(true)} />
      <AddParticipantDialog open={dialogs.addParticipant.open} onOpenChange={dialogs.addParticipant.setOpen} campaignId={campaignId} isPending={actions.addParticipant.isPending} isError={actions.addParticipant.isError}
        onAdd={(data) => actions.addParticipant.mutate(data, { onSuccess: () => dialogs.addParticipant.setOpen(false) })}
        onPlace={onPlace} />
      <ChangeHpDialog participant={dialogs.hp.target} onClose={dialogs.hp.close} isPending={actions.updateParticipant.isPending}
        onConfirm={(participantId, newHp) => actions.updateParticipant.mutate({ participantId, data: { currentHp: newHp } }, { onSuccess: dialogs.hp.close })} />
      <DmCasterPickerDialog open={pickCaster} onOpenChange={setPickCaster} participants={battle.initiativeOrder}
        onSelectCaster={(p) => { select(p); setPickCaster(false); book.actions.open(undefined, p); }} />
      <AwaitingDmDialog />
      <SpellBook book={book} />
    </>
  );
}
