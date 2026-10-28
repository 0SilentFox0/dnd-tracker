// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmContext } from "@/lib/hooks/common/confirm-context";
import { useLibraryList } from "@/lib/hooks/common/useLibraryList";

const texts = { confirmDelete: "Видалити?", deleteError: "del-fail", createError: "create-fail" };

function setup(confirmResult: boolean, mutateError?: Error) {
  const confirm = vi.fn(async () => confirmResult);

  const removeMutate = vi.fn((_id: string, o: { onError?: (e: Error) => void }) => mutateError && o.onError?.(mutateError));

  const createMutate = vi.fn((_d: string, o: { onSuccess?: () => void }) => o.onSuccess?.());

  const wrapper = ({ children }: { children: ReactNode }) => <ConfirmContext.Provider value={confirm as never}>{children}</ConfirmContext.Provider>;

  const hook = renderHook(() => useLibraryList({ query: { data: [1], isLoading: false }, create: { mutate: createMutate }, remove: { mutate: removeMutate }, texts }), { wrapper });

  return { hook, confirm, removeMutate, createMutate };
}

describe("useLibraryList", () => {
  it("does not delete when confirm is declined", async () => {
    const { hook, removeMutate } = setup(false);

    await act(() => hook.result.current.remove("a"));
    expect(removeMutate).not.toHaveBeenCalled();
  });

  it("notifies with the fallback text when delete fails", async () => {
    const { hook, confirm } = setup(true, new Error(""));

    await act(() => hook.result.current.remove("a"));
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
    expect(confirm).toHaveBeenLastCalledWith(expect.objectContaining({ description: "del-fail" }));
  });

  it("closes the create dialog on success", () => {
    const { hook } = setup(true);

    act(() => hook.result.current.createDialog.setOpen(true));
    act(() => hook.result.current.create("x"));
    expect(hook.result.current.createDialog.open).toBe(false);
  });
});
