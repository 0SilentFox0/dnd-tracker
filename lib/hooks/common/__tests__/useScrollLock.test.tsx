// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useScrollLock } from "../useScrollLock";

const wheel = (target: EventTarget) => {
  const event = new WheelEvent("wheel", { bubbles: true, cancelable: true });

  target.dispatchEvent(event);

  return event.defaultPrevented;
};

describe("useScrollLock", () => {
  it("blocks wheel while active, lets allowed containers and the inactive state through", () => {
    const allowed = document.createElement("div");

    allowed.setAttribute("data-ok", "");
    document.body.appendChild(allowed);

    const { rerender, unmount } = renderHook(({ active }) => useScrollLock(active, "[data-ok]"), { initialProps: { active: true } });

    expect(wheel(document.body)).toBe(true);
    expect(wheel(allowed)).toBe(false);

    rerender({ active: false });
    expect(wheel(document.body)).toBe(false);

    unmount();
  });
});
