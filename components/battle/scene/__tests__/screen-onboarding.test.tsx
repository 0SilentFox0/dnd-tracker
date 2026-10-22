// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("@/lib/hooks/common/useMediaQuery", () => ({ useMediaQuery: () => false }));
vi.mock("@/lib/hooks/battle/useFxEnabled", () => ({ useFxEnabled: () => ({ enabled: false, userEnabled: false, motionAllowed: true, setEnabled: vi.fn() }) }));
vi.mock("@/components/onboarding/OnboardingHint", () => ({ OnboardingHint: ({ id }: { id: string }) => <div data-testid="hint">{id}</div> }));

import { BattleScreen } from "@/components/battle/scene/BattleScreen";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  disconnect() {}
  unobserve() {}
});

const hints = () => screen.queryAllByTestId("hint").map((h) => h.textContent);

describe("BattleScreen — підказка онбордингу", () => {
  afterEach(cleanup);

  it("гравець із героєм, не його хід — підказка гравця", () => {
    render(<BattleScreen />, { wrapper: fakeScene({ isMyTurn: false }).wrapper });

    expect(hints()).toEqual(["player.battle"]);
  });

  it("гравець у свій хід — без підказки над мапою", () => {
    render(<BattleScreen />, { wrapper: fakeScene({ isMyTurn: true }).wrapper });

    expect(hints()).toEqual([]);
  });

  it("ДМ в активному бою — без підказки над мапою", () => {
    render(<BattleScreen />, { wrapper: fakeScene({ isDM: true, isMyTurn: false }).wrapper });

    expect(hints()).toEqual([]);
  });

  it("ДМ на підготовці бою — підказка ДМ", () => {
    render(<BattleScreen />, { wrapper: fakeScene({ isDM: true, status: "prepared" }).wrapper });

    expect(hints()).toEqual(["dm.battle-scene"]);
  });
});
