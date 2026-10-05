// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, renderHook, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";

vi.mock("@/lib/api/spells", () => ({ removeAllSpellsFromGroup: vi.fn(async () => ({})), renameSpellGroup: vi.fn() }));

import { removeAllSpellsFromGroup } from "@/lib/api/spells";
import { useSpellGroupActions } from "@/lib/hooks/spells";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <ConfirmProvider>{children}</ConfirmProvider>
  </QueryClientProvider>
);

afterEach(cleanup);

describe("useSpellGroupActions.confirmRemoveAll", () => {
  it("asks with the group name and unlinks the spells on confirm", async () => {
    const { result } = renderHook(() => useSpellGroupActions({ campaignId: "c1", groupName: "Вогонь", groupId: "g1" }), { wrapper });

    let done!: Promise<boolean>;

    act(() => {
      done = result.current.handlers.confirmRemoveAll();
    });

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("Вогонь");
    fireEvent.click(within(dialog).getByRole("button", { name: "Видалити всі з групи" }));
    await expect(done).resolves.toBe(true);
    expect(removeAllSpellsFromGroup).toHaveBeenCalledWith("c1", "g1");
  });
});
