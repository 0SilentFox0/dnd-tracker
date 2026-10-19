// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const fx = vi.hoisted(() => ({ motionAllowed: true }));

vi.mock("@/lib/hooks/battle/useFxEnabled", () => ({ useFxEnabled: () => ({ enabled: fx.motionAllowed, userEnabled: true, motionAllowed: fx.motionAllowed, setEnabled: vi.fn() }) }));

import { BattleTopBar } from "@/components/battle/scene/BattleTopBar";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

describe("BattleTopBar: перемикач анімацій", () => {
  afterEach(cleanup);

  it("«Зменшити рух» у системі: кнопка вимкнена з підказкою", () => {
    fx.motionAllowed = false;

    render(<BattleTopBar />, { wrapper: fakeScene().wrapper });

    const toggle = screen.getByRole("button", { name: /Анімації дій/ }) as HTMLButtonElement;

    expect(toggle.disabled).toBe(true);
    expect(toggle.title).toMatch(/Зменшити рух/);
  });

  it("рух дозволено: кнопка активна без підказки", () => {
    fx.motionAllowed = true;

    render(<BattleTopBar />, { wrapper: fakeScene().wrapper });

    const toggle = screen.getByRole("button", { name: /Анімації дій/ }) as HTMLButtonElement;

    expect(toggle.disabled).toBe(false);
    expect(toggle.title).toBe("");
  });
});
