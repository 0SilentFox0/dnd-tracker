// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorldNotesPanel, type WorldNotesPanelProps } from "../WorldNotesPanel";

import { renderWithConfirm } from "@/components/ui/__tests__/uk-intl";
import * as api from "@/lib/api/world";
import { WORLD_NOTE_MAX } from "@/lib/constants/world";
import type { WorldMarker, WorldNote } from "@/types/world";

vi.unmock("next-intl");

vi.mock("@/lib/api/world");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const marker = { id: "k1", name: "Town" } as WorldMarker;

const note = (over: Partial<WorldNote>): WorldNote => ({
  id: "n", markerId: "k1", authorUserId: "u", authorName: "Іра", characterId: null, visibility: "public", text: "text", mine: false, createdAt: "", updatedAt: "", ...over,
});

const notes = [
  note({ id: "n1", text: "Спільна чужа", authorName: "Олег" }),
  note({ id: "n2", text: "Моя спільна", mine: true }),
  note({ id: "n3", text: "Моя таємна", visibility: "private", mine: true }),
  note({ id: "n4", text: "Інший маркер", markerId: "k2" }),
];

const heroes = [{ id: "h1", name: "Aria", avatar: null }];

const renderPanel = (over: Partial<WorldNotesPanelProps> = {}) =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient()}>
      <WorldNotesPanel campaignId="c1" mapId="m1" marker={marker} notes={notes} heroes={heroes} {...over} />
    </QueryClientProvider>,
  );

describe("WorldNotesPanel", () => {
  it("shows shared notes of the marker by default and only my private ones on the other tab", () => {
    renderPanel();

    expect(screen.getByText("Спільна чужа")).toBeTruthy();
    expect(screen.queryByText("Інший маркер")).toBeNull();
    expect(screen.queryByText("Моя таємна")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Мої" }));

    expect(screen.getByText("Моя таємна")).toBeTruthy();
    expect(screen.queryByText("Спільна чужа")).toBeNull();
  });

  it("creates a note with the tab's visibility and the hero", async () => {
    vi.mocked(api.createWorldNote).mockResolvedValue({} as never);
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Мої" }));
    fireEvent.change(screen.getByLabelText("Нова нотатка"), { target: { value: " скарб " } });
    fireEvent.click(screen.getByRole("button", { name: "Додати" }));

    await waitFor(() => expect(api.createWorldNote).toHaveBeenCalledWith("c1", { markerId: "k1", text: "скарб", visibility: "private", characterId: "h1" }));
  });

  it("blocks a note over the limit", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Нова нотатка"), { target: { value: "я".repeat(WORLD_NOTE_MAX + 1) } });

    expect((screen.getByRole("button", { name: "Додати" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("-1")).toBeTruthy();
  });

  it("lets only the author edit and the DM delete", () => {
    renderPanel();

    expect(screen.getAllByRole("button", { name: "Редагувати нотатку" })).toHaveLength(1);

    cleanup();
    renderPanel({ isDM: true });

    expect(screen.queryByRole("button", { name: "Мої" })).toBeNull();
    expect(screen.queryByLabelText("Від імені героя")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Редагувати нотатку" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Видалити нотатку" })).toHaveLength(2);
  });

  it("DM form always writes a public note without a hero", async () => {
    vi.mocked(api.createWorldNote).mockResolvedValue({} as never);
    renderPanel({ isDM: true, heroes: [...heroes, { id: "h2", name: "Bran", avatar: null }] });
    fireEvent.change(screen.getByLabelText("Нова нотатка"), { target: { value: "підказка" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати" }));

    await waitFor(() => expect(api.createWorldNote).toHaveBeenCalledWith("c1", { markerId: "k1", text: "підказка", visibility: "public" }));
  });

  it("deletes only after confirmation", async () => {
    vi.mocked(api.deleteWorldNote).mockResolvedValue({ ok: true });
    renderPanel();
    fireEvent.click(screen.getAllByRole("button", { name: "Видалити нотатку" })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(api.deleteWorldNote).toHaveBeenCalledWith("c1", "n2"));
  });

  it("notifies when the server rejects the note", async () => {
    vi.mocked(api.createWorldNote).mockRejectedValue(new Error("403"));
    renderPanel();
    fireEvent.change(screen.getByLabelText("Нова нотатка"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати" }));

    expect(await screen.findByText("Не вдалося зберегти нотатку")).toBeTruthy();
  });
});
