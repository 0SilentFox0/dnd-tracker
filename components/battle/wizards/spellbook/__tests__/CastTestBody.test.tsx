// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { CastTestBody } from "../CastTestBody";

import { render } from "@/lib/i18n/test/render-uk";

vi.unmock("next-intl");

type Props = Parameters<typeof CastTestBody>[0];

const model = (over: { fortune?: boolean; state?: object } = {}) => {
  const actions = { setCastRoll: vi.fn(), setCastFortune: vi.fn() };

  const book = {
    state: { ...over.state },
    view: { cast: { cn: 6, target: 50, channelTarget: 40, channelled: 2, armourSl: 0, fortune: { available: !!over.fortune, left: 2, value: null } } },
    actions,
  } as unknown as Props["book"];

  return { book, actions };
};

describe("CastTestBody", () => {
  afterEach(cleanup);

  it("shows CN, target, channelling and armour", () => {
    render(<CastTestBody book={model().book} />);
    expect(screen.getByText("СН 6 · ціль 50 · Channelling +2 · броня −0")).toBeTruthy();
  });

  it("Auto sends the server roll", () => {
    const { book, actions } = model();

    render(<CastTestBody book={book} />);
    fireEvent.click(screen.getByRole("button", { name: "Авто-кидок" }));
    expect(actions.setCastRoll).toHaveBeenCalledWith();
  });

  it("the 30 + 0 pair sends castRoll 30", () => {
    const { book, actions } = model();

    render(<CastTestBody book={book} />);
    fireEvent.click(screen.getByRole("button", { name: "Ручний" }));
    fireEvent.click(screen.getByRole("button", { name: "30" }));
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    fireEvent.click(screen.getByRole("button", { name: "Кинути" }));
    expect(actions.setCastRoll).toHaveBeenCalledWith(30);
  });

  it("the Fortune toggle needs a Fortune point", () => {
    render(<CastTestBody book={model().book} />);
    expect(screen.queryByRole("group", { name: "Удача" })).toBeNull();
    cleanup();

    const { book, actions } = model({ fortune: true });

    render(<CastTestBody book={book} />);
    fireEvent.click(screen.getByRole("button", { name: "Перекинути" }));
    expect(actions.setCastFortune).toHaveBeenCalledWith("reroll");
  });

  it("confirms an accepted roll", () => {
    render(<CastTestBody book={model({ state: { castRoll: 42 } }).book} />);
    expect(screen.getByRole("status").textContent).toBe("Кидок прийнято: 42");
  });
});
