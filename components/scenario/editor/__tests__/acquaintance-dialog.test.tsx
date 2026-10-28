// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  items: [] as unknown[],
  create: { mutateAsync: vi.fn() },
  update: { mutateAsync: vi.fn() },
  remove: { mutateAsync: vi.fn() },
  addEntry: { mutateAsync: vi.fn() },
  updateEntry: { mutateAsync: vi.fn() },
  removeEntry: { mutateAsync: vi.fn() },
}));

vi.mock("@/lib/hooks/acquaintances", () => ({
  useAcquaintances: () => ({ data: { isDM: true, enabled: true, items: hooks.items } }),
  useAcquaintanceActions: () => hooks,
}));
vi.mock("@/lib/hooks/characters", () => ({ useCharacters: () => ({ data: [{ id: "ch1", name: "Король" }] }) }));
vi.mock("@/components/scenario/CharacterSelect", () => ({
  CharacterSelect: ({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) => (
    <select aria-label="Персонаж" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      <option value="ch1">Король</option>
    </select>
  ),
}));

import { acquaintanceTargetFor } from "@/components/scenario/editor/acquaintance-target";
import { AcquaintanceDialog } from "@/components/scenario/editor/AcquaintanceDialog";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { AcquaintanceView } from "@/types/acquaintances";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

const sections = [
  { id: "s1", title: "Собор" },
  { id: "s2", title: "Таверна" },
];

const view = (over: Partial<AcquaintanceView> = {}): AcquaintanceView => ({
  id: "a1",
  kind: "micro",
  characterId: null,
  name: "Ярема",
  avatarUrl: null,
  description: "Коваль",
  sourcePageId: "p1",
  sourceSectionId: "s1",
  hidden: false,
  entries: [{ id: "e1", pageId: "p1", sectionId: "s2", text: "Продав меч", sortOrder: 0, hidden: false }],
  notes: [],
  ...over,
});

const onInsert = vi.fn();

const onClose = vi.fn();

const renderCreate = (name = "Ярема") =>
  renderWithConfirm(<AcquaintanceDialog campaignId="c1" target={{ mode: "create", name, pageId: "p1", sectionId: "s1" }} sections={sections} onInsert={onInsert} onClose={onClose} />);

const renderEdit = () => renderWithConfirm(<AcquaintanceDialog campaignId="c1" target={{ mode: "edit", id: "a1", pageId: "p1", sectionId: "s1" }} sections={sections} onInsert={onInsert} onClose={onClose} />);

beforeEach(() => {
  hooks.items = [];
  hooks.create.mutateAsync.mockResolvedValue(view());
  hooks.addEntry.mutateAsync.mockResolvedValue({});
  hooks.remove.mutateAsync.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AcquaintanceDialog create", () => {
  it("prefills the selected text, creates a micro NPC with the source and inserts the chip", async () => {
    renderCreate();

    expect((screen.getByLabelText("Ім'я") as HTMLInputElement).value).toBe("Ярема");

    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    await waitFor(() => expect(onInsert).toHaveBeenCalledWith({ id: "a1", label: "Ярема" }));
    expect(hooks.create.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ kind: "micro", name: "Ярема", sourcePageId: "p1", sourceSectionId: "s1" }));
  });

  it("disables create for a full NPC until a character is picked", () => {
    renderCreate();

    fireEvent.click(screen.getByRole("button", { name: "Повний NPC" }));

    expect(screen.getByRole("button", { name: "Створити" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Персонаж"), { target: { value: "ch1" } });

    expect(screen.getByRole("button", { name: "Створити" })).toBeEnabled();
  });

  it("inserts an existing acquaintance without creating a new one", () => {
    hooks.items = [view({ id: "a7", name: "Ярема Коваль" })];

    renderCreate("Ярема");

    fireEvent.click(screen.getByRole("button", { name: /Ярема Коваль/ }));

    expect(onInsert).toHaveBeenCalledWith({ id: "a7", label: "Ярема Коваль" });
    expect(hooks.create.mutateAsync).not.toHaveBeenCalled();
  });
});

describe("AcquaintanceDialog edit", () => {
  beforeEach(() => {
    hooks.items = [view()];
  });

  it("adds a journal entry to the current section by default", async () => {
    renderEdit();

    fireEvent.change(screen.getByLabelText("Текст запису"), { target: { value: "Подякував" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати запис" }));

    await waitFor(() => expect(hooks.addEntry.mutateAsync).toHaveBeenCalledWith({ id: "a1", data: { pageId: "p1", sectionId: "s1", text: "Подякував" } }));
  });

  it("shows the journal with section titles", () => {
    renderEdit();

    expect(screen.getByText("Продав меч")).toBeTruthy();
    expect(screen.getByText(/Таверна/)).toBeTruthy();
  });

  it("deletes the acquaintance only after confirmation", async () => {
    renderEdit();

    fireEvent.click(screen.getByRole("button", { name: "Видалити знайомство" }));

    expect(await screen.findByText(/Чипи в тексті лишаться/)).toBeTruthy();
    expect(hooks.remove.mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(hooks.remove.mutateAsync).toHaveBeenCalledWith("a1"));
  });
});

describe("acquaintanceTargetFor", () => {
  const fakeEditor = (over: { isChip?: boolean; id?: string; from?: number; to?: number; text?: string }) =>
    ({
      isActive: () => !!over.isChip,
      getAttributes: () => ({ id: over.id }),
      state: { selection: { from: over.from ?? 3, to: over.to ?? 8 }, doc: { textBetween: () => over.text ?? "  Ярема " } },
    }) as never;

  it("opens create with the trimmed selection and its range", () => {
    expect(acquaintanceTargetFor(fakeEditor({}), { pageId: "p1", sectionId: "s1" })).toEqual({ target: { mode: "create", name: "Ярема", pageId: "p1", sectionId: "s1" }, range: { from: 3, to: 8 } });
  });

  it("opens edit when the cursor is on an acquaintance chip", () => {
    expect(acquaintanceTargetFor(fakeEditor({ isChip: true, id: "a9" }), { pageId: "p1", sectionId: "s1" }).target).toEqual({ mode: "edit", id: "a9", pageId: "p1", sectionId: "s1" });
  });
});
