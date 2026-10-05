// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterSpellbook } from "@/components/characters/artifacts/CharacterSpellbook";

vi.mock("@/lib/hooks/skills", () => ({ useCharacterLearnedSpellIds: (_c: string, _id: string | undefined, known: string[]) => [...known, "s-tree"] }));

vi.mock("@/components/characters/artifacts/CharacterSpellbookDialog", () => ({
  CharacterSpellbookDialog: ({ open, spells }: { open: boolean; spells: Array<{ id: string; name: string }> }) => (open ? <ul>{spells.map((s) => <li key={s.id}>{s.name}</li>)}</ul> : null),
}));

vi.mock("@/lib/hooks/spells", () => ({ useSpells: () => ({ data: [{ id: "s-known", name: "Відоме", level: 1 }, { id: "s-tree", name: "З дерева", level: 1 }] }) }));

afterEach(cleanup);

describe("CharacterSpellbook", () => {
  it("показує заклинання з дерева поряд із відомими", () => {
    render(<CharacterSpellbook campaignId="camp" characterId="ch" knownSpellIds={["s-known"]} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("З дерева")).toBeTruthy();
    expect(screen.getByText("Відоме")).toBeTruthy();
  });
});
