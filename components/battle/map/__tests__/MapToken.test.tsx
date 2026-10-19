// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/battle/fx/frames/ImpactFrame", () => ({ ImpactFrame: ({ impact }: { impact: FxImpact }) => <i data-testid="impact-frame" data-element={impact.element} /> }));

import { MapToken } from "@/components/battle/map/MapToken";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { FxImpact } from "@/lib/utils/battle/fx";

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
