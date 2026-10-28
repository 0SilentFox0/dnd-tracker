import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn() }));

import { characterClassMode, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { refs, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const rules = { ...DEFAULT_RULES, classes: { enabled: true } };

const character = { race: "Elf", level: 4, skills: {}, ...scores };

describe("resolveCharacterChoices", () => {
  it("class mode needs rules and at least one class entry", () => {
    expect(characterClassMode(rules, [{ classId: "c", level: 1 }])).toBe(true);
    expect(characterClassMode(rules, [])).toBe(false);
    expect(characterClassMode(DEFAULT_RULES, [{ classId: "c", level: 1 }])).toBe(false);
  });

  it("returns prisma fields: JSON columns, subrace, changed scores", async () => {
    const before = { raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 4 }] };

    const after = { ...before, raceChoices: { "elven-lineage": [{ id: "drow" }] }, classes: [{ classId: sorcerer.id, level: 4, choices: { "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "strength" }, { id: "dexterity" }] } }] } }] };

    const result = await resolveCharacterChoices({ campaignId: "c1", rules, isDM: true, character, before, after, refs });

    expect(result).toMatchObject({ ok: true, fields: { raceChoices: after.raceChoices, subrace: "Drow", strength: 16, dexterity: 15, classes: after.classes, feats: [] } });
  });

  it("422 with issues on an invalid pick", async () => {
    const result = await resolveCharacterChoices({ campaignId: "c1", rules, isDM: true, character, before: { raceChoices: {}, feats: [], classes: [] }, after: { raceChoices: { "keen-senses": [{ id: "arcana" }] }, feats: [], classes: [] }, refs });

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.response.status).toBe(422);
    expect(await result.response.json()).toMatchObject({ error: expect.stringContaining("Навичка"), issues: [{ code: "SKILL_NOT_ALLOWED", path: "raceChoices.keen-senses" }] });
  });
});
