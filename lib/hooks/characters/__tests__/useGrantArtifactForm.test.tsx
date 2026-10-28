// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const scroll = { id: "a1", name: "Сувій", consumable: true };

vi.mock("@/lib/hooks/characters/useStash", () => ({
  useFreeArtifacts: () => ({ data: [scroll], isLoading: false }),
  useStashAction: () => ({ mutateAsync: vi.fn(async () => undefined), isPending: false }),
}));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn() }));

import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { clampGrantQuantity, useGrantArtifactForm } from "@/lib/hooks/characters/useGrantArtifactForm";

const [MIN, MAX] = ITEM_LIMITS.grantQuantity;

describe("clampGrantQuantity", () => {
  it.each([["0", MIN], ["", 1], ["abc", 1], ["2.7", 2], ["99999", MAX]])("%s -> %s", (raw, expected) => {
    expect(clampGrantQuantity(raw)).toBe(Math.max(MIN, expected));
  });
});

describe("useGrantArtifactForm", () => {
  it("resets picked item and fields when the dialog closes", () => {
    const onOpenChange = vi.fn();

    const { result } = renderHook(() => useGrantArtifactForm({ campaignId: "c", characterId: "h", open: true, onOpenChange }));

    act(() => result.current.actions.pick(scroll as never));
    act(() => result.current.actions.setQuantity("7"));
    expect(result.current.picked?.id).toBe("a1");
    expect(result.current.fields.quantity).toBe("7");

    act(() => result.current.actions.close(false));
    expect(result.current.picked).toBeNull();
    expect(result.current.fields.quantity).toBe("1");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
