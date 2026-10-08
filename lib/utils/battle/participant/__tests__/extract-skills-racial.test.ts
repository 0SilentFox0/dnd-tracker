import { describe, expect, it } from "vitest";

import { resolveCharacterSkillEntries } from "../extract-skills";

import { RACES } from "@/data/library/races";
import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";
import { buildTreeJson, racialNodeId } from "@/lib/utils/skills/progression";

async function learnedRacial(raceKey: string, levels: Array<"basic" | "advanced" | "expert">) {
  const race = RACES.find((r) => r.key === raceKey);

  if (!race) throw new Error(raceKey);

  const rows = Object.fromEntries([...race.levels, race.ultimate].map((s) => [s.key, { id: s.key, name: s.name, abilities: s.abilities }]));

  const [basic, advanced, expert] = race.levels;

  const tree = { id: "t1", race: race.name, skills: buildTreeJson({ id: "t1", race: race.name, branches: [], racial: { basic: basic.key, advanced: advanced.key, expert: expert.key }, ultimate: race.ultimate.key }) };

  const character = { race: race.name, personalSkillId: null, skillTreeProgress: { t1: { unlockedSkills: levels.map(racialNodeId) } } };

  const entries = await resolveCharacterSkillEntries(character as never, "c1", rows as never, new Map(), tree as never);

  return collectCharacterAbilities({ skills: entries as never, race: null, artifacts: [], completedSets: [] });
}

const ALL = ["basic", "advanced", "expert"] as const;

describe("racial level line", () => {
  it("applies only the highest learned racial level", async () => {
    const dwarf = await learnedRacial("dwarves", [...ALL]);

    const armor = dwarf.flatMap((a) => a.effects).filter((e) => e.kind === "flag" && e.flag === "resistance");

    expect(armor).toHaveLength(1);
    expect(armor[0]).toMatchObject({ percent: 20 });

    const human = await learnedRacial("humans", [...ALL]);

    const counter = human.flatMap((a) => a.effects).filter((e) => e.kind === "flag" && e.flag === "counterAttack");

    expect(counter).toEqual([expect.objectContaining({ bonusPercent: 40 })]);
  });

  it("keeps a single summon ability for the demons gate", async () => {
    const demon = await learnedRacial("demons", [...ALL]);

    const summons = demon.flatMap((a) => a.effects).filter((e) => e.kind === "summon");

    expect(summons).toEqual([expect.objectContaining({ tier: 7 })]);
  });

  it("lower levels alone still apply", async () => {
    const dwarf = await learnedRacial("dwarves", ["basic"]);

    expect(dwarf.flatMap((a) => a.effects)).toEqual([expect.objectContaining({ percent: 10 })]);
  });
});
