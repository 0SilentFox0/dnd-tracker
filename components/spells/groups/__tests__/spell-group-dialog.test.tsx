// @vitest-environment happy-dom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SpellGroupDialog } from "../SpellGroupDialog";

import "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const mutateAsync = vi.fn().mockResolvedValue({});

vi.mock("@/lib/hooks/spells", () => ({
  useUpdateSpellGroup: () => ({ mutateAsync, isPending: false }),
}));

describe("SpellGroupDialog", () => {
  it("sends name, colour and icon", async () => {
    renderWithConfirm(<SpellGroupDialog campaignId="c1" group={{ id: "g1", name: "Місяць", color: null, icon: null }} onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "moon" }));
    fireEvent.change(screen.getByLabelText("Колір"), { target: { value: "#123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ groupId: "g1", name: "Місяць", color: "#123456", icon: "moon" }));
  });
});
