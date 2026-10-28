"use client";

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
      title="Підвищити рівень"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          {stepDefs.length > 0 && (
            <Button type="button" variant="outline" disabled={!canSubmit} onClick={() => void actions.send(false)}>
              Обрати пізніше
            </Button>
          )}
          <Button type="submit" form="class-level-up-form" disabled={!canSubmit}>
            Підвищити
          </Button>
        </>
      }
    >
      <form id="class-level-up-form" onSubmit={submit} className="space-y-3">
        <fieldset className="space-y-2">
          {entries.map((entry) => (
            <label key={entry.classId} className="flex items-center gap-2 text-sm">
              <input type="radio" name="class-pick" checked={choice === entry.classId} onChange={() => actions.pickClass(entry.classId)} />
              {byId[entry.classId] ? `${byId[entry.classId].name} ${entry.level} → ${entry.level + 1}` : "Клас не знайдено"}
            </label>
          ))}
          {available.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="class-pick" checked={choice === NEW_CLASS} onChange={() => actions.pickClass(NEW_CLASS)} />
              Новий клас
            </label>
          )}
        </fieldset>
        {choice === NEW_CLASS && (
          <SelectField
            aria-label="Новий клас"
            value={selection.newClassId}
            onValueChange={actions.pickNewClass}
            placeholder="Оберіть клас"
            options={available.map((c) => ({ value: c.id, label: c.name }))}
            triggerClassName="w-full"
          />
        )}
        {form.needsSubclass && (
          <SelectField
            aria-label="Підклас"
            value={selection.subclassId}
            onValueChange={actions.pickSubclass}
            placeholder="Оберіть підклас"
            options={cls?.subclasses.map((s) => ({ value: s.id, label: s.name }))}
            required
            triggerClassName="w-full"
          />
        )}
        {nextRow && (gained.length > 0 || picksCount > 0) && (
          <section aria-label="Що дає рівень" className="space-y-1 rounded-md border border-hud-rule p-2 text-sm">
            <h4 className="font-semibold">Що дає рівень {nextLevel}</h4>
            {gained.length > 0 && <p>{gained.map((item) => item.name).join(", ")}</p>}
            {picksCount > 0 && <p className="text-hud-muted">Виборів: {picksCount}</p>}
          </section>
        )}
        {stepDefs.length > 0 && character.hero && raisedEntry && <LevelUpChoicesStep campaignId={character.campaignId} hero={character.hero} entry={raisedEntry} multiclass={multiclass} value={selection.picks} onChange={actions.setPicks} />}
        {form.error && <FormAlert>{form.error}</FormAlert>}
      </form>
    </ResponsiveDialog>
  );
}
