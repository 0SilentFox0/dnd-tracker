// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { Accordion } from "@/components/ui/accordion";
import type { Spell } from "@/types/spells";

const mutateAsync = vi.fn(async () => ({}));

vi.mock("@/lib/hooks/spells", () => ({ useDeleteSpellsByLevel: () => ({ mutateAsync, mutate: vi.fn(), isPending: false }) }));

import { SpellLevelAccordion } from "@/components/spells/list/SpellLevelAccordion";

afterEach(() => {
  cleanup();
  mutateAsync.mockClear();
});

const spells = [{ id: "s1", name: "Іскра", level: 3 }] as unknown as Spell[];

const renderIt = () =>
  renderWithConfirm(
    <Accordion type="multiple">
      <SpellLevelAccordion levelName="Рівень 3" level={3} spells={spells} campaignId="c1" spellGroups={[]} actions={{ onRemoveFromGroup: vi.fn(), onMoveToGroup: vi.fn() }} />
    </Accordion>,
  );

describe("SpellLevelAccordion delete level", () => {
  it("deletes after confirm", async () => {
    renderIt();
    fireEvent.click(screen.getByTitle("spells.list.deleteLevel.tooltip"));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "common.actions.delete" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(3));
  });

  it("does nothing on cancel", async () => {
    renderIt();
    fireEvent.click(screen.getByTitle("spells.list.deleteLevel.tooltip"));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "common.actions.cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
