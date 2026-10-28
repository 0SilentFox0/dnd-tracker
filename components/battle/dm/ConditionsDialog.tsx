"use client";

import { type FormEvent, useState } from "react";

import { OptionButton } from "@/components/hud/OptionButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { ABILITY_OPTIONS, type AbilityKey } from "@/lib/constants/abilities";
import { CONDITION_LIMITS } from "@/lib/constants/battle";
import type { BattleConditionsBody } from "@/lib/hooks/battles";
import { CONDITION_5E_KEYS, CONDITION_5E_REGISTRY, conditionEffects, type ConditionKey, MAX_EXHAUSTION } from "@/lib/utils/battle/conditions";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const FORM_ID = "conditions-form";

const toInt = (v: string): number | undefined => {
  const n = parseInt(v, 10);

  return Number.isNaN(n) ? undefined : n;
};

const inRange = (n: number | undefined, max: number) => n !== undefined && n >= 1 && n <= max;

interface ConditionsDialogProps {
  participant: BattleParticipant | null;
  onClose: () => void;
  onSubmit: (body: BattleConditionsBody) => void;
  isPending?: boolean;
  custom?: Ruleset["conditions"]["custom"];
}

export function ConditionsDialog({ participant, ...rest }: ConditionsDialogProps) {
  if (!participant) return null;

  return <ConditionsDialogBody key={participant.basicInfo.id} participant={participant} {...rest} />;
}

function ConditionsDialogBody({ participant, onClose, onSubmit, isPending, custom = [] }: ConditionsDialogProps & { participant: BattleParticipant }) {
  const [selected, setSelected] = useState<ConditionKey>(CONDITION_5E_KEYS[0]);

  const [rounds, setRounds] = useState("");

  const [levels, setLevels] = useState("1");

  const [saveOn, setSaveOn] = useState(false);

  const [saveAbility, setSaveAbility] = useState<AbilityKey>("constitution");

  const [saveDc, setSaveDc] = useState("12");

  const participantId = participant.basicInfo.id;

  const current = conditionEffects(participant);

  const dc = toInt(saveDc);

  const roundsCount = toInt(rounds);

  const levelsCount = toInt(levels);

  const valid =
    (rounds === "" || inRange(roundsCount, CONDITION_LIMITS.rounds)) &&
    (selected !== "exhaustion" || inRange(levelsCount, MAX_EXHAUSTION)) &&
    (!saveOn || inRange(dc, CONDITION_LIMITS.dc));

  const apply = (e: FormEvent) => {
    e.preventDefault();

    if (!valid) return;

    onSubmit({
      action: "apply",
      participantId,
      condition: selected,
      rounds: roundsCount,
      ...(selected === "exhaustion" && { levels: levelsCount }),
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
            <OptionButton key={key} role="radio" checked={selected === key} onClick={() => setSelected(key)} title={CONDITION_5E_REGISTRY[key].label} note={CONDITION_5E_REGISTRY[key].description} />
          ))}
          {custom.map((c) => (
            <OptionButton key={c.key} role="radio" checked={selected === c.key} onClick={() => setSelected(c.key as ConditionKey)} title={c.name} note={c.description} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="condition-rounds">Раунди (порожньо — доки не знімуть)</Label>
            <Input id="condition-rounds" type="number" min={1} max={CONDITION_LIMITS.rounds} value={rounds} onChange={(e) => setRounds(e.target.value)} />
          </div>
          {selected === "exhaustion" && (
            <div className="space-y-1">
              <Label htmlFor="condition-levels">Рівні</Label>
              <Input id="condition-levels" type="number" min={1} max={MAX_EXHAUSTION} value={levels} onChange={(e) => setLevels(e.target.value)} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={saveOn} onCheckedChange={(on) => setSaveOn(on === true)} />
            Рятівний кидок наприкінці ходу
          </label>
          {saveOn && (
            <div className="grid grid-cols-2 gap-3">
              <SelectField aria-label="Характеристика" value={saveAbility} options={ABILITY_OPTIONS} onValueChange={(v) => setSaveAbility(v as AbilityKey)} />
              <Input aria-label="СК" type="number" min={1} max={CONDITION_LIMITS.dc} value={saveDc} onChange={(e) => setSaveDc(e.target.value)} />
            </div>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
