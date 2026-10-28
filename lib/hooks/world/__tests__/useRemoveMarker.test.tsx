// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRemoveMarker } from "../useRemoveMarker";

import type { WorldMarker } from "@/types/world";

const confirmMock = vi.fn();

vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useConfirm: () => confirmMock }));

const marker = { id: "m1", name: "Місто", childMapId: null } as WorldMarker;

const setup = (hotkey: boolean, ok = true) => {
  confirmMock.mockResolvedValue(ok);

  const mutateOk = vi.fn().mockResolvedValue(true);

  const select = vi.fn();

  renderHook(() => useRemoveMarker({ marker, editor: { marker: { remove: { mutateOk } } } as never, select, hotkey }));

  return { mutateOk, select };
};

const press = (key: string, target: EventTarget = window) => act(async () => void target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));

describe("useRemoveMarker", () => {
  it("removes the selected marker on Delete after confirm", async () => {
    const { mutateOk, select } = setup(true);

    await press("Delete");

    expect(mutateOk).toHaveBeenCalledWith("m1");
    expect(select).toHaveBeenCalledWith(null);
  });

  it("also reacts to Backspace (Mac delete key)", async () => {
    const { mutateOk } = setup(true);

    await press("Backspace");

    expect(mutateOk).toHaveBeenCalledWith("m1");
  });

  it("does nothing when confirm is declined", async () => {
    const { mutateOk } = setup(true, false);

    await press("Delete");

    expect(mutateOk).not.toHaveBeenCalled();
  });

  it("ignores the key without the hotkey flag and while typing", async () => {
    const off = setup(false);

    await press("Delete");

    expect(off.mutateOk).not.toHaveBeenCalled();

    const on = setup(true);

    const input = document.createElement("input");

    document.body.appendChild(input);
    await press("Delete", input);

    expect(on.mutateOk).not.toHaveBeenCalled();
  });
});
