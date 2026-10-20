import { describe, expect, it } from "vitest";

import { type PaletteState,palettesToClose } from "../palettes";

const state = (open: Partial<PaletteState> = {}): PaletteState => ({ mode: false, terrain: false, weather: false, ...open });

describe("palettesToClose", () => {
  it("відкриття палітри режиму закриває погоду й місцевість", () => {
    expect(palettesToClose(state({ terrain: true, weather: true }), state({ mode: true, terrain: true, weather: true })).sort()).toEqual(["terrain", "weather"]);
  });

  it("відкриття місцевості чи погоди закриває палітру режиму", () => {
    expect(palettesToClose(state({ mode: true }), state({ mode: true, terrain: true }))).toEqual(["mode"]);
    expect(palettesToClose(state({ mode: true }), state({ mode: true, weather: true }))).toEqual(["mode"]);
  });

  it("закриття й відсутність змін нічого не закривають", () => {
    expect(palettesToClose(state({ mode: true }), state())).toEqual([]);
    expect(palettesToClose(state({ weather: true }), state({ weather: true }))).toEqual([]);
  });
});
