// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmContext } from "../confirm-context";
import { useUnsavedChangesGuard } from "../useUnsavedChangesGuard";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const confirm = vi.fn();

const wrapper = ({ children }: { children: ReactNode }) => <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>;

const link = (href: string, attrs: Record<string, string> = {}) => {
  const a = document.body.appendChild(document.createElement("a"));

  a.setAttribute("href", href);
  Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v));

  return a;
};

const click = (el: Element, init: MouseEventInit = {}) => {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });

  el.dispatchEvent(event);

  return event;
};

const flush = () => act(async () => void (await Promise.resolve()));

beforeEach(() => {
  confirm.mockReset();
  push.mockReset();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useUnsavedChangesGuard", () => {
  it("неактивний — клік проходить", () => {
    renderHook(() => useUnsavedChangesGuard(false), { wrapper });

    expect(click(link("/campaigns/x")).defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("внутрішнє посилання: підтвердження, потім router.push; відмова — лишаємось", async () => {
    renderHook(() => useUnsavedChangesGuard(true), { wrapper });
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const a = link("/campaigns/x?y=1#z");

    expect(click(a).defaultPrevented).toBe(true);
    await flush();
    expect(push).not.toHaveBeenCalled();

    click(a);
    await flush();
    expect(push).toHaveBeenCalledWith("/campaigns/x?y=1#z");
  });

  it("зовнішні, _blank, модифіковані кліки й якір на цій сторінці — без підтвердження", () => {
    renderHook(() => useUnsavedChangesGuard(true), { wrapper });

    expect(click(link("https://example.com/a")).defaultPrevented).toBe(false);
    expect(click(link("/x", { target: "_blank" })).defaultPrevented).toBe(false);
    expect(click(link("/y"), { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(click(link("#top")).defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("«Назад»: відмова повертає sentinel, згода робить ще один back", async () => {
    const pushState = vi.spyOn(window.history, "pushState");

    const back = vi.spyOn(window.history, "back").mockImplementation(() => undefined);

    renderHook(() => useUnsavedChangesGuard(true), { wrapper });
    expect(pushState).toHaveBeenCalledTimes(1);

    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    window.dispatchEvent(new PopStateEvent("popstate"));
    await flush();
    expect(pushState).toHaveBeenCalledTimes(2);
    expect(back).not.toHaveBeenCalled();

    window.dispatchEvent(new PopStateEvent("popstate"));
    await flush();
    expect(back).toHaveBeenCalledTimes(1);
  });
});
