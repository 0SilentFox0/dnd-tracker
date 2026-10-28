"use client";

import { useState } from "react";

import { OPTION_BUTTON, OPTION_ON } from "./option-button";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCoreActions } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { CoreActionKey } from "@/lib/utils/battle/actions/registry";
import type { BattleParticipant } from "@/types/battle";

const COST_LABEL = { action: "Дія", bonusAction: "Бонусна дія", movement: "Рух" } as const;

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
          <button key={k} type="button" role="radio" aria-checked={key === k} disabled={!ok} onClick={() => choose(k)} className={cn(OPTION_BUTTON, key === k && OPTION_ON)}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{def.label}</span>
              <span className="text-xs text-[var(--hud-muted)]">{COST_LABEL[def.cost]}</span>
            </div>
            <div className="text-xs text-[var(--hud-muted)]">{def.description}</div>
            {!ok && <div className="pt-0.5 text-xs text-hud-danger">{reason}</div>}
          </button>
        ))}
      </div>
      {key === "shove" && (
        <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Спосіб">
          {SHOVE_MODES.map((m) => (
            <button key={m.mode} type="button" role="radio" aria-checked={mode === m.mode} onClick={() => setMode(m.mode)} className={cn(OPTION_BUTTON, mode === m.mode && OPTION_ON)}>
              {m.label}
            </button>
          ))}
        </div>
      )}
      {needsTarget && (
        <div className="grid gap-1" role="radiogroup" aria-label="Ціль">
          {targets.map((t) => (
            <button key={t.basicInfo.id} type="button" role="radio" aria-checked={targetId === t.basicInfo.id} onClick={() => setTargetId(t.basicInfo.id)} className={cn(OPTION_BUTTON, targetId === t.basicInfo.id && OPTION_ON)}>
              {t.basicInfo.name}
            </button>
          ))}
        </div>
      )}
    </div>
    </ResponsiveDialog>
  );
}
