"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

import type { SystemConditionsDialogProps } from "../types";

import { OptionButton } from "@/components/hud/OptionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { CONDITION_LIMITS } from "@/lib/constants/battle";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import { useText } from "@/lib/i18n/use-text";
import { WFRP_CONDITIONS } from "@/lib/utils/rules/systems/wfrp/conditions";
import type { BattleParticipant } from "@/types/battle";

const FORM_ID = "system-conditions-form";

const toInt = (v: string): number | undefined => {
  const n = parseInt(v, 10);

  return Number.isNaN(n) ? undefined : n;
};

const inRange = (n: number | undefined, max: number) => n !== undefined && n >= 1 && n <= max;

export function SystemConditionsDialog({ participant, ...rest }: SystemConditionsDialogProps) {
  if (!participant) return null;

  return <DialogBody key={participant.basicInfo.id} participant={participant} {...rest} />;
}

function DialogBody({ participant, onClose, onSubmit, isPending }: SystemConditionsDialogProps & { participant: BattleParticipant }) {
  const t = useTranslations("battleWfrp.ui.dialog");

  const tClose = useTranslations("battleDm.conditions");

  const text = useText();

  const tCondition = (key: string, field: "label" | "description") => text(dynamicTextRef(`battleWfrp.conditions.${key}.${field}`));

  const [selected, setSelected] = useState(WFRP_CONDITIONS.catalog[0].key);

  const [levels, setLevels] = useState("1");

  const [rounds, setRounds] = useState("");

  const participantId = participant.basicInfo.id;

  const current = WFRP_CONDITIONS.list(participant);

  const info = WFRP_CONDITIONS.catalog.find((c) => c.key === selected);

  const maxLevel = info?.maxLevel ?? null;

  const timed = info?.timed ?? true;

  const levelsCount = toInt(levels);

  const roundsCount = timed ? toInt(rounds) : undefined;

  const valid = (!timed || rounds === "" || inRange(roundsCount, CONDITION_LIMITS.rounds)) && (maxLevel === null || inRange(levelsCount, maxLevel));

  const apply = (e: FormEvent) => {
    e.preventDefault();

    if (!valid) return;

    onSubmit({ action: "apply", participantId, condition: selected, ...(maxLevel !== null && { levels: levelsCount }), ...(roundsCount !== undefined && { rounds: roundsCount }) });
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
          <Button type="button" variant="outline" onClick={onClose}>{tClose("close")}</Button>
          <Button type="submit" form={FORM_ID} disabled={!valid || isPending}>{t("apply")}</Button>
        </>
      }
    >
      <div className="space-y-1 pb-2">
        <div className="text-xs text-[var(--hud-muted)]">{t("current")}</div>
        {current.length === 0 && <div className="text-sm">{t("none")}</div>}
        {current.map(({ key, level }) => (
          <div key={key} className="flex items-center justify-between gap-2 text-sm">
            <span>{tCondition(key, "label")}{level > 1 ? ` ×${level}` : ""}</span>
            <span className="flex gap-1">
              {level > 1 && <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => onSubmit({ action: "remove", participantId, condition: key, all: false })}>{t("reduce")}</Button>}
              <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => onSubmit({ action: "remove", participantId, condition: key, all: true })}>{t("remove")}</Button>
            </span>
          </div>
        ))}
      </div>

      <form id={FORM_ID} noValidate onSubmit={apply} className="space-y-3 py-2">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" role="radiogroup" aria-label={t("title")}>
          {WFRP_CONDITIONS.catalog.map(({ key }) => (
            <OptionButton key={key} role="radio" checked={selected === key} onClick={() => setSelected(key)} title={tCondition(key, "label")} note={tCondition(key, "description")} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {timed && (
            <div className="space-y-1">
              <Label htmlFor="wfrp-condition-rounds">{t("rounds")}</Label>
              <Input id="wfrp-condition-rounds" type="number" min={1} max={CONDITION_LIMITS.rounds} value={rounds} onChange={(e) => setRounds(e.target.value)} />
            </div>
          )}
          {maxLevel !== null && (
            <div className="space-y-1">
              <Label htmlFor="wfrp-condition-levels">{t("level")}</Label>
              <Input id="wfrp-condition-levels" type="number" min={1} max={maxLevel} value={levels} onChange={(e) => setLevels(e.target.value)} />
            </div>
          )}
        </div>
      </form>
    </ResponsiveDialog>
  );
}
