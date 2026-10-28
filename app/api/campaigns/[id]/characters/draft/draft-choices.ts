import type { NextResponse } from "next/server";

import type { DraftData } from "./draft-schema";

import { DND_SKILLS } from "@/lib/constants/skills";
import { type ChoiceFields, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { backgroundFields } from "@/lib/utils/backgrounds/selection";
import { skillFlags } from "@/lib/utils/characters/choices/walk";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { CharacterClassEntry, GameClassData } from "@/types/classes";

export async function draftChoiceFields(input: { campaignId: string; rules: Ruleset; data: DraftData; classes: CharacterClassEntry[]; classesById?: Readonly<Record<string, GameClassData>>; storedSkills?: unknown }): Promise<{ ok: true; fields: ChoiceFields } | { ok: false; response: NextResponse } | null> {
  const { data } = input;

  if (!data.choices) return null;

  const classChoices = data.choices.classChoices;

  const pool = new Set<string>([...skillFlags(input.storedSkills), ...(input.classes[0] ? (input.classesById?.[input.classes[0].classId]?.skillChoices.from ?? []) : [])]);

  const skills = Object.fromEntries(DND_SKILLS.filter((k) => pool.has(k)).map((k) => [k, true]));

  const classes = input.classes.map((e, i) => (i === 0 && classChoices ? { ...e, choices: classChoices } : e));

  // a draft's scores come fresh from point buy, so the delta is counted from an empty state
  return resolveCharacterChoices({
    campaignId: input.campaignId,
    rules: input.rules,
    isDM: false,
    character: { race: data.race, level: 1, skills, strength: data.strength, dexterity: data.dexterity, constitution: data.constitution, intelligence: data.intelligence, wisdom: data.wisdom, charisma: data.charisma },
    before: { raceChoices: {}, feats: [], classes: [] },
    after: { ...backgroundFields(data.choices), raceChoices: data.choices.raceChoices ?? {}, feats: (data.choices.feats ?? []).filter((f) => f.source === "origin"), classes },
  });
}
