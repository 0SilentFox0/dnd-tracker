// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/acquaintances", () => ({ useAcquaintanceNote: () => ({ save: vi.fn(), isPending: false }) }));

import { AcquaintanceCard } from "@/components/acquaintances/AcquaintanceCard";
import type { AcquaintanceView } from "@/types/acquaintances";

const note = (over: Partial<AcquaintanceView["notes"][number]> = {}): AcquaintanceView["notes"][number] => ({ id: "n1", authorUserId: "u1", authorName: "Аня", text: "моя нотатка", updatedAt: "2026-10-28T00:00:00.000Z", own: true, ...over });

const item = (over: Partial<AcquaintanceView> = {}): AcquaintanceView => ({
  id: "a1",
  kind: "micro",
  characterId: null,
  name: "Ярема",
  avatarUrl: null,
  description: "Коваль із містечка",
  sourcePageId: "p1",
  sourceSectionId: "s1",
  hidden: false,
  entries: [{ id: "e1", pageId: "p1", sectionId: "s1", text: "Продав меч", sortOrder: 0, hidden: false }],
  notes: [note()],
  ...over,
});

const flags = (over: Partial<{ isDM: boolean; isNew: boolean; focused: boolean }> = {}) => ({ isDM: false, isNew: false, focused: false, ...over });

Object.assign(Element.prototype, { scrollIntoView: () => {} });

afterEach(cleanup);

describe("AcquaintanceCard", () => {
  it("shows a player the card, the journal and only the own note editor, without the hidden mark", () => {
    render(<AcquaintanceCard campaignId="c1" item={item()} flags={flags()} />);

    expect(screen.getByText("Ярема")).toBeTruthy();
    expect(screen.getByText("Коваль із містечка")).toBeTruthy();
    expect(screen.getByText("Продав меч")).toBeTruthy();
    expect((screen.getByLabelText("acquaintances.note.label") as HTMLTextAreaElement).value).toBe("моя нотатка");
    expect(screen.queryByText("acquaintances.card.hidden")).toBeNull();
  });

  it("marks hidden acquaintances for the DM and lists other authors' notes with names", () => {
    const others = [note({ id: "n2", authorUserId: "u2", authorName: "Борис", text: "підозрілий", own: false })];

    render(<AcquaintanceCard campaignId="c1" item={item({ hidden: true, notes: others })} flags={flags({ isDM: true })} />);

    expect(screen.getByText("acquaintances.card.hidden")).toBeTruthy();
    expect(screen.getByText("Борис")).toBeTruthy();
    expect(screen.getByText("підозрілий")).toBeTruthy();
  });

  it("shows the new pill when the acquaintance is new to the player", () => {
    render(<AcquaintanceCard campaignId="c1" item={item()} flags={flags({ isNew: true })} />);

    expect(screen.getByText("common.notifications.new")).toBeTruthy();
  });

  it("marks hidden journal entries for the DM", () => {
    render(<AcquaintanceCard campaignId="c1" item={item({ entries: [{ id: "e2", pageId: "p1", sectionId: "s9", text: "Таємний запис", sortOrder: 1, hidden: true }] })} flags={flags({ isDM: true })} />);

    expect(screen.getByText(/Таємний запис/)).toBeTruthy();
    expect(screen.getByText(/acquaintances.card.entryHidden/)).toBeTruthy();
  });
});
