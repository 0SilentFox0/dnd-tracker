// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterChoicesPanel } from "@/components/choices/CharacterChoicesPanel";
import { featsById, refs, scores, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";

const save = vi.fn().mockResolvedValue(true);

const clear = vi.fn();

vi.mock("@/lib/hooks/characters", () => ({
  useChoiceRefs: () => ({ ...refs, ready: true, feats: Object.values(featsById), spells }),
  useCharacterChoices: () => ({ save, isPending: false, error: null, issues: [], clear }),
}));

describe("CharacterChoicesPanel", () => {
  afterEach(() => {
    cleanup();
    save.mockClear();
    clear.mockClear();
  });

  it("saves the pruned picks through the choices route", async () => {
    render(<CharacterChoicesPanel campaignId="c1" characterId="h1" initial={{ raceChoices: { "elven-lineage": [{ id: "ghost" }] }, feats: [], classes: [] }} hero={{ race: "Elf", level: 1, scores, skills: {}, classMode: false }} />);

    expect(screen.getByText("choices.picker.notFound")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Drow/ }));
    fireEvent.click(screen.getByRole("button", { name: "choices.editor.save" }));

    await waitFor(() => expect(save).toHaveBeenCalledWith({ raceChoices: { "elven-lineage": [{ id: "drow" }] }, feats: [], classChoices: {} }));
  });

  it("drops a stale save error as soon as the picks change", () => {
    render(<CharacterChoicesPanel campaignId="c1" characterId="h1" initial={{ raceChoices: {}, feats: [], classes: [] }} hero={{ race: "Elf", level: 1, scores, skills: {}, classMode: false }} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Drow/ }));

    expect(clear).toHaveBeenCalled();
  });
});
