import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { refs, rogue, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";

vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => refs) }));

import { draftChoiceFields } from "../draft-choices";

import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const data = { name: "Lia", race: "Elf", method: "standard", strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 } as const;

const rules = { ...DEFAULT_RULES, classes: { enabled: true } };

describe("draftChoiceFields", () => {
  it("null without choices; class picks go to the starting class; dm feats are dropped", async () => {
    expect(await draftChoiceFields({ campaignId: "c1", rules, data, classes: [] })).toBeNull();

    const result = await draftChoiceFields({
      campaignId: "c1",
      rules,
      data: { ...data, choices: { raceChoices: { "elven-lineage": [{ id: "drow" }] }, feats: [{ id: "f-alert", source: "origin" }, { id: "f-archery", source: "dm" }], classChoices: { cantrips: [{ id: "sp-firebolt" }] } } },
      classes: [{ classId: sorcerer.id, level: 1 }],
    });

    expect(result).toMatchObject({ ok: true, fields: { subrace: "Drow", feats: [{ id: "f-alert", source: "origin" }], classes: [{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-firebolt" }] } }] } });
  });

  it("422 response on a bad pick", async () => {
    const result = await draftChoiceFields({ campaignId: "c1", rules, data: { ...data, choices: { raceChoices: { "keen-senses": [{ id: "arcana" }] } } }, classes: [] });

    expect(result && !result.ok && result.response.status).toBe(422);
  });

  it("expertise passes for a skill from the class pool, fails outside it", async () => {
    const classesById = { [rogue.id]: { ...rogue, skillChoices: { count: 4, from: ["stealth", "acrobatics"] } } };

    const run = (skill: string) =>
      draftChoiceFields({ campaignId: "c1", rules, data: { ...data, choices: { raceChoices: {}, classChoices: { "expertise-1": [{ id: skill }] } } }, classes: [{ classId: rogue.id, level: 1 }], classesById });

    expect((await run("stealth"))?.ok).toBe(true);
    expect(((await run("arcana")) as { ok: boolean }).ok).toBe(false);
  });
});
