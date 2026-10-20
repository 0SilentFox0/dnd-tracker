import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import type { Effect } from "@/lib/utils/abilities/schema";
import { resolveSpellTargets, type SpellMapContext } from "@/lib/utils/battle/spell/spell-targeting";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleMapConfig, BattleParticipant, Direction8, GridPoint, MazeConfig } from "@/types/battle";

const mapOf = (over: Partial<MazeConfig> = {}): BattleMapConfig => ({
  cols: 12,
  rows: 12,
  background: null,
  opacity: 0.3,
  maze: { walls: [], exit: { x: 11, y: 11 }, difficulty: "medium", teleports: [], fog: [], marks: {}, dark: false, ...over },
});

const spell = { id: "sp", groupId: "chaos", level: 1 };

function at(id: string, position: GridPoint, side: ParticipantSide = ParticipantSide.ALLY, extra: { facing?: Direction8; effects?: Effect[]; dormant?: boolean } = {}): BattleParticipant {
  const p = makeParticipant({ id, side, abilities: extra.effects?.length ? [resolved({ trigger: { event: "passive" }, effects: extra.effects })] : [] });

  return { ...p, battleData: { ...p.battleData, position, ...(extra.facing && { facing: extra.facing }), ...(extra.dormant && { dormant: true }) } };
}

const caster = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY, { facing: "e" });

const ahead = at("e1", { x: 8, y: 5 }, ParticipantSide.ENEMY);

const behind = at("e2", { x: 2, y: 5 }, ParticipantSide.ENEMY);

const friendBehind = at("a2", { x: 3, y: 9 });

const ps = [caster, ahead, behind, friendBehind];

const resolve = (targeting: SpellTargeting, ctx: SpellMapContext, list = ps, who = caster) => resolveSpellTargets(list, who, spell, targeting, [], ctx);

describe("масові заклинання в лабіринті — лише вороги в полі зору заклинателя", () => {
  it("«усі вороги»: ворог позаду не зачеплений; без лабіринту — усі", () => {
    expect(resolve({ kind: "allEnemies" }, { map: mapOf() })).toEqual({ ok: true, targetIds: ["e1"] });
    expect(resolve({ kind: "allEnemies" }, { map: { ...mapOf(), maze: null } })).toEqual({ ok: true, targetIds: ["e1", "e2"] });
  });

  it("«усі»: союзники поза полем зору лишаються, невидимі вороги — ні", () => {
    expect(resolve({ kind: "everyone" }, { map: mapOf() })).toEqual({ ok: true, targetIds: ["c", "e1", "a2"] });
    expect(resolve({ kind: "allAllies" }, { map: mapOf() })).toEqual({ ok: true, targetIds: ["c", "a2"] });
  });

  it("розширення вмінням «на всіх»: лише видимі вороги", () => {
    const widened = at("c", { x: 5, y: 5 }, ParticipantSide.ALLY, { facing: "e", effects: [{ kind: "flag", flag: "spellTargeting", mode: "all" } as Effect] });

    const r = resolveSpellTargets([widened, ahead, behind], widened, spell, { kind: "enemy", range: 120 }, ["e1"], { map: mapOf() });

    expect(r).toEqual({ ok: true, targetIds: ["e1"] });
  });
});

describe("масові вміння не зачіпають сплячих у лабіринті", () => {
  it("allEnemies / everyone без сплячого", () => {
    const sleeper = at("z", { x: 9, y: 9 }, ParticipantSide.ENEMY, { dormant: true });

    const list = [caster, ahead, sleeper];

    const event = { type: "turnStart", participantId: "c" } as unknown as AbilityEvent;

    expect(resolveTargetIds("allEnemies", "c", event, list)).toEqual(["e1"]);
    expect(resolveTargetIds("everyone", "c", event, list)).toEqual(["c", "e1"]);
  });
});
