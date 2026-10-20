import { afterEach, describe, expect, it, vi } from "vitest";

import type { MapModeDefinition, ModeView } from "@/lib/utils/battle/modes";
import { registerTestMode } from "@/lib/utils/battle/modes";
import { mergeModeDeltas, type ModeDeltas, modeDeltas, modeFxVisible, modeLogVisible } from "@/lib/utils/battle/modes/client";
import type { BattleAction, BattleMapConfig } from "@/types/battle";

type FakeConfig = { a: number; b: number };

type FakeMap = BattleMapConfig & { fake?: FakeConfig | null };

const deltaOf = vi.fn((before: FakeConfig | null | undefined, after: FakeConfig | null | undefined) => (before && after && before.a === after.a ? { b: after.b } : null));

const logVisible = vi.fn(() => false);

const fxVisible = vi.fn(() => false);

const fake: MapModeDefinition<FakeConfig> = {
  key: "fake",
  configOf: (map) => (map as FakeMap | null)?.fake ?? null,
  withConfig: (map, fake) => ({ ...map, fake }) as FakeMap,
  server: {},
  engine: {},
  client: { deltaOf, logVisible, fxVisible },
};

const map = (fake: FakeConfig): FakeMap => ({ cols: 5, rows: 5, fake }) as FakeMap;

const view = {} as ModeView;

const event = {} as BattleAction;

let off: () => void = () => {};

afterEach(() => off());

describe("клієнтські хуки режиму", () => {
  it("modeDeltas: патч за ключем режиму; null від режиму — повна карта", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    expect(modeDeltas(map({ a: 1, b: 1 }), map({ a: 1, b: 2 }))).toEqual({ fake: { b: 2 } });
    expect(modeDeltas(map({ a: 1, b: 1 }), map({ a: 2, b: 1 }))).toBeNull();
  });

  it("modeDeltas без змін режиму — порожньо", () => {
    expect(modeDeltas({ cols: 5, rows: 5 } as BattleMapConfig, { cols: 5, rows: 5 } as BattleMapConfig)).toEqual({});
  });

  it("mergeModeDeltas зливає патч; без конфігу в кеші — refetch", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    // фіктивного режиму немає в MapModeKey
    const patch = { fake: { b: 5 } } as ModeDeltas;

    expect((mergeModeDeltas(map({ a: 1, b: 1 }), patch) as FakeMap).fake).toEqual({ a: 1, b: 5 });
    expect(mergeModeDeltas({ cols: 5, rows: 5 } as BattleMapConfig, patch)).toBe("refetch");
    expect(mergeModeDeltas({ cols: 5, rows: 5 } as BattleMapConfig, {})).toEqual({ cols: 5, rows: 5 });
  });

  it("видимість журналу й FX — з режиму; без режиму видно все", () => {
    off = registerTestMode(fake as MapModeDefinition<unknown>);

    expect(modeLogVisible(map({ a: 1, b: 1 }), view, event)).toBe(false);
    expect(modeFxVisible(map({ a: 1, b: 1 }), view, event)).toBe(false);
    expect(logVisible).toHaveBeenCalledWith(view, event);
    expect(modeLogVisible({ cols: 5, rows: 5 } as BattleMapConfig, view, event)).toBe(true);
    expect(modeFxVisible(null, view, event)).toBe(true);
  });
});
