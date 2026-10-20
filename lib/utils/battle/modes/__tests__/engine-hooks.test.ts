import { afterEach, describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { attackReachError } from "@/lib/utils/battle/grid/attack-reach";
import type { MapModeDefinition } from "@/lib/utils/battle/modes";
import { registerTestMode } from "@/lib/utils/battle/modes";
import { modeEngages, modeSightedTargets } from "@/lib/utils/battle/modes/engine";
import { assertAbilityAim } from "@/lib/utils/battle/validation/ability-aim";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

type FakeConfig = { on: true };

type FakeMap = BattleMapConfig & { fake?: FakeConfig | null };

const fake: MapModeDefinition<FakeConfig> = {
  key: "fake",
  configOf: (map) => (map as FakeMap | null)?.fake ?? null,
  withConfig: (map, fake) => ({ ...map, fake }) as FakeMap,
  server: {},
  engine: {
    sees: ({ target }) => target.basicInfo.id !== "hidden",
    aimHiddenText: () => "приціл закритий",
    targetHiddenText: ({ targets }) => (targets.some((t) => t.basicInfo.id === "hidden") ? "ціль закрита" : null),
    meleeBlockedText: () => "блок",
    engages: () => false,
  },
  client: {},
};

const withMode = { cols: 10, rows: 10, fake: { on: true } } as FakeMap;

const plain = { cols: 10, rows: 10 } as BattleMapConfig;

const at = (id: string, side: string, position: GridPoint): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, id, side: side as BattleParticipant["basicInfo"]["side"] }, battleData: { ...p.battleData, position } };
};

const hero = at("h", ParticipantSide.ALLY, { x: 1, y: 1 });

const seen = at("seen", ParticipantSide.ENEMY, { x: 2, y: 1 });

const hidden = at("hidden", ParticipantSide.ENEMY, { x: 3, y: 1 });

const ps = [hero, seen, hidden];

const sword = { id: "s", name: "Меч", type: AttackType.MELEE } as BattleAttack;

const bow = { id: "b", name: "Лук", type: AttackType.RANGED, range: "80/320 фт" } as BattleAttack;

let off: () => void = () => {};

afterEach(() => off());

describe("хуки рушія в ядрі", () => {
  it("allEnemies: ворога, якого режим не бачить, відсіяно; без режиму — усі", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    const event = { type: "turnStart" } as never;

    expect(resolveTargetIds("allEnemies", "h", event, ps, { map: withMode })).toEqual(["seen"]);
    expect(resolveTargetIds("allEnemies", "h", event, ps, { map: plain })).toEqual(["seen", "hidden"]);
  });

  it("attackReachError: текст блокування ближньої та прихованої цілі", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    expect(attackReachError(withMode, ps, hero, sword, [seen])).toBe("блок");
    expect(attackReachError(withMode, ps, hero, bow, [hidden])).toBe("ціль закрита");
    expect(attackReachError(withMode, ps, hero, bow, [seen])).toBeNull();
    expect(attackReachError(plain, ps, hero, sword, [seen])).toBeNull();
  });

  it("engages з режиму: сусід не зв'язує стрільця", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    expect(modeEngages(withMode, hero, seen)).toBe(false);
    expect(modeEngages(plain, hero, seen)).toBe(true);
    expect(attackReachError(withMode, ps, hero, bow, [hidden])).toBe("ціль закрита");
  });

  it("assertAbilityAim кидає з текстом режиму", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    const ability = { aim: { range: 60 } } as ResolvedAbility;

    expect(() => assertAbilityAim(ability, withMode, hero, { x: 2, y: 2 })).toThrow("приціл закритий");
    expect(assertAbilityAim(ability, plain, hero, { x: 2, y: 2 })).toEqual({ x: 2, y: 2 });
  });

  it("modeSightedTargets відсіює лише невидимих ворогів", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    const ids = ["h", "seen", "hidden", "ghost"];

    expect(modeSightedTargets(withMode, ps, hero, ids)).toEqual(["h", "seen", "ghost"]);
    expect(modeSightedTargets(plain, ps, hero, ids)).toEqual(ids);
  });
});
