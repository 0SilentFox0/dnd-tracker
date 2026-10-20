// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ShowControl } from "../useShowControl";
import { useShowKeys } from "../useShowKeys";

afterEach(() => {
  document.body.innerHTML = "";
});

const press = (init: KeyboardEventInit & { key: string }, target: EventTarget = window) => {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });

  target.dispatchEvent(event);

  return event;
};

const setup = (pending = false) => {
  let finish!: (ok: boolean) => void;

  const send = vi.fn(() => new Promise<boolean>((r) => (finish = r)));

  const control: ShowControl = { send, pending };

  renderHook(() => useShowKeys(control));

  return { send, finish: (ok = true) => finish(ok) };
};

describe("useShowKeys", () => {
  it("стрілки — next/prev, preventDefault", () => {
    const { send, finish } = setup();

    expect(press({ key: "ArrowRight" }).defaultPrevented).toBe(true);
    expect(send).toHaveBeenLastCalledWith({ action: "next" });
    finish();
  });

  it("repeat ігнорується, поки команда в польоті — нові клавіші відкидаються, потім знову працюють", async () => {
    const { send, finish } = setup();

    press({ key: "ArrowRight" });
    press({ key: "ArrowRight", repeat: true });
    press({ key: "ArrowLeft" });
    expect(send).toHaveBeenCalledTimes(1);

    finish();
    await Promise.resolve();
    await Promise.resolve();

    press({ key: "ArrowLeft" });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ action: "prev" });
  });

  it("pending — клавіші не надсилаються", () => {
    const { send } = setup(true);

    press({ key: "ArrowRight" });
    expect(send).not.toHaveBeenCalled();
  });

  it("у полі вводу, у діалозі та з відкритим діалогом — ігнор", () => {
    const { send } = setup();

    const input = document.body.appendChild(document.createElement("input"));

    press({ key: "ArrowRight" }, input);
    expect(send).not.toHaveBeenCalled();

    const dialog = document.body.appendChild(document.createElement("div"));

    dialog.setAttribute("role", "dialog");
    press({ key: "ArrowRight" });
    expect(send).not.toHaveBeenCalled();
  });
});
