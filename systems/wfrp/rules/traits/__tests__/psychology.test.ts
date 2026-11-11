import { describe, expect, it } from "vitest";

import { wfrpPsychology } from "../psychology";
import { trait } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { conditionLevel } from "@/systems/wfrp/rules/conditions/levels";
import type { BattleParticipant } from "@/types/battle";

const HERO_WP = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, wp: 40 } };

const rollOf = (...rolls: number[]) => {
  const queue = [...rolls];

  return () => ((queue.shift() ?? 50) - 1) / 100 + 0.001;
};

const make = (id: string, side: ParticipantSide, effects: unknown[] = [], over: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const p = makeParticipant({ id, side, abilities: effects.length ? [trait(effects, { key: `t-${id}` })] : [] });

  return { ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(HERO_WP) }, battleData: { ...p.battleData, ...over } };
};

const fear = (value: number) => ({ kind: "wfrpPsychology", psychology: "fear", value });

const terror = (value: number) => ({ kind: "wfrpPsychology", psychology: "terror", value });

const hero = (id = "h", over: Partial<BattleParticipant["battleData"]> = {}) => make(id, ParticipantSide.ALLY, [], over);

const monster = (id: string, ...effects: unknown[]) => make(id, ParticipantSide.ENEMY, effects);

const find = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

describe("wfrpPsychology", () => {
  it("passes a Fear 1 test and remembers it", () => {
    const r = wfrpPsychology([hero(), monster("m", fear(1))], { round: 1, rng: rollOf(30) });

    expect(conditionLevel(find(r.participants, "h"), "broken")).toBe(0);
    expect(find(r.participants, "h").battleData.psychologyTested).toEqual({ fear: 1 });
    expect(r.testerIds).toEqual(["h"]);
    expect(r.messages[0]).toMatchObject({ message: "battleWfrp.log.psychologyPass", params: { name: "h", source: "m", value: 1, roll: 30, target: 40, sl: 1 } });
  });

  it("breaks the hero on failure", () => {
    const r = wfrpPsychology([hero(), monster("m", fear(1))], { round: 1, rng: rollOf(70) });

    expect(conditionLevel(find(r.participants, "h"), "broken")).toBe(1);
    expect(r.messages[0]).toMatchObject({ message: "battleWfrp.log.psychologyFail" });
  });

  it("needs SL value-1 to pass", () => {
    const r = wfrpPsychology([hero(), monster("m", fear(3))], { round: 1, rng: rollOf(30) });

    expect(conditionLevel(find(r.participants, "h"), "broken")).toBe(1);
  });

  it("terror failure adds levels by SL and then a fear test", () => {
    const r = wfrpPsychology([hero(), monster("m", terror(2))], { round: 1, rng: rollOf(70, 70) });

    expect(conditionLevel(find(r.participants, "h"), "broken")).toBe(1 + 3 + 1);
    expect(find(r.participants, "h").battleData.psychologyTested).toEqual({ terror: 2, fear: 2 });
  });

  it("the fear test after a failed terror test includes the fresh broken penalty", () => {
    const r = wfrpPsychology([hero(), monster("m", terror(1))], { round: 1, rng: rollOf(70, 70) });

    const targets = r.messages.flatMap((m) => (typeof m !== "string" && m.message === "battleWfrp.log.psychologyFail" ? [m.params?.target] : []));

    expect(targets[0]).toBe(40);
    expect(targets[1]).toBeLessThan(40);
  });

  it("terror passed but fear failed adds one level", () => {
    const r = wfrpPsychology([hero(), monster("m", terror(1))], { round: 1, rng: rollOf(10, 70) });

    expect(conditionLevel(find(r.participants, "h"), "broken")).toBe(1);
  });

  it("tests once against the strongest of several sources", () => {
    const r = wfrpPsychology([hero(), monster("a", fear(2)), monster("b", fear(1))], { round: 1, rng: rollOf(10, 10) });

    expect(r.messages).toHaveLength(1);
    expect(r.messages[0]).toMatchObject({ params: { source: "a", value: 2 } });

    const mixed = wfrpPsychology([hero(), monster("a", fear(2)), monster("b", terror(1))], { round: 1, rng: rollOf(10, 10) });

    expect(mixed.messages[0]).toMatchObject({ params: { source: "b" } });
  });

  it("does not retest without newcomers", () => {
    const first = wfrpPsychology([hero(), monster("m", fear(1))], { round: 1, rng: rollOf(30) });

    const again = wfrpPsychology(first.participants, { round: 2, rng: rollOf(70) });

    expect(again.messages).toEqual([]);
    expect(again.testerIds).toEqual([]);
  });

  it("a stronger newcomer retests, a weaker one does not", () => {
    const tested = [hero("h", { psychologyTested: { fear: 2 } }), monster("old", fear(2))];

    const strong = wfrpPsychology([...tested, monster("n3", fear(3))], { round: 2, rng: rollOf(10), newcomerIds: ["n3"] });

    expect(strong.testerIds).toEqual(["h"]);

    const weak = wfrpPsychology([...tested, monster("n1", fear(1))], { round: 2, rng: rollOf(10), newcomerIds: ["n1"] });

    expect(weak.testerIds).toEqual([]);
  });

  it("a newcomer tester tests only against existing sources", () => {
    const r = wfrpPsychology([hero("old", { psychologyTested: { fear: 1 } }), hero("new"), monster("m", fear(1))], { round: 2, rng: rollOf(10), newcomerIds: ["new"] });

    expect(r.testerIds).toEqual(["new"]);
  });

  it("skips allies of the source, bearers and immune testers", () => {
    const ally = make("ally", ParticipantSide.ENEMY);

    expect(wfrpPsychology([ally, monster("m", fear(1))], { round: 1, rng: rollOf(10) }).testerIds).toEqual([]);

    const bearer = make("bearer", ParticipantSide.ALLY, [fear(1)]);

    expect(wfrpPsychology([bearer, monster("m", fear(1))], { round: 1, rng: rollOf(10) }).testerIds).toEqual([]);

    for (const conditions of [["fear"], "all"]) {
      const immune = make("i", ParticipantSide.ALLY, [{ kind: "flag", flag: "conditionImmunity", conditions }]);

      expect(wfrpPsychology([immune, monster("m", fear(1))], { round: 1, rng: rollOf(10) }).testerIds).toEqual([]);
    }
  });

  it("ignores dormant sources and testers", () => {
    expect(wfrpPsychology([hero(), { ...monster("m", fear(1)), battleData: { ...monster("m", fear(1)).battleData, dormant: true } }], { round: 1, rng: rollOf(10) }).testerIds).toEqual([]);
    expect(wfrpPsychology([hero("h", { dormant: true }), monster("m", fear(1))], { round: 1, rng: rollOf(10) }).testerIds).toEqual([]);
  });
});
