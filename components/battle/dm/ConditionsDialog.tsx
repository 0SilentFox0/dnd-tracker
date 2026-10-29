"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { OptionButton } from "@/components/hud/OptionButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { CONDITION_LIMITS } from "@/lib/constants/battle";
import type { BattleConditionsBody } from "@/lib/hooks/battles";
import { useText } from "@/lib/i18n/use-text";
import { CONDITION_5E_KEYS, type Condition5eKey, conditionEffects, MAX_EXHAUSTION } from "@/lib/utils/battle/conditions";
import { effectTitle } from "@/lib/utils/battle/view";
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
}

export function ConditionsDialog({ participant, ...rest }: ConditionsDialogProps) {
  if (!participant) return null;

  return <ConditionsDialogBody key={participant.basicInfo.id} participant={participant} {...rest} />;
}

function ConditionsDialogBody({ participant, onClose, onSubmit, isPending }: ConditionsDialogProps & { participant: BattleParticipant }) {
  const t = useTranslations("battleDm.conditions");

  const tCondition = useTranslations("battleCommon.conditions");

  const tAbility = useTranslations("gameTerms.abilities");

  const text = useText();

  const [selected, setSelected] = useState<Condition5eKey>(CONDITION_5E_KEYS[0]);

  const [rounds, setRounds] = useState("");

  const [levels, setLevels] = useState("1");

  const [saveOn, setSaveOn] = useState(false);

  const [saveAbility, setSaveAbility] = useState<AbilityKey>("constitution");

  const [saveDc, setSaveDc] = useState("12");

  const abilityOptions = ABILITY_KEYS.map((value) => ({ value, label: tAbility(`${value}.label`) }));

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
      title={t("title")}
      description={participant.basicInfo.name}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>{t("close")}</Button>
          <Button type="submit" form={FORM_ID} disabled={!valid || isPending}>{t("apply")}</Button>
        </>
      }
    >
      {current.length > 0 && (
        <div className="space-y-1 pb-2">
          <div className="text-xs text-[var(--hud-muted)]">{t("current")}</div>
          {current.map(({ key, effect }) => (
            <div key={effect.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{text(effectTitle(effect))}{effect.permanent ? "" : t("roundsLeft", { duration: effect.duration })}</span>
              <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => onSubmit({ action: "remove", participantId, condition: key })}>
                {t("remove")}
              </Button>
            </div>
          ))}
        </div>
      )}

      <form id={FORM_ID} noValidate onSubmit={apply} className="space-y-3 py-2">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" role="radiogroup" aria-label={t("state")}>
          {CONDITION_5E_KEYS.map((key) => (
            <OptionButton key={key} role="radio" checked={selected === key} onClick={() => setSelected(key)} title={tCondition(`${key}.label`)} note={tCondition(`${key}.description`)} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="condition-rounds">{t("rounds")}</Label>
            <Input id="condition-rounds" type="number" min={1} max={CONDITION_LIMITS.rounds} value={rounds} onChange={(e) => setRounds(e.target.value)} />
          </div>
          {selected === "exhaustion" && (
            <div className="space-y-1">
              <Label htmlFor="condition-levels">{t("levels")}</Label>
              <Input id="condition-levels" type="number" min={1} max={MAX_EXHAUSTION} value={levels} onChange={(e) => setLevels(e.target.value)} />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={saveOn} onCheckedChange={(on) => setSaveOn(on === true)} />
            {t("saveEnds")}
          </label>
          {saveOn && (
            <div className="grid grid-cols-2 gap-3">
              <SelectField aria-label={t("ability")} value={saveAbility} options={abilityOptions} onValueChange={(v) => setSaveAbility(v as AbilityKey)} />
              <Input aria-label={t("dc")} type="number" min={1} max={CONDITION_LIMITS.dc} value={saveDc} onChange={(e) => setSaveDc(e.target.value)} />
            </div>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
