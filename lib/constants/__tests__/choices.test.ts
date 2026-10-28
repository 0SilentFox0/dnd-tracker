import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CHOICE_ID_RE, CHOICE_KIND_LABELS, CHOICE_KINDS, FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

describe("choices constants", () => {
  it("kinds and feat types have labels", () => {
    expect([...CHOICE_KINDS]).toEqual(["option", "feat", "skill", "expertise", "abilityScore", "spell"]);
    expect([...FEAT_TYPES]).toEqual(["origin", "general", "fightingStyle", "epicBoon"]);
    expect(Object.keys(CHOICE_KIND_LABELS)).toEqual([...CHOICE_KINDS]);
    expect(Object.keys(FEAT_TYPE_LABELS)).toEqual([...FEAT_TYPES]);
  });

  it("choice ids are kebab-case slugs", () => {
    expect(CHOICE_ID_RE.test("elven-lineage")).toBe(true);
    expect(CHOICE_ID_RE.test("ability-score-improvement-4")).toBe(true);
    expect(CHOICE_ID_RE.test("Elven Lineage")).toBe(false);
    expect(CHOICE_ID_RE.test("-x")).toBe(false);
  });

  it("error key and log line", () => {
    expect(API_ERRORS.FEAT_IN_USE).toBe("errors.featInUse");
    expect(CharacterLogKind.CHOICES_EDIT).toBe("choices_edit");
    expect(describeCharacterLog({ kind: "choices_edit", data: {} })).toBe("✎ Змінено вибори (раса, риси, опції класу)");
  });
});
