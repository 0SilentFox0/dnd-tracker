"use client";

import { useTranslations } from "next-intl";

import { LevelUpChoicesStep } from "./LevelUpChoicesStep";

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
}

export function ClassLevelUpDialog({ open, onOpenChange, character, onLeveled }: ClassLevelUpDialogProps) {
  const t = useTranslations("characterProfile.classLevelUp");

  const form = useClassLevelUpForm({ open, character, onLeveled, onClose: () => onOpenChange(false) });

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
            {t("cancel")}
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
        {choice === NEW_CLASS && (
          <SelectField
            aria-label={t("newClass")}
            value={selection.newClassId}
            onValueChange={actions.pickNewClass}
            placeholder={t("pickClass")}
            options={available.map((c) => ({ value: c.id, label: c.name }))}
            triggerClassName="w-full"
          />
        )}
        {form.needsSubclass && (
          <SelectField
            aria-label={t("subclass")}
            value={selection.subclassId}
            onValueChange={actions.pickSubclass}
            placeholder={t("pickSubclass")}
            options={cls?.subclasses.map((s) => ({ value: s.id, label: s.name }))}
            required
            triggerClassName="w-full"
          />
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
