"use client";

import { useTranslations } from "next-intl";

import { LevelUpChoicesStep } from "./LevelUpChoicesStep";
import { MulticlassReasons } from "./MulticlassReasons";

import { SubclassCard } from "@/components/choices/SubclassCard";
import { FormAlert } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { type LevelUpCharacter, NEW_CLASS, useClassLevelUpForm } from "@/lib/hooks/characters";
import type { Character } from "@/types/characters";


interface ClassLevelUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: LevelUpCharacter;
  onLeveled?: (updated: Character) => void;
  startNew?: boolean;
}

export function ClassLevelUpDialog({ open, onOpenChange, character, onLeveled, startNew }: ClassLevelUpDialogProps) {
  const t = useTranslations("characterProfile.classLevelUp");

  const tc = useTranslations("common.actions");

  const form = useClassLevelUpForm({ open, character, onLeveled, startNew, onClose: () => onOpenChange(false) });

  const { byId, available, selection, cls, stepDefs, multiclass, raisedEntry, nextRow, gained, picksCount, nextLevel, canSubmit, actions } = form;

  const { choice } = selection;

  const { entries } = character;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void actions.send(true);
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          {stepDefs.length > 0 && (
            <Button type="button" variant="outline" disabled={!canSubmit} onClick={() => void actions.send(false)}>
              {t("later")}
            </Button>
          )}
          <Button type="submit" form="class-level-up-form" disabled={!canSubmit}>
            {t("confirm")}
          </Button>
        </>
      }
    >
      <form id="class-level-up-form" onSubmit={submit} className="space-y-3">
        <fieldset className="space-y-2">
          {entries.map((entry) => (
            <label key={entry.classId} className="flex items-center gap-2 text-sm">
              <input type="radio" name="class-pick" checked={choice === entry.classId} onChange={() => actions.pickClass(entry.classId)} />
              {byId[entry.classId] ? `${byId[entry.classId].name} ${entry.level} → ${entry.level + 1}` : t("classNotFound")}
            </label>
          ))}
          {available.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="class-pick" checked={choice === NEW_CLASS} onChange={() => actions.pickClass(NEW_CLASS)} />
              {t("newClass")}
            </label>
          )}
        </fieldset>
        {startNew && available.length === 0 && <p className="text-sm text-hud-muted">{t("noFreeClasses")}</p>}
        {choice === NEW_CLASS && available.length > 0 && (
          <SelectField
            aria-label={t("newClass")}
            value={selection.newClassId}
            onValueChange={actions.pickNewClass}
            placeholder={t("pickClass")}
            options={available.map(({ cls: c, reasons: r }) => ({ value: c.id, label: r.length > 0 ? t("blockedOption", { name: c.name }) : c.name, disabled: r.length > 0 }))}
            triggerClassName="w-full"
          />
        )}
        {choice === NEW_CLASS && <MulticlassReasons reasons={available.flatMap((a) => a.reasons)} />}
        {form.needsSubclass && cls && (
          <fieldset className="space-y-2" role="radiogroup" aria-label={t("subclass")}>
            <legend className="text-sm font-semibold">{t("pickSubclass")}</legend>
            <SubclassCard cls={cls} value={selection.subclassId} onChange={actions.pickSubclass} />
          </fieldset>
        )}
        {nextRow && (gained.length > 0 || picksCount > 0) && (
          <section aria-label={t("gainsLabel")} className="space-y-1 rounded-md border border-hud-rule p-2 text-sm">
            <h4 className="font-semibold">{t("gains", { level: nextLevel })}</h4>
            {gained.length > 0 && <p>{gained.map((item) => item.name).join(", ")}</p>}
            {picksCount > 0 && <p className="text-hud-muted">{t("picks", { count: picksCount })}</p>}
          </section>
        )}
        {stepDefs.length > 0 && character.hero && raisedEntry && <LevelUpChoicesStep campaignId={character.campaignId} hero={character.hero} entry={raisedEntry} multiclass={multiclass} value={selection.picks} onChange={actions.setPicks} />}
        {form.error && <FormAlert>{form.error}</FormAlert>}
      </form>
    </ResponsiveDialog>
  );
}
