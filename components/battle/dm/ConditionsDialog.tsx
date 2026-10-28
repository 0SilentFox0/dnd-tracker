"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { ABILITY_OPTIONS, type AbilityKey } from "@/lib/constants/abilities";
import type { BattleConditionsBody } from "@/lib/hooks/battles";
import { cn } from "@/lib/utils";
import { CONDITION_5E_KEYS, CONDITION_5E_REGISTRY, type Condition5eKey, conditionEffects } from "@/lib/utils/battle/conditions";
import type { BattleParticipant } from "@/types/battle";

const FORM_ID = "conditions-form";

const toInt = (v: string): number | undefined => {
  const n = parseInt(v, 10);

  return Number.isNaN(n) ? undefined : n;
};

interface ConditionsDialogProps {
  participant: BattleParticipant | null;
  onClose: () => void;
  onSubmit: (body: BattleConditionsBody) => void;
  isPending?: boolean;
}

export function ConditionsDialog({ participant, ...rest }: ConditionsDialogProps) {
  if (!participant) return null;

  return <ConditionsDialogBody key={participant.basicInfo.id} participant={participant} {...rest} />;
}

function ConditionsDialogBody({ participant, onClose, onSubmit, isPending }: ConditionsDialogProps & { participant: BattleParticipant }) {
  const [selected, setSelected] = useState<Condition5eKey>(CONDITION_5E_KEYS[0]);

  const [rounds, setRounds] = useState("");

  const [levels, setLevels] = useState("1");

  const [saveOn, setSaveOn] = useState(false);

  const [saveAbility, setSaveAbility] = useState<AbilityKey>("constitution");

  const [saveDc, setSaveDc] = useState("12");

  const participantId = participant.basicInfo.id;

  const current = conditionEffects(participant);

  const dc = toInt(saveDc);

  const valid = !saveOn || (dc !== undefined && dc >= 1 && dc <= 40);

  const apply = (e: FormEvent) => {
    e.preventDefault();

    if (!valid) return;

    onSubmit({
      action: "apply",
      participantId,
      condition: selected,
      rounds: toInt(rounds),
      ...(selected === "exhaustion" && { levels: toInt(levels) }),
      ...(saveOn && dc !== undefined && { saveEnds: { ability: saveAbility, dc } }),
    });
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      hud
      title="Стани"
      description={participant.basicInfo.name}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Закрити</Button>
          <Button type="submit" form={FORM_ID} disabled={!valid || isPending}>Накласти</Button>
        </>
      }
    >
      {current.length > 0 && (
        <div className="space-y-1 pb-2">
          <div className="text-xs text-[var(--hud-muted)]">Поточні стани</div>
          {current.map(({ key, effect }) => (
            <div key={effect.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{effect.name}{effect.permanent ? "" : ` · ${effect.duration} р.`}</span>
              <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => onSubmit({ action: "remove", participantId, condition: key })}>
                Зняти
              </Button>
            </div>
          ))}
        </div>
      )}

      <form id={FORM_ID} noValidate onSubmit={apply} className="space-y-3 py-2">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" role="radiogroup" aria-label="Стан">
          {CONDITION_5E_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected === key}
              onClick={() => setSelected(key)}
              className={cn("border border-white/15 px-2 py-1.5 text-left text-sm hover:border-[var(--gold)]/50", selected === key && "border-[var(--gold)] bg-[var(--gold)]/10")}
            >
              <div className="font-medium text-[var(--ink)]">{CONDITION_5E_REGISTRY[key].label}</div>
              <div className="text-xs text-[var(--hud-muted)]">{CONDITION_5E_REGISTRY[key].description}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="condition-rounds">Раунди (порожньо — доки не знімуть)</Label>
            <Input id="condition-rounds" type="number" min={1} max={99} value={rounds} onChange={(e) => setRounds(e.target.value)} />
          </div>
          {selected === "exhaustion" && (
            <div className="space-y-1">
              <Label htmlFor="condition-levels">Рівні</Label>
              <Input id="condition-levels" type="number" min={1} max={6} value={levels} onChange={(e) => setLevels(e.target.value)} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={saveOn} onChange={(e) => setSaveOn(e.target.checked)} />
            Рятівний кидок наприкінці ходу
          </label>
          {saveOn && (
            <div className="grid grid-cols-2 gap-3">
              <SelectField aria-label="Характеристика" value={saveAbility} options={ABILITY_OPTIONS} onValueChange={(v) => setSaveAbility(v as AbilityKey)} />
              <Input aria-label="СК" type="number" min={1} max={40} value={saveDc} onChange={(e) => setSaveDc(e.target.value)} />
            </div>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
