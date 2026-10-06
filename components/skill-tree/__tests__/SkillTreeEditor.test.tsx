// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SkillTreeEditor } from "@/components/skill-tree/editor";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { buildTreeJson, normalizeTree } from "@/lib/utils/skills/progression";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

const actions = { setCell: vi.fn(), addBranch: vi.fn(), createBranch: vi.fn(), removeBranch: vi.fn(), moveBranch: vi.fn(), save: vi.fn(), cancel: vi.fn() };

const raw = buildTreeJson({ id: "row", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer: ["o1"] }] });

let errors: Array<{ code: string; ref: string; label?: string }> = [];

let loading = false;

vi.mock("@/lib/hooks/skills", () => ({
  useSkillTreeEditor: () => ({
    loading,
    races: [{ id: "r", name: "Ельф" }],
    race: "Ельф",
    setRace: vi.fn(),
    raw: loading ? null : raw,
    tree: loading ? null : normalizeTree({ id: "row", skills: raw }),
    errors,
    dirty: true,
    saving: false,
    locations: new Map([["o1", [{ kind: "slot", branchId: "attack", circle: "outer", index: 0 }]]]),
    librarySkills: [{ id: "o1", name: "Кровопуск", icon: null, mainSkillId: "attack", summary: [] }, { id: "o2", name: "Шквал", icon: null, mainSkillId: "attack", summary: ["1/бій"] }, { id: "x", name: "Чужий", icon: null, mainSkillId: "defense", summary: [] }],
    availableBranches: [{ id: "defense", name: "Захист", color: "blue", icon: null }],
    actions,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  errors = [];
  loading = false;
});

describe("SkillTreeEditor", () => {
  it("клітинка → пікер скілів гілки; вже використаний недоступний; «Поставити»", () => {
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);
    fireEvent.click(screen.getByRole("button", { name: "Напад · Зовнішнє 2" }));

    const picker = screen.getByRole("dialog");

    expect(within(picker).queryByText("Чужий")).toBeNull();
    expect(within(picker).getByRole("option", { name: /Кровопуск/ }).getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(within(picker).getByRole("option", { name: /Шквал/ }));
    fireEvent.click(within(picker).getByRole("button", { name: "Поставити" }));

    expect(actions.setCell).toHaveBeenCalledWith({ kind: "slot", branchId: "attack", circle: "outer", index: 1 }, "o2");
  });

  it("«+ Додати гілку» → вибір існуючої", () => {
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);
    fireEvent.click(screen.getByRole("button", { name: "+ Додати гілку" }));
    fireEvent.click(screen.getByRole("button", { name: "Захист" }));

    expect(actions.addBranch).toHaveBeenCalledWith("defense");
  });

  it("помилки валідації блокують «Зберегти»", () => {
    errors = [{ code: "duplicateSkill", ref: "o1" }];
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);

    expect((screen.getByRole("button", { name: "Зберегти" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Цей скіл уже стоїть в іншому місці дерева/)).toBeTruthy();
  });

  it("поки дані вантажаться — стан завантаження, не «Додайте расу»", () => {
    loading = true;
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);

    expect(screen.queryByText(/Додайте расу/)).toBeNull();
    expect(screen.getByText("Завантаження…")).toBeTruthy();
  });

  it("невдале створення гілки лишає шторку відкритою; вдале — закриває", async () => {
    actions.createBranch.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);
    fireEvent.click(screen.getByRole("button", { name: "+ Додати гілку" }));

    const input = screen.getByPlaceholderText("Назва нової гілки");

    fireEvent.change(input, { target: { value: "Тінь" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    await waitFor(() => expect(actions.createBranch).toHaveBeenCalledWith({ name: "Тінь", color: "#8a6414" }));
    expect(screen.getByPlaceholderText("Назва нової гілки")).toBeTruthy();

    fireEvent.submit(screen.getByPlaceholderText("Назва нової гілки").closest("form") as HTMLFormElement);

    await waitFor(() => expect(screen.queryByPlaceholderText("Назва нової гілки")).toBeNull());
  });

  it("помилка невідомої гілки показує її назву, а не id", () => {
    errors = [{ code: "unknownBranch", ref: "cm-ghost-id", label: "Тінь" }];
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);

    expect(screen.getByText("Гілки немає серед основних навичок кампанії: Тінь")).toBeTruthy();
    expect(screen.queryByText(/cm-ghost-id/)).toBeNull();
  });
});
