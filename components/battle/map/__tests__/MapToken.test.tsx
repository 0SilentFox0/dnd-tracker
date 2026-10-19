// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/battle/useFxEnabled", () => ({ useFxEnabled: () => ({ enabled: true, userEnabled: true, motionAllowed: true, setEnabled: vi.fn() }) }));
vi.mock("@/components/battle/fx/auras/canvas/AuraCanvas", () => ({ AuraCanvas: ({ kinds, size }: { kinds: string[]; size: number }) => <span data-testid="aura" data-kinds={kinds.join(",")} data-size={size} /> }));
vi.mock("@/components/battle/fx/frames/ImpactFrame", () => ({ ImpactFrame: ({ impact }: { impact: FxImpact }) => <i data-testid="impact-frame" data-element={impact.element} /> }));

import { MapToken } from "@/components/battle/map/MapToken";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { FxImpact } from "@/lib/utils/battle/fx";
import type { ActiveEffect } from "@/types/battle";

const p = (hp: number) => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id: "gob", name: "Гоблін" }, combatStats: { ...b.combatStats, currentHp: hp, maxHp: 30 } };
};

const fire: FxImpact = { element: "fire", kind: "damage", delayMs: 400 };

const token = (hp: number, impact: FxImpact | null) => <MapToken participant={p(hp)} box={{ cx: 50, cy: 50, size: 100 }} mapSize={{ width: 1000, height: 1000 }} pxPerUnit={0.5} impact={impact} />;

afterEach(cleanup);

describe("MapToken hit fx", () => {
  it("втрата HP з ударом: рамка удару, спалах із затримкою удару, якір FX на тій самій кнопці", async () => {
    const { rerender, container } = render(token(30, null));

    expect(screen.queryByTestId("impact-frame")).toBeNull();

    rerender(token(22, fire));

    const frame = await screen.findByTestId("impact-frame");

    expect(frame.getAttribute("data-element")).toBe("fire");

    const anchor = container.querySelector('[data-fx-participant="gob"]');

    expect(anchor?.getAttribute("data-fx-anchor")).toBe("map");
    expect(anchor?.contains(frame)).toBe(true);

    const flash = container.querySelector<HTMLElement>("[data-map-token-flash]");

    expect(flash?.dataset.mapTokenFlash).toBe("damage");
    expect(flash?.className).toContain("animate-[hud-flash-red");
    expect(flash?.style.animationDelay).toBe("400ms");
  });

  it("без удару (DOT, ручна зміна HP) — лише спалах, рамки немає", () => {
    const { rerender, container } = render(token(30, null));

    rerender(token(35, null));

    expect(screen.queryByTestId("impact-frame")).toBeNull();
    expect(container.querySelector<HTMLElement>("[data-map-token-flash]")?.dataset.mapTokenFlash).toBe("heal");
  });
});

describe("MapToken status auras", () => {
  const effect = (name: string, fxElement: string, extra: Partial<ActiveEffect> = {}) =>
    ({ id: name, name, type: "debuff", duration: 2, permanent: false, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], fxElement, ...extra }) as unknown as ActiveEffect;

  it("горіння й мороз грають ауру на портреті токена, розміром з портрет, усередині якоря", async () => {
    const { container } = render(<MapToken participant={p(30)} box={{ cx: 50, cy: 50, size: 100 }} mapSize={{ width: 1000, height: 1000 }} pxPerUnit={0.8} effects={[effect("Підпал", "fire"), effect("Холод", "cold")]} />);

    const aura = await screen.findByTestId("aura");

    expect(aura.dataset.kinds?.split(",").sort()).toEqual(["burning", "frost"]);
    expect(aura.dataset.size).toBe("56");
    expect(container.querySelector('[data-fx-participant="gob"]')?.contains(aura)).toBe(true);
  });

  it("без ефектів — аури немає", () => {
    render(token(30, null));

    expect(screen.queryByTestId("aura")).toBeNull();
  });
});
