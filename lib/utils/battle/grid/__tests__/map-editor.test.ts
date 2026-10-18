import { describe, expect, it } from "vitest";

import { cellKey } from "../geometry";
import { applyMargins, clampMargins, hasPlayableArea, inferMargins, isPreviewSafeBackground, marginsBlocked, resizeMap, toggleBlocked } from "../map-editor";

import type { BattleMapConfig } from "@/types/battle";

const base: BattleMapConfig = { cols: 20, rows: 12, background: null, opacity: 0.35 };

const m3 = { top: 3, right: 3, bottom: 3, left: 3 };

describe("map-editor", () => {
  it("поля 3 на 20×12 → 156 клітинок", () => {
    expect(marginsBlocked(20, 12, m3)).toHaveLength(156);
  });

  it("різні поля по сторонах", () => {
    expect(marginsBlocked(4, 4, { top: 1, right: 0, bottom: 0, left: 0 })).toHaveLength(4);
  });

  it("inferMargins відновлює 3/3/3/3 і нулі без blocked", () => {
    expect(inferMargins(applyMargins(base, m3))).toEqual(m3);
    expect(inferMargins(base)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("toggleBlocked додає і знімає", () => {
    const on = toggleBlocked(base, { x: 5, y: 5 });

    expect(on.blocked).toEqual([cellKey({ x: 5, y: 5 })]);
    expect(toggleBlocked(on, { x: 5, y: 5 }).blocked).toBeUndefined();
  });

  it("resizeMap відкидає blocked поза сіткою", () => {
    const map = applyMargins(base, { top: 0, right: 0, bottom: 0, left: 0 });

    const painted = toggleBlocked(toggleBlocked(map, { x: 15, y: 2 }), { x: 2, y: 2 });

    expect(resizeMap(painted, 10, 10).blocked).toEqual(["2:2"]);
  });

  it("applyMargins зберігає намальовані клітинки поза полями", () => {
    const painted = toggleBlocked(applyMargins(base, m3, { top: 0, right: 0, bottom: 0, left: 0 }), { x: 10, y: 6 });

    const next = applyMargins(painted, { top: 1, right: 1, bottom: 1, left: 1 }, m3);

    expect(next.blocked).toContain("10:6");
    expect(next.blocked).toHaveLength(20 * 12 - 18 * 10 + 1);
    expect(next.blocked).not.toContain("2:2");
  });

  it("clampMargins лишає 2 клітинки", () => {
    expect(clampMargins({ cols: 12, rows: 4 }, { top: 8, right: 0, bottom: 0, left: 0 })).toEqual({ top: 2, right: 0, bottom: 0, left: 0 });
  });

  it("hasPlayableArea шукає блок 2×2", () => {
    expect(hasPlayableArea({ cols: 4, rows: 4, blocked: ["0:1", "1:0", "3:3", "2:2"] })).toBe(true);
    expect(hasPlayableArea({ cols: 4, rows: 4, blocked: ["0:1", "1:2", "2:1", "3:2", "1:0", "3:0"] })).toBe(false);
  });

  it("isPreviewSafeBackground пропускає лише безпечні джерела", () => {
    for (const ok of ["/battle-maps/a.webp", "data:image/webp;base64,AAAA", "https://abc.supabase.co/storage/v1/object/public/battle-maps/x.webp"]) expect(isPreviewSafeBackground(ok)).toBe(true);

    for (const bad of ["h", "https://evil.com/a.png", "http://abc.supabase.co/storage/v1/object/public/x", "", null]) expect(isPreviewSafeBackground(bad)).toBe(false);
  });
});
