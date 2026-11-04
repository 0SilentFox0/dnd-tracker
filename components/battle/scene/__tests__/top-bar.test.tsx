// @vitest-environment happy-dom
import { type ReactNode } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const fx = vi.hoisted(() => ({ motionAllowed: true }));

vi.mock("@/lib/hooks/battle/useFxEnabled", () => ({ useFxEnabled: () => ({ enabled: fx.motionAllowed, userEnabled: true, motionAllowed: fx.motionAllowed, setEnabled: vi.fn() }) }));

import { BattleTopBar } from "@/components/battle/scene/BattleTopBar";
import { BattleSceneContext } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { usePlayerView } from "@/lib/hooks/common";
import { render } from "@/lib/i18n/test/render-uk";

vi.unmock("next-intl");

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

describe("BattleTopBar: вигляд гравця", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  const stateful = (isDM: boolean) => {
    const base = fakeScene({ isDM });

    const Inner = ({ children }: { children: ReactNode }) => {
      const flag = usePlayerView({ kind: "battle", id: "b-top" });

      const on = isDM && flag.enabled;

      const value = { ...base.value, viewer: { ...base.value.viewer, isDM: isDM && !on, readOnly: on }, playerView: { available: isDM, enabled: on, toggle: flag.toggle } };

      return <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>;
    };

    const Wrapper = ({ children }: { children: ReactNode }) => <base.wrapper><Inner>{children}</Inner></base.wrapper>;

    return Wrapper;
  };

  it("ДМ бачить перемикач, aria-pressed слідує за станом, перемикач лишається ввімкненим", () => {
    render(<BattleTopBar />, { wrapper: stateful(true) });

    const btn = () => screen.getByRole("button", { name: /Вигляд гравця|Режим гравця|гравця/i });

    expect(btn().getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("button", { name: /Наступний хід/ })).not.toBeNull();

    fireEvent.click(btn());

    expect(btn().getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: /Наступний хід/ })).toBeNull();
    expect(window.sessionStorage.getItem("player-view:b-top")).toBe("on");
  });

  it("прапорець у sessionStorage переживає повторне монтування", () => {
    window.sessionStorage.setItem("player-view:b-top", "on");

    render(<BattleTopBar />, { wrapper: stateful(true) });

    expect(screen.getByRole("button", { name: /гравця/i }).getAttribute("aria-pressed")).toBe("true");
  });

  it("гравець не бачить перемикача", () => {
    render(<BattleTopBar />, { wrapper: stateful(false) });

    expect(screen.queryByRole("button", { name: /гравця/i })).toBeNull();
  });
});
