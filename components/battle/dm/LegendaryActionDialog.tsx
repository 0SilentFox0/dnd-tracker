"use client";

import { useState } from "react";

import { OPTION_BUTTON, OPTION_ON } from "@/components/battle/turn/option-button";
import { SpellBook } from "@/components/battle/wizards/SpellBook";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useLegendaryAction } from "@/lib/hooks/battle";
import { useSpellBook } from "@/lib/hooks/battle/useSpellBook";
import { cn } from "@/lib/utils";
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
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={choiceId === c.id}
              disabled={!!c.blocked}
              onClick={() => {
                setChoiceId(c.id);
                setTargets([]);
              }}
              className={cn(OPTION_BUTTON, choiceId === c.id && OPTION_ON)}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-[var(--hud-muted)]">{c.cost}</span>
              </div>
              {c.blocked && <div className="pt-0.5 text-xs text-hud-danger">{c.blocked}</div>}
            </button>
          ))}
        </div>
        {choice?.needsTarget && (
          <div className="grid gap-1" role="radiogroup" aria-label="Ціль">
            {choice.candidates.map((t) => (
              <button key={t.basicInfo.id} type="button" role="radio" aria-checked={targets.includes(t.basicInfo.id)} onClick={() => pickTarget(t.basicInfo.id)} className={cn(OPTION_BUTTON, targets.includes(t.basicInfo.id) && OPTION_ON)}>
                {t.basicInfo.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </ResponsiveDialog>
    </>
  );
}
