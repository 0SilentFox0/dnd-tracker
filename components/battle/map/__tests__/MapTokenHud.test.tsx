// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const fx = vi.hoisted(() => ({ userEnabled: true, motionAllowed: true }));

vi.mock("@/lib/hooks/battle/useFxEnabled", () => ({ useFxEnabled: () => ({ enabled: fx.userEnabled && fx.motionAllowed, ...fx, setEnabled: vi.fn() }) }));

import { MapTokenHud } from "@/components/battle/map/MapTokenHud";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { ActiveEffect } from "@/types/battle";

const base = createMockParticipant();

const unit = (hp: number, size = 1) => ({ ...base, basicInfo: { ...base.basicInfo, id: "u", name: "Огр" }, combatStats: { ...base.combatStats, currentHp: hp, maxHp: 40, gridSize: size } });

const effect = (name: string, fxElement: string, extra: Partial<ActiveEffect> = {}) =>
  ({ id: name, name, type: "debuff", duration: 2, permanent: false, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], fxElement, ...extra }) as unknown as ActiveEffect;

const hud = (over: { hp?: number; size?: number; exact?: boolean; effects?: ActiveEffect[] } = {}) =>
  render(
    <MapTokenHud participant={unit(over.hp ?? 30, over.size)} box={{ cx: 50, cy: 50, size: 100 * (over.size ?? 1) }} mapSize={{ width: 1000, height: 1000 }} pxPerUnit={0.8} exact={over.exact ?? true} raised={false} effects={over.effects} />,
  );

const q = (c: HTMLElement, sel: string) => c.querySelector<HTMLElement>(sel) as HTMLElement;

afterEach(() => {
  cleanup();
  fx.userEnabled = true;
  fx.motionAllowed = true;
});

describe("MapTokenHud bar", () => {
  it("exact: заливка й слід на частку HP, тон за порогами, число всередині смуги", () => {
    const { container } = hud({ hp: 30 });

    const bar = q(container, "[data-map-hud-bar]");

    expect(q(bar, "[data-map-hud-fill]").style.width).toBe("75%");
    expect(q(bar, "[data-map-hud-trail]").style.width).toBe("75%");
    expect(bar.dataset.hpTone).toBe("high");
    expect(bar.textContent).toBe("30/40");
  });

  it.each([
    [15, "mid"],
    [8, "low"],
  ])("HP %i → тон %s", (hp, tone) => {
    const { container } = hud({ hp });

    expect(q(container, "[data-map-hud-bar]").dataset.hpTone).toBe(tone);
  });

  it("не exact: мітка стану замість чисел, ширина за сегментами", () => {
    const { container } = hud({ hp: 15, exact: false });

    const bar = q(container, "[data-map-hud-bar]");

    expect(bar.textContent).toBe("закривавлений");
    expect(bar.textContent).not.toMatch(/\d/);
    expect(q(bar, "[data-map-hud-fill]").style.width).toBe("50%");
  });

  it("великий токен показує ім'я над смугою", () => {
    const { container } = hud({ size: 2 });

    const strip = q(container, "[data-map-hud-strip]");

    expect(strip.textContent).toContain("Огр");
    expect(strip.lastElementChild?.hasAttribute("data-map-hud-bar")).toBe(true);
  });
});

describe("MapTokenHud status motifs", () => {
  const motifs = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>("[data-hud-fx]")].map((e) => e.dataset.hudFx);

  it("мороз → крижана рамка й мотив", () => {
    const { container } = hud({ effects: [effect("Холод", "cold")] });

    expect(q(container, "[data-map-hud-strip]").dataset.hudRim).toBe("frost");
    expect(motifs(container)).toEqual(["frost"]);
  });

  it("горіння → вогонь", () => {
    const { container } = hud({ effects: [effect("Підпал", "fire")] });

    expect(q(container, "[data-map-hud-strip]").dataset.hudRim).toBe("fire");
  });

  it("кілька ефектів — два найпріоритетніші, рамка від першого", () => {
    const { container } = hud({ effects: [effect("Отрута", "poison"), effect("Холод", "cold"), { ...effect("Оглушення", ""), type: "condition", effects: [{ type: "skip_action", value: 1 }] } as ActiveEffect] });

    expect(motifs(container)).toEqual(["stun", "plague"]);
    expect(q(container, "[data-map-hud-strip]").dataset.hudRim).toBe("stun");
  });

  it("зменшений рух — відтінок лишається, анімації немає", () => {
    fx.motionAllowed = false;

    const { container } = hud({ effects: [effect("Холод", "cold")] });

    const strip = q(container, "[data-map-hud-strip]");

    expect(strip.dataset.hudRim).toBe("frost");
    expect(strip.className).not.toContain("map-hud-anim");
  });

  it("з рухом — клас анімації є", () => {
    const { container } = hud({ effects: [effect("Холод", "cold")] });

    expect(q(container, "[data-map-hud-strip]").className).toContain("map-hud-anim");
  });

  it("FX вимкнені користувачем — без мотивів", () => {
    fx.userEnabled = false;

    const { container } = hud({ effects: [effect("Холод", "cold")] });

    expect(q(container, "[data-map-hud-strip]").dataset.hudRim).toBeUndefined();
    expect(motifs(container)).toEqual([]);
  });
});
