// @vitest-environment happy-dom
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassLevelUpDialog } from "@/components/character-profile/ClassLevelUpDialog";
import { featsById, refs, scores, sorcerer, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";

const submit = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/hooks/classes", () => ({ useClasses: () => ({ data: [sorcerer] }) }));
vi.mock("@/lib/hooks/characters", () => ({
  useClassLevelUp: () => ({ submit, isPending: false, error: null, clearError: vi.fn() }),
  useChoiceRefs: () => ({ ...refs, ready: true, feats: Object.values(featsById), spells }),
}));

const open = (hero?: ComponentProps<typeof ClassLevelUpDialog>["character"]["hero"]) =>
  render(<ClassLevelUpDialog open onOpenChange={vi.fn()} character={{ campaignId: "c1", id: "h1", entries: [{ classId: sorcerer.id, level: 1 }], ...(hero && { hero }) }} />);

describe("ClassLevelUpDialog: level choices", () => {
  afterEach(() => {
    cleanup();
    submit.mockClear();
  });

  it("level 2 shows Metamagic; picks go with the level-up", async () => {
    open({ race: "Elf", level: 1, scores, skills: {} });

    fireEvent.click(screen.getByRole("checkbox", { name: /Quickened Spell/ }));
    fireEvent.submit(document.getElementById("class-level-up-form") as HTMLFormElement);

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ classId: sorcerer.id, choices: { metamagic: [{ id: "quickened" }] } }));
  });

  it("«Обрати пізніше» levels up without choices; no hero → no step", async () => {
    open({ race: "Elf", level: 1, scores, skills: {} });

    fireEvent.click(screen.getByRole("button", { name: "Обрати пізніше" }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ classId: sorcerer.id }));

    cleanup();
    open();

    expect(screen.queryByRole("button", { name: "Обрати пізніше" })).toBeNull();
  });
});
