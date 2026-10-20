import { afterEach, describe, expect, it, vi } from "vitest";

import type { MapModeDefinition, ModeAwareOutcome } from "@/lib/utils/battle/modes";
import { registerTestMode } from "@/lib/utils/battle/modes";
import { modeAutoSkipText, modeBlockedText, modeEnter, modePlaceAll, modeReset, modeSnapshotSlice, modeStart, restoreModeSlices, withModeAfterMutation } from "@/lib/utils/battle/modes/server";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

type FakeConfig = { on: true; dark?: boolean };

type FakeMap = BattleMapConfig & { fake?: FakeConfig | null };

const hooks = {
  onStart: vi.fn(({ order }) => ({ participants: order, turnIndex: 1 })),
  afterMutation: vi.fn(({ result }) => ({ ...result, events: [...(result.events ?? []), { text: "fake" }] })),
  blockedText: vi.fn((c: FakeConfig) => (c.dark ? "темно" : null)),
  autoSkipText: vi.fn(() => "пропуск"),
  placeAll: vi.fn(({ participants }) => participants),
  onEnter: vi.fn(({ participant }) => ({ ...participant, battleData: { ...participant.battleData, dormant: true } })),
  onReset: vi.fn(() => ({ on: true as const })),
};

const fake: MapModeDefinition<FakeConfig> = {
  key: "fake",
  configOf: (map) => (map as FakeMap | null)?.fake ?? null,
  withConfig: (map, fake) => ({ ...map, fake }) as FakeMap,
  server: hooks,
  engine: {},
  client: {},
};

const map = { cols: 5, rows: 5, fake: { on: true, dark: true } } as FakeMap;

const hero = { basicInfo: { id: "h" }, battleData: {} } as unknown as BattleParticipant;

let off: () => void = () => {};

afterEach(() => {
  off();
  vi.clearAllMocks();
});

describe("ядро викликає хуки активного режиму", () => {
  it("кожна точка сервера йде в режим", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    expect(modeStart(map, [hero])?.turnIndex).toBe(1);
    expect(withModeAfterMutation(map, { status: "active", round: 1 } as never, { participants: [] } as ModeAwareOutcome).events).toEqual([{ text: "fake" }]);
    expect(modeBlockedText(map)).toBe("темно");
    expect(modeAutoSkipText(map)).toBe("пропуск");
    expect(modePlaceAll(map, [hero])).toEqual([hero]);
    expect(modeEnter(map, hero).battleData.dormant).toBe(true);
    expect((modeReset(map) as FakeMap).fake).toEqual({ on: true });
    expect(modeSnapshotSlice(map)).toMatchObject({ fake: { on: true, dark: true } });
    expect((restoreModeSlices({ cols: 5, rows: 5 } as FakeMap, { fake: { on: true } } as never) as FakeMap).fake).toEqual({ on: true });
  });

  it("без режиму — нейтрально", () => {
    const plain = { cols: 5, rows: 5 } as BattleMapConfig;

    expect(modeStart(plain, [hero])).toBeNull();
    expect(modeBlockedText(plain)).toBeNull();
    expect(modeAutoSkipText(null)).toBeNull();
    expect(modePlaceAll(plain, [hero])).toBeNull();
    expect(modeEnter(null, hero)).toBe(hero);
    expect(modeReset(plain)).toBe(plain);
    expect(restoreModeSlices(plain, {} as never)).toBe(plain);
    expect(hooks.onStart).not.toHaveBeenCalled();
  });
});
