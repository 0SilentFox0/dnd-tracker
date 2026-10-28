"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { useClassLevelUp } from "@/lib/hooks/characters";
import { useClasses } from "@/lib/hooks/classes";
import { classesById } from "@/lib/utils/characters/classes";
import type { Character } from "@/types/characters";
import type { CharacterClassEntry, GameClassData } from "@/types/classes";

interface ClassLevelUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: { campaignId: string; id: string; entries: CharacterClassEntry[] };
  onLeveled?: (updated: Character) => void;
}

const NEW_CLASS = "__new__";

const NO_CLASSES: GameClassData[] = [];

export function ClassLevelUpDialog({ open, onOpenChange, character, onLeveled }: ClassLevelUpDialogProps) {
  const { entries } = character;

  const { data: classes = NO_CLASSES } = useClasses(character.campaignId, { enabled: open });

  const byId = useMemo(() => classesById(classes), [classes]);

  const available = useMemo(() => classes.filter((c) => !entries.some((e) => e.classId === c.id)), [classes, entries]);

  const [choice, setChoice] = useState(entries[0]?.classId ?? NEW_CLASS);

  const [newClassId, setNewClassId] = useState("");

  const [subclassId, setSubclassId] = useState("");

  const levelUp = useClassLevelUp({ campaignId: character.campaignId, characterId: character.id, onLeveled });

  const classId = choice === NEW_CLASS ? newClassId : choice;

  const cls = byId[classId];

  const current = entries.find((e) => e.classId === classId);

  const nextLevel = (current?.level ?? 0) + 1;

  const needsSubclass = !!cls && cls.subclassLevel !== null && nextLevel >= cls.subclassLevel && !current?.subclassId && cls.subclasses.length > 0;

  const canSubmit = !!cls && (!needsSubclass || !!subclassId) && !levelUp.isPending;

  const pick = (value: string) => {
    setChoice(value);
    setSubclassId("");
    levelUp.clearError();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    if (await levelUp.submit({ classId, ...(needsSubclass && { subclassId }) })) onOpenChange(false);
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
          <Button type="submit" form="class-level-up-form" disabled={!canSubmit}>
            Підвищити
          </Button>
        </>
      }
    >
      <form id="class-level-up-form" onSubmit={(e) => void submit(e)} className="space-y-3">
        <fieldset className="space-y-2">
          {entries.map((entry) => (
            <label key={entry.classId} className="flex items-center gap-2 text-sm">
              <input type="radio" name="class-pick" checked={choice === entry.classId} onChange={() => pick(entry.classId)} />
              {byId[entry.classId] ? `${byId[entry.classId].name} ${entry.level} → ${entry.level + 1}` : "Клас не знайдено"}
            </label>
          ))}
          {available.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="class-pick" checked={choice === NEW_CLASS} onChange={() => pick(NEW_CLASS)} />
              Новий клас
            </label>
          )}
        </fieldset>
        {choice === NEW_CLASS && (
          <SelectField
            aria-label="Новий клас"
            value={newClassId}
            onValueChange={(v) => {
              setNewClassId(v);
              setSubclassId("");
            }}
            placeholder="Оберіть клас"
            options={available.map((c) => ({ value: c.id, label: c.name }))}
            triggerClassName="w-full"
          />
        )}
        {needsSubclass && (
          <SelectField
            aria-label="Підклас"
            value={subclassId}
            onValueChange={setSubclassId}
            placeholder="Оберіть підклас"
            options={cls.subclasses.map((s) => ({ value: s.id, label: s.name }))}
            required
            triggerClassName="w-full"
          />
        )}
        {levelUp.error && (
          <p role="alert" className="text-sm text-destructive">
            {levelUp.error}
          </p>
        )}
      </form>
    </ResponsiveDialog>
  );
}
