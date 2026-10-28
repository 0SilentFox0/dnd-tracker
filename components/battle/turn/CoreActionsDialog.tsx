"use client";

import { useState } from "react";

import { OptionButton } from "@/components/hud/OptionButton";
import { TargetRadioList } from "@/components/hud/TargetRadioList";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SPELL_COST_LABELS } from "@/lib/constants/spells";
import { useCoreActions } from "@/lib/hooks/battle";
import type { CoreActionKey } from "@/lib/utils/battle/actions/registry";
import type { BattleParticipant } from "@/types/battle";

const COST_LABEL = { action: SPELL_COST_LABELS.action, bonusAction: SPELL_COST_LABELS.bonusAction, movement: "Рух" } as const;

const SHOVE_MODES = [
  { mode: "prone", label: "Повалити" },
  { mode: "push", label: "Відштовхнути" },
] as const;

interface CoreActionsDialogProps {
  participant: BattleParticipant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export function CoreActionsDialog({ open, ...rest }: CoreActionsDialogProps) {
  return open ? <CoreActionsBody {...rest} /> : null;
}

function CoreActionsBody({ participant, onOpenChange, onDone }: Omit<CoreActionsDialogProps, "open">) {
  const { items, targetsFor, run, isPending } = useCoreActions(participant, onDone);

  const [key, setKey] = useState<CoreActionKey | null>(null);

  const [targetId, setTargetId] = useState<string | null>(null);

  const [mode, setMode] = useState<"prone" | "push">("prone");

  const current = items.find((i) => i.key === key);

  const needsTarget = !!current && current.def.target !== "none";

  const targets = key && needsTarget ? targetsFor(key) : [];

  const ready = !!current && !isPending && (!needsTarget || targetId !== null);

  const choose = (k: CoreActionKey) => {
    setKey(k);
    setTargetId(null);
  };

  const submit = async () => {
    if (!key) return;

    if (await run({ key, targetId: targetId ?? undefined, mode })) onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={onOpenChange}
      size="md"
      hud
      title="Дії"
      description="Основні дії 5e"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Закрити</Button>
          <Button type="button" disabled={!ready} onClick={() => void submit()}>Виконати</Button>
        </>
      }
    >
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" role="radiogroup" aria-label="Дія">
        {items.map(({ key: k, def, ok, reason }) => (
          <OptionButton key={k} role="radio" checked={key === k} disabled={!ok} title={def.label} meta={COST_LABEL[def.cost]} note={<>{def.description}{!ok && <span className="block text-hud-danger">{reason}</span>}</>} onClick={() => choose(k)} />
        ))}
      </div>
      {key === "shove" && (
        <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Спосіб">
          {SHOVE_MODES.map((m) => (
            <OptionButton key={m.mode} role="radio" checked={mode === m.mode} title={m.label} onClick={() => setMode(m.mode)} />
          ))}
        </div>
      )}
      {needsTarget && <TargetRadioList targets={targets} value={targetId} onChange={setTargetId} />}
    </div>
    </ResponsiveDialog>
  );
}
