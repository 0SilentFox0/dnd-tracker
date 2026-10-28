"use client";

import { useState } from "react";

import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { OptionButton } from "@/components/hud/OptionButton";
import { TargetRadioList } from "@/components/hud/TargetRadioList";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useLegendaryAction } from "@/lib/hooks/battle";
import { useSpellBook } from "@/lib/hooks/battle/useSpellBook";
import { toggleAbilityTarget } from "@/lib/utils/battle/validation/ability-targets";
import type { BattleParticipant, LegendaryOption } from "@/types/battle";

interface LegendaryActionDialogProps {
  participant: BattleParticipant | null;
  onClose: () => void;
}

export function LegendaryActionDialog({ participant, onClose }: LegendaryActionDialogProps) {
  return participant ? <LegendaryActionBody key={participant.basicInfo.id} participant={participant} onClose={onClose} /> : null;
}

function LegendaryActionBody({ participant, onClose }: { participant: BattleParticipant; onClose: () => void }) {
  const { legendary, choices, run, isPending } = useLegendaryAction(participant);

  const [choiceId, setChoiceId] = useState<string | null>(null);

  const [targets, setTargets] = useState<string[]>([]);

  const choice = choices.find((c) => c.id === choiceId) ?? null;

  const book = useSpellBook(participant, { ...(choice?.spellId && choice.abilityKey && { legendary: { abilityKey: choice.abilityKey, spellId: choice.spellId } }), onDone: onClose });

  const ready = !!choice && !choice.blocked && !isPending && (!choice.needsTarget || targets.length > 0);

  const optionOf = (c: NonNullable<typeof choice>): LegendaryOption =>
    c.kind === "attack" ? { kind: "attack", attackIndex: c.attackIndex ?? 0, targetId: targets[0] ?? "" } : { kind: c.kind, abilityKey: c.abilityKey ?? "", ...(targets.length > 0 && { targetIds: targets }) };

  const submit = async () => {
    if (choice?.spellId) book.actions.open();
    else if (choice && (await run(optionOf(choice)))) onClose();
  };

  const pickTarget = (id: string) => setTargets(choice && choice.maxTargets > 1 ? toggleAbilityTarget(targets, id, choice.maxTargets) : [id]);

  return (
    <>
    <SpellBook book={book} />
    <ResponsiveDialog
      open={book.state.step === "closed" || book.state.step === "result"}
      onOpenChange={(open) => !open && onClose()}
      size="md"
      hud
      title={`Легендарна дія: ${participant.basicInfo.name}`}
      description={legendary ? `Залишилось ${legendary.actionsLeft} з ${legendary.actions}` : ""}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Закрити
          </Button>
          <Button type="button" disabled={!ready} onClick={() => void submit()}>
            Виконати
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-1" role="radiogroup" aria-label="Дія">
          {choices.map((c) => (
            <OptionButton
              key={c.id}
              role="radio"
              checked={choiceId === c.id}
              disabled={!!c.blocked}
              title={c.label}
              meta={c.cost}
              note={c.blocked && <span className="text-hud-danger">{c.blocked}</span>}
              onClick={() => {
                setChoiceId(c.id);
                setTargets([]);
              }}
            />
          ))}
        </div>
        {choice?.needsTarget && <TargetRadioList targets={choice.candidates} value={targets} onChange={pickTarget} />}
      </div>
    </ResponsiveDialog>
    </>
  );
}
