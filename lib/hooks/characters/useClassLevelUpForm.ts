"use client";

import { useMemo, useState } from "react";

import { useClassLevelUp } from "./useClassLevelUp";

import type { AbilityKey } from "@/lib/constants/abilities";
import { useClasses } from "@/lib/hooks/classes";
import { levelUpChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { buildClassProgression, classesById } from "@/lib/utils/characters/classes";
import { type MulticlassReason, multiclassReasons } from "@/lib/utils/characters/classes/multiclass";
import type { Character } from "@/types/characters";
import type { Picks } from "@/types/choices";
import type { CharacterClassEntry, GameClassData, ProgressionRow } from "@/types/classes";

export interface LevelUpCharacter {
  campaignId: string;
  id: string;
  entries: CharacterClassEntry[];
  hero?: { race: string; level: number; scores: Record<AbilityKey, number>; skills: unknown };
}

interface UseClassLevelUpFormArgs {
  open: boolean;
  character: LevelUpCharacter;
  onLeveled?: (updated: Character) => void;
  onClose: () => void;
  startNew?: boolean;
}

export const NEW_CLASS = "__new__";

const NO_CLASSES: GameClassData[] = [];

export interface AvailableClass {
  cls: GameClassData;
  reasons: MulticlassReason[];
}

export function useClassLevelUpForm({ open, character, onLeveled, onClose, startNew }: UseClassLevelUpFormArgs) {
  const { entries } = character;

  const { data: classes = NO_CLASSES } = useClasses(character.campaignId, { enabled: open });

  const byId = useMemo(() => classesById(classes), [classes]);

  const scores = character.hero?.scores;

  const available = useMemo<AvailableClass[]>(() => {
    const owned = entries.flatMap((e) => byId[e.classId] ?? []);

    return classes.filter((c) => !entries.some((e) => e.classId === c.id)).map((cls) => ({ cls, reasons: scores ? multiclassReasons(owned, cls, scores) : [] }));
  }, [classes, entries, byId, scores]);

  const [choice, setChoice] = useState(startNew ? NEW_CLASS : (entries[0]?.classId ?? NEW_CLASS));

  const [newClassId, setNewClassId] = useState("");

  const [subclassId, setSubclassId] = useState("");

  const [picks, setPicks] = useState<Picks>({});

  const levelUp = useClassLevelUp({ campaignId: character.campaignId, characterId: character.id, onLeveled });

  const classId = choice === NEW_CLASS ? newClassId : choice;

  const cls = byId[classId];

  const current = entries.find((e) => e.classId === classId);

  const nextLevel = (current?.level ?? 0) + 1;

  const needsSubclass = !!cls && cls.subclassLevel !== null && nextLevel >= cls.subclassLevel && !current?.subclassId && cls.subclasses.length > 0;

  const canSubmit = !!cls && (!needsSubclass || !!subclassId) && !levelUp.isPending;

  const subclassPicked = current?.subclassId ?? subclassId;

  const subclass = cls?.subclasses.find((s) => s.id === subclassPicked) ?? null;

  const multiclass = entries.length > 0 && entries[0].classId !== classId;

  const stepDefs = cls && character.hero ? levelUpChoiceDefs(cls, subclass, nextLevel, multiclass) : [];

  const raisedEntry: CharacterClassEntry | null = cls ? { classId, level: nextLevel, ...(subclassPicked && { subclassId: subclassPicked }), ...(current?.choices && { choices: current.choices }) } : null;

  const nextRow: ProgressionRow | null = cls && raisedEntry ? (buildClassProgression(cls, raisedEntry).rows.find((r) => r.level === nextLevel) ?? null) : null;

  const gained = nextRow ? [...nextRow.base, ...(raisedEntry?.subclassId ? (nextRow.bySubclass[raisedEntry.subclassId] ?? []) : [])] : [];

  const picksCount = stepDefs.length;

  const pickClass = (value: string) => {
    setChoice(value);
    setSubclassId("");
    setPicks({});
    levelUp.clearError();
  };

  const pickNewClass = (value: string) => {
    setNewClassId(value);
    setSubclassId("");
    setPicks({});
  };

  const pickSubclass = (value: string) => {
    setSubclassId(value);
    setPicks({});
  };

  const send = async (withChoices: boolean) => {
    if (!canSubmit) return;

    const chosen = withChoices && Object.values(picks).some((l) => l.length > 0);

    if (await levelUp.submit({ classId, ...(needsSubclass && { subclassId }), ...(chosen && { choices: picks }) })) onClose();
  };

  return {
    byId,
    available,
    selection: { choice, newClassId, subclassId, picks },
    cls,
    needsSubclass,
    stepDefs,
    multiclass,
    raisedEntry,
    nextRow,
    gained,
    picksCount,
    nextLevel,
    canSubmit,
    error: levelUp.error,
    actions: { pickClass, pickNewClass, pickSubclass, setPicks, send },
  };
}
